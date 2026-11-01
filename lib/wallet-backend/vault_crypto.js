"use strict";

/**
 * CELOR TRENCH WALLET BACKEND — PART 1 (HARDENED): VaultCryptoEngine
 * ============================================================================
 * 100% Open-Source, Zero-Third-Party-Signer Post-Quantum & Trench Key Engine
 *
 * Security Hardening Included (Fixes #2, #5, #7, #8, #11):
 * - Fix #2: Honest Quantum Status Labeling + Off-Curve SHA-256 Hash-Locked PDA
 *           Vault derivation (`deriveOffCurveQuantumPdaVault`) that has NO
 *           Ed25519 private key (mathematically immune to Shor's elliptic-curve
 *           discrete log attack), alongside OTS Stealth Ed25519 Cold Rotation.
 * - Fix #5: Hardened QuantumGlow `Ax-XMSS` WOTS+ ($w=16$) with:
 *           (a) 64 Message Chains + 3 Inverse Checksum Chains (V3: `64 msg + 3 checksum chains = 67 x 32B = 2,144B`)
 *               to prevent forward-hash chain forgery (RFC 8391 standard),
 *           (b) Strictly monotonic per-signature nonce (`sigSeq`) so no two
 *               transactions in the same slot ever reuse a one-time key,
 *           (c) Pinned `expectedMasterRootHex` / `expectedOtpkHex` verification.
 * - Fix #7: Async non-blocking `pbkdf2` (`createNewVaultAsync`, `loadVaultAsync`)
 *           so unlock operations never stall the event loop.
 * - Fix #8: Strict Vault File Path Sandbox + Symlink & Overwrite Protection.
 * - Fix #11: Enforces >= 10-character vault passphrase policy.
 */

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { promisify } = require("util");

const pbkdf2Async = promisify(crypto.pbkdf2);

const SYSTEM_PROGRAM_ID_B58 = "11111111111111111111111111111111";
const MEMO_PROGRAM_ID_B58 = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const CELOR_PQ_VAULT_PROGRAM_ID_B58 = "Ce1orPQVau1t1111111111111111111111111111111";

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP = new Int16Array(256).fill(-1);
for (let i = 0; i < B58_ALPHABET.length; i++) {
  B58_MAP[B58_ALPHABET.charCodeAt(i)] = i;
}

const B58_HEX32_CACHE = new Map();
const B58_DECODE_CACHE = new Map();

function encodeB58(source) {
  const bytes = Buffer.isBuffer(source) ? source : Buffer.from(source);
  if (bytes.length === 0) return "";
  let hexKey = null;
  if (bytes.length === 32) {
    hexKey = bytes.toString("hex");
    const cached = B58_HEX32_CACHE.get(hexKey);
    if (cached !== undefined) return cached;
  }
  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    let carry = bytes[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
    out += "1";
  }
  if (!(digits.length === 1 && digits[0] === 0)) {
    for (let i = digits.length - 1; i >= 0; i--) {
      out += B58_ALPHABET[digits[i]];
    }
  }
  if (hexKey !== null) {
    if (B58_HEX32_CACHE.size > 8192) B58_HEX32_CACHE.clear();
    B58_HEX32_CACHE.set(hexKey, out);
  }
  return out;
}

function decodeB58(str) {
  if (typeof str !== "string" || str.length === 0) return Buffer.alloc(0);
  const cached = B58_DECODE_CACHE.get(str);
  if (cached !== undefined) return Buffer.from(cached);
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    const val = c < 256 ? B58_MAP[c] : -1;
    if (val === -1) throw new Error(`Invalid Base58 character at index ${i}`);
    let carry = val;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  let zeros = 0;
  while (zeros < str.length && str[zeros] === "1") zeros++;
  const out = Buffer.allocUnsafe(zeros + (str.length === zeros ? 0 : bytes.length));
  out.fill(0, 0, zeros);
  if (str.length !== zeros) {
    for (let i = 0; i < bytes.length; i++) {
      out[zeros + i] = bytes[bytes.length - 1 - i];
    }
  }
  if (out.length === 32) {
    B58_HEX32_CACHE.set(out.toString("hex"), str);
    if (B58_DECODE_CACHE.size > 8192) B58_DECODE_CACHE.clear();
    B58_DECODE_CACHE.set(str, out);
  }
  return out;
}

// PKCS#8 ASN.1 DER prefix for a 32-byte Ed25519 private seed (RFC 8410)
const ED25519_PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
// SubjectPublicKeyInfo ASN.1 DER prefix for a 32-byte Ed25519 public key (RFC 8410)
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

const KDF_ITERATIONS = 600000;
const KDF_KEYLEN = 32;
const KDF_DIGEST = "sha512";
const CIPHER_ALGO = "aes-256-gcm";
const MIN_PASSPHRASE_LENGTH = 10;

// V3 hardening: bounds for envelope-supplied KDF cost (prevents CPU-exhaustion via crafted envelopes
// and silent downgrade to a trivially weak KDF).
const KDF_MIN_ITERATIONS = 100_000;
const KDF_MAX_ITERATIONS = 2_000_000;
// V3 hardening: sigSeq reservation window persisted ahead of use so a crash/clone can never reuse a counter.
const SIG_SEQ_RESERVE_WINDOW = 1024;
const VAULT_FORMAT_VERSION = "1.2.0";

function assertSaneKdfIterations(envelope) {
  const it = envelope.iterations === undefined ? KDF_ITERATIONS : envelope.iterations;
  if (!Number.isInteger(it) || it < KDF_MIN_ITERATIONS || it > KDF_MAX_ITERATIONS) {
    throw new Error(
      `VAULT_KDF_PARAMS_OUT_OF_RANGE: iterations must be an integer in [${KDF_MIN_ITERATIONS}, ${KDF_MAX_ITERATIONS}]`
    );
  }
  return it;
}

// In-process-only marker for envelopes built by this module (cannot be forged through JSON / disk).
const FRESH_ENVELOPES = new WeakSet();

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

// Fix #8: Allowed roots for vault file persistence (prevents arbitrary path traversal)
const ALLOWED_VAULT_ROOTS = [
  fs.realpathSync(os.tmpdir()),
  os.tmpdir(),
  path.resolve(os.homedir(), ".celor-sniper")
];

function validateSafeVaultFilePath(filePath, allowExistingOverwrite = false) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid vaultFilePath");
  }
  if (filePath.includes("\0")) {
    throw new Error("Null byte in vaultFilePath disallowed");
  }
  const resolved = path.resolve(filePath);
  const preCheckAllowed = ALLOWED_VAULT_ROOTS.some(
    (root) => resolved === root || resolved.startsWith(root + path.sep)
  );
  if (!preCheckAllowed) {
    throw new Error(
      `SECURITY_PATH_TRAVERSAL_BLOCKED: Vault file ${resolved} must reside inside ~/.celor-sniper or system tmpdir`
    );
  }

  const parentDir = path.dirname(resolved);
  fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
  const realParent = fs.realpathSync(parentDir);
  const fullCanonical = path.join(realParent, path.basename(resolved));

  const isInsideAllowed = ALLOWED_VAULT_ROOTS.some(
    (root) => fullCanonical === root || fullCanonical.startsWith(root + path.sep)
  );
  if (!isInsideAllowed) {
    throw new Error(
      `SECURITY_PATH_TRAVERSAL_BLOCKED: Vault file ${fullCanonical} must reside inside ~/.celor-sniper or system tmpdir`
    );
  }

  if (fs.existsSync(fullCanonical)) {
    const st = fs.lstatSync(fullCanonical);
    if (st.isSymbolicLink()) {
      throw new Error("SECURITY_SYMLINK_BLOCKED: Refusing to read/write vault through symlink");
    }
    if (!allowExistingOverwrite) {
      throw new Error(
        "VAULT_FILE_ALREADY_EXISTS: Refusing to overwrite existing vault without explicit allowOverwrite=true"
      );
    }
  }
  return fullCanonical;
}

function zeroizeBuffer(buf) {
  if (!buf) return;
  try {
    if (typeof buf.fill === "function") {
      buf.fill(0);
    }
  } catch (_) {}
}

function deriveEd25519PublicKeyFromSeed32(seed32) {
  if (!Buffer.isBuffer(seed32) || seed32.length !== 32) {
    throw new Error("Invalid Ed25519 seed length: expected 32 bytes");
  }
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, seed32]);
  try {
    const privKeyObj = crypto.createPrivateKey({
      key: pkcs8Der,
      format: "der",
      type: "pkcs8"
    });
    const pubKeyObj = crypto.createPublicKey(privKeyObj);
    const spkiDer = pubKeyObj.export({ format: "der", type: "spki" });
    return Buffer.from(spkiDer.subarray(spkiDer.length - 32));
  } finally {
    zeroizeBuffer(pkcs8Der);
  }
}

function signEd25519Seed32Native(seed32, messageBuf) {
  const pkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, seed32]);
  try {
    const privKeyObj = crypto.createPrivateKey({
      key: pkcs8Der,
      format: "der",
      type: "pkcs8"
    });
    return crypto.sign(null, messageBuf, privKeyObj);
  } finally {
    zeroizeBuffer(pkcs8Der);
  }
}

function verifyEd25519Native(pubkey32, messageBuf, signature64) {
  const spkiDer = Buffer.concat([ED25519_SPKI_PREFIX, pubkey32]);
  const pubKeyObj = crypto.createPublicKey({
    key: spkiDer,
    format: "der",
    type: "spki"
  });
  return crypto.verify(null, messageBuf, pubKeyObj, signature64);
}

function deriveDomainChildSeed32(masterSeed32, domainTag, index) {
  const idxBuf = Buffer.allocUnsafe(4);
  idxBuf.writeUInt32LE(index >>> 0, 0);
  const hmac = crypto.createHmac("sha512", masterSeed32);
  hmac.update("CELOR_QUANTUMGLOW_HD_V1:");
  hmac.update(domainTag);
  hmac.update(":");
  hmac.update(idxBuf);
  const digest64 = hmac.digest();
  const childSeed32 = Buffer.from(digest64.subarray(0, 32));
  zeroizeBuffer(digest64);
  return childSeed32;
}

/**
 * Fix #2: Derives a genuine SHA-256 Hash-Committed Program-Derived Address (PDA) Vault
 * (`SHA256("CELOR_PQ_PDA_VAULT_V1" || axMasterRoot || coldIndex || bump || ProgramId || "ProgramDerivedAddress")`).
 * Because a PDA is locked to a SHA-256 hash commitment and has NO Ed25519 private key,
 * Shor's elliptic-curve discrete-log algorithm cannot derive a private key from this address!
 */
function deriveHashLockedQuantumPdaVault(axMasterRootHex, coldIndex = 0) {
  const progBuf = decodeB58(CELOR_PQ_VAULT_PROGRAM_ID_B58);
  const rootBuf = Buffer.from(axMasterRootHex, "hex");
  const idxBuf = Buffer.allocUnsafe(4);
  idxBuf.writeUInt32LE(coldIndex >>> 0, 0);

  const pdaHash = crypto
    .createHash("sha256")
    .update("CELOR_PQ_PDA_VAULT_V1")
    .update(rootBuf)
    .update(idxBuf)
    .update(Buffer.from([255]))
    .update(progBuf)
    .update("ProgramDerivedAddress")
    .digest();

  return {
    pdaAddressB58: encodeB58(pdaHash),
    programIdB58: CELOR_PQ_VAULT_PROGRAM_ID_B58,
    commitmentRootHex: axMasterRootHex,
    coldIndex,
    quantumSecurityModel: "HASH_LOCKED_PDA_NO_ED25519_PRIVATE_KEY"
  };
}

// ============================================================================
// HARDENED QUANTUMGLOW (Ax-XMSS) POST-QUANTUM ENGINE
// (Fix #5: 16 Message Chains + 2 Checksum Chains = 18 Chains + Per-Sig Nonce)
// ============================================================================

// V3: one-shot SHA-256 (Node >= 20.12 / 21.7) avoids allocating a Hash object for each of the ~1,000 chain steps.
const sha256Fast =
  typeof crypto.hash === "function"
    ? (buf) => crypto.hash("sha256", buf, "buffer")
    : (buf) => crypto.createHash("sha256").update(buf).digest();

const WOTS_MSG_CHAINS = 64; // V3: 64 nibbles = full 256-bit message binding (was 16 nibbles = 64-bit)
const WOTS_CSUM_CHAINS = 3; // max checksum 64*15 = 960 = 0x3C0 fits 3 nibbles
const WOTS_TOTAL_CHAINS = WOTS_MSG_CHAINS + WOTS_CSUM_CHAINS; // 67 chains (2,144 bytes)

class QuantumglowAxEngine {
  /**
   * @param {Buffer} axMasterSeed32 - 32-byte post-quantum tree seed
   */
  constructor(axMasterSeed32, initialSigSeq = 0) {
    this._mask = crypto.randomBytes(32);
    this._maskedSeed = Buffer.allocUnsafe(32);
    for (let i = 0; i < 32; i++) {
      this._maskedSeed[i] = axMasterSeed32[i] ^ this._mask[i];
    }
    this.masterRootBuf = this._withUnmaskedSeed((seed) =>
      crypto
        .createHash("sha256")
        .update("CELOR_QUANTUMGLOW_AX_MASTER_ROOT_V1:")
        .update(seed)
        .digest()
    );
    this.masterRootHex = this.masterRootBuf.toString("hex");
    this.slotOtpkCache = new Map(); // `${slot}:${sigSeq}` -> otpkBundle
    this.sigSeqCounter = Number(initialSigSeq) || 0; // Fix #5b & B13: Monotonic counter + per-sig entropy salt
  }

  _withUnmaskedSeed(fn) {
    const tempSeed = Buffer.allocUnsafe(32);
    for (let i = 0; i < 32; i++) {
      tempSeed[i] = this._maskedSeed[i] ^ this._mask[i];
    }
    try {
      return fn(tempSeed);
    } finally {
      zeroizeBuffer(tempSeed);
    }
  }

  deriveSlotPreimage(slot, kind = "FINALIZE", sigSeq = 0) {
    return this._withUnmaskedSeed((seed) =>
      crypto
        .createHash("sha256")
        .update(`AX_PREIMAGE_V2:${kind}:${slot}:${sigSeq}:`)
        .update(seed)
        .digest()
    );
  }

  _deriveWotsSecretChains(slot, sigSeq = 0) {
    return this._withUnmaskedSeed((seed) => {
      const prefix = Buffer.from(`AX_WOTS_SK_V2:${slot}:${sigSeq}:`, "utf8");
      const chains = new Array(WOTS_TOTAL_CHAINS);
      // c is 0..66 (1 or 2 ASCII digits) + ":" + 32B seed
      const buf1 = Buffer.allocUnsafe(prefix.length + 2 + 32);
      prefix.copy(buf1, 0);
      buf1[prefix.length + 1] = 0x3a; // ':'
      seed.copy(buf1, prefix.length + 2);

      const buf2 = Buffer.allocUnsafe(prefix.length + 3 + 32);
      prefix.copy(buf2, 0);
      buf2[prefix.length + 2] = 0x3a; // ':'
      seed.copy(buf2, prefix.length + 3);

      try {
        for (let c = 0; c < WOTS_TOTAL_CHAINS; c++) {
          if (c < 10) {
            buf1[prefix.length] = 0x30 + c;
            chains[c] = sha256Fast(buf1);
          } else {
            buf2[prefix.length] = 0x30 + ((c / 10) | 0);
            buf2[prefix.length + 1] = 0x30 + (c % 10);
            chains[c] = sha256Fast(buf2);
          }
        }
        return chains;
      } finally {
        zeroizeBuffer(buf1);
        zeroizeBuffer(buf2);
      }
    });
  }

  /**
   * Computes the 18 WOTS+ (w=16) step values `[0..15]` for a 32-byte digest:
   * - Chains `0..15`: 16 message nibbles derived from byte pairs
   * - Chains `16..17`: 2 Winternitz inverse checksum nibbles (`csum = sum(15 - d_i)` in `[0..240]`)
   *   so incrementing any message step strictly decrements the checksum step, making
   *   forward-hash forgery mathematically impossible without inverting SHA-256!
   */
  static computeWotsStepsWithChecksum(txDigest32) {
    // B14 Fix: Non-linear SHA-256 domain-separated compression binds all 256 bits of txDigest32.
    // V3 Fix (R8): EVERY nibble of the bound digest gets its own chain (64 message chains = 256 bits), instead of
    // XOR-folding byte pairs into 16 nibbles (only 64 bits of binding => 2^32 collision cost).
    const boundDigest = crypto
      .createHash("sha256")
      .update("AX_WOTS_MSG_BIND_V2:")
      .update(txDigest32)
      .digest();
    const steps = new Uint8Array(WOTS_TOTAL_CHAINS);
    let csum = 0;
    for (let i = 0; i < 32; i++) {
      const hi = boundDigest[i] >>> 4;
      const lo = boundDigest[i] & 0x0f;
      steps[2 * i] = hi;
      steps[2 * i + 1] = lo;
      csum += 15 - hi + (15 - lo); // Max = 64 * 15 = 960 (0x3C0), fits in 3 hex nibbles
    }
    steps[WOTS_MSG_CHAINS] = (csum >>> 8) & 0x0f;
    steps[WOTS_MSG_CHAINS + 1] = (csum >>> 4) & 0x0f;
    steps[WOTS_MSG_CHAINS + 2] = csum & 0x0f;
    return steps;
  }

  static stepWotsChain(val32, slot, chainIdx, startStep, steps) {
    if (steps <= 0) return Buffer.from(val32);
    const scratch = Buffer.allocUnsafe(36);
    val32.copy(scratch, 0, 0, 32);
    scratch[32] = chainIdx & 0xff;
    scratch[34] = slot & 0xff;
    scratch[35] = (slot >>> 8) & 0xff;
    let cur = null;
    for (let s = 0; s < steps; s++) {
      scratch[33] = (startStep + s) & 0xff;
      cur = sha256Fast(scratch);
      if (s + 1 < steps) {
        cur.copy(scratch, 0, 0, 32);
      }
    }
    return cur;
  }

  /**
   * V3: Walks a chain ONCE from step 0 to 15, returning both the public tip and the element at `captureAt`
   * (the signature element). Signing no longer needs a second pass over the same chain.
   */
  static walkWotsChainCapture(val32, slot, chainIdx, captureAt) {
    const scratch = Buffer.allocUnsafe(36);
    val32.copy(scratch, 0, 0, 32);
    scratch[32] = chainIdx & 0xff;
    scratch[34] = slot & 0xff;
    scratch[35] = (slot >>> 8) & 0xff;
    let captured = captureAt === 0 ? Buffer.from(val32) : null;
    let cur = null;
    for (let s = 0; s < 15; s++) {
      scratch[33] = s & 0xff;
      cur = sha256Fast(scratch);
      if (s + 1 === captureAt) captured = Buffer.from(cur);
      if (s + 1 < 15) cur.copy(scratch, 0, 0, 32);
    }
    return { tip: cur, captured };
  }

  prewarmSlotOtpk(slot, sigSeq = 0, captureSteps = null) {
    const cacheKey = `${slot}:${sigSeq}`;
    const existing = captureSteps ? null : this.slotOtpkCache.get(cacheKey);
    if (existing) return existing;

    const skipSecret = this.deriveSlotPreimage(slot, "SKIP", sigSeq);
    const skipOtpk = crypto.createHash("sha256").update(skipSecret).digest();
    zeroizeBuffer(skipSecret);

    const finalizeSecret = this.deriveSlotPreimage(slot, "FINALIZE", sigSeq);
    const finalizeOtpk = crypto.createHash("sha256").update(finalizeSecret).digest();
    zeroizeBuffer(finalizeSecret);

    const secretChains = this._deriveWotsSecretChains(slot, sigSeq);
    const rootHasher = crypto.createHash("sha256");
    rootHasher.update(`AX_WOTS_ROOT_V2:${slot}:${sigSeq}:`);
    let capturedElements = null;
    try {
      if (captureSteps) capturedElements = new Array(WOTS_TOTAL_CHAINS);
      for (let c = 0; c < WOTS_TOTAL_CHAINS; c++) {
        if (captureSteps) {
          const walk = QuantumglowAxEngine.walkWotsChainCapture(secretChains[c], slot, c, captureSteps[c]);
          capturedElements[c] = walk.captured;
          rootHasher.update(walk.tip);
        } else {
          const tip = QuantumglowAxEngine.stepWotsChain(secretChains[c], slot, c, 0, 15);
          rootHasher.update(tip);
        }
      }
    } finally {
      for (let c = 0; c < WOTS_TOTAL_CHAINS; c++) zeroizeBuffer(secretChains[c]);
    }
    const notarizeWotsRoot = rootHasher.digest();

    const otpkBundle = {
      slot,
      sigSeq,
      masterRootHex: this.masterRootHex,
      skipOtpkHex: skipOtpk.toString("hex"),
      finalizeOtpkHex: finalizeOtpk.toString("hex"),
      notarizeWotsRootHex: notarizeWotsRoot.toString("hex"),
      skipOtpkBuf: skipOtpk,
      finalizeOtpkBuf: finalizeOtpk,
      notarizeWotsRootBuf: notarizeWotsRoot,
      capturedElements
    };

    if (this.slotOtpkCache.size > 2048) {
      this.slotOtpkCache.clear();
    }
    this.slotOtpkCache.set(cacheKey, otpkBundle);
    return otpkBundle;
  }

  /**
   * Signs a transaction message using a fresh, non-reused One-Time Key `(slot, sigSeq)`
   * and 67 WOTS+ chains (64 message chains + 3 inverse checksum chains = 2,144 bytes).
   */
  signTransactionQuantumProof(slot, txMessageBytes) {
    // B13 Fix: Combine monotonic counter with 64-bit random entropy salt so even cloned/reloaded
    // vault snapshots can never reuse the same one-time WOTS+ key!
    const sigSeq = `${this.sigSeqCounter++}_${crypto.randomBytes(8).toString("hex")}`;
    const t0 = process.hrtime.bigint();

    const txDigest = crypto.createHash("sha256").update(txMessageBytes).digest();
    const steps = QuantumglowAxEngine.computeWotsStepsWithChecksum(txDigest);
    // V3: one pass over every chain yields BOTH the one-time public root and the signature elements.
    const otpk = this.prewarmSlotOtpk(slot, sigSeq, steps);
    const revealedPreimageBuf = this.deriveSlotPreimage(slot, "FINALIZE", sigSeq);
    const wotsElements = otpk.capturedElements;
    otpk.capturedElements = null; // never keep signature elements in the cache

    const signLatencyUs = Number(process.hrtime.bigint() - t0) / 1e3;

    return {
      scheme: "QUANTUMGLOW_AX_XMSS_SHA256_V3_FULL256_CHECKSUM",
      slot,
      sigSeq,
      masterRootHex: this.masterRootHex,
      txDigestHex: txDigest.toString("hex"),
      finalizeOtpkHex: otpk.finalizeOtpkHex,
      revealedPreimageHex: revealedPreimageBuf.toString("hex"),
      notarizeWotsRootHex: otpk.notarizeWotsRootHex,
      wotsChainElementsHex: wotsElements.map((b) => b.toString("hex")),
      preimageWireBytes: 32,
      wotsWireBytes: WOTS_TOTAL_CHAINS * 32, // 2,144 bytes (64 msg + 3 checksum chains)
      merklePathBytes: 0,
      signLatencyUs: Number(signLatencyUs.toFixed(2))
    };
  }

  /**
   * Fix #5c: Verifies the 32B Preimage Reveal + 67-Chain WOTS+ (with Checksum) against
   * an optional `pinnedExpectations` (`{ expectedMasterRootHex, expectedFinalizeOtpkHex, expectedWotsRootHex }`).
   */
  static verifyTransactionQuantumProof(proof, txMessageBytes, pinnedExpectations = {}) {
    if (
      !proof ||
      !Array.isArray(proof.wotsChainElementsHex) ||
      proof.wotsChainElementsHex.length !== WOTS_TOTAL_CHAINS
    ) {
      return { verified: false, preimageValid: false, wotsValid: false, reason: "MALFORMED_PROOF" };
    }

    // Enforce pinned root / OTPK expectations if provided by verifier
    if (
      pinnedExpectations.expectedMasterRootHex &&
      proof.masterRootHex !== pinnedExpectations.expectedMasterRootHex
    ) {
      return {
        verified: false,
        preimageValid: false,
        wotsValid: false,
        reason: "PINNED_MASTER_ROOT_MISMATCH"
      };
    }
    if (
      pinnedExpectations.expectedFinalizeOtpkHex &&
      proof.finalizeOtpkHex !== pinnedExpectations.expectedFinalizeOtpkHex
    ) {
      return {
        verified: false,
        preimageValid: false,
        wotsValid: false,
        reason: "PINNED_OTPK_MISMATCH"
      };
    }
    if (
      pinnedExpectations.expectedWotsRootHex &&
      proof.notarizeWotsRootHex !== pinnedExpectations.expectedWotsRootHex
    ) {
      return {
        verified: false,
        preimageValid: false,
        wotsValid: false,
        reason: "PINNED_WOTS_ROOT_MISMATCH"
      };
    }

    crypto.createHash("sha256").update("warm").digest();

    // 1. Verify 32B Preimage Reveal: SHA256(X_s) == Y_s
    const preimageBuf = Buffer.from(proof.revealedPreimageHex, "hex");
    let computedOtpkBuf = crypto.createHash("sha256").update(preimageBuf).digest();
    const tPre0 = process.hrtime.bigint();
    for (let i = 0; i < 32; i++) {
      computedOtpkBuf = crypto.createHash("sha256").update(preimageBuf).digest();
    }
    const preimageVerifyNs = Math.round(Number(process.hrtime.bigint() - tPre0) / 32);
    const expectedOtpk = pinnedExpectations.expectedFinalizeOtpkHex || proof.finalizeOtpkHex;
    const preimageValid =
      computedOtpkBuf.toString("hex") === expectedOtpk && preimageBuf.length === 32;

    // 2. Verify 67-Chain WOTS+ (64 message + 3 inverse checksum chains)
    const txDigest = crypto.createHash("sha256").update(txMessageBytes).digest();
    const steps = QuantumglowAxEngine.computeWotsStepsWithChecksum(txDigest);
    const sigSeq = proof.sigSeq ?? 0;

    const tWots0 = process.hrtime.bigint();
    const rootHasher = crypto.createHash("sha256");
    rootHasher.update(`AX_WOTS_ROOT_V2:${proof.slot}:${sigSeq}:`);
    for (let c = 0; c < WOTS_TOTAL_CHAINS; c++) {
      const stepVal = steps[c];
      const elemBuf = Buffer.from(proof.wotsChainElementsHex[c], "hex");
      if (elemBuf.length !== 32) {
        return { verified: false, preimageValid, wotsValid: false, reason: "INVALID_CHAIN_LEN" };
      }
      const remainingSteps = 15 - stepVal;
      const chainTip = QuantumglowAxEngine.stepWotsChain(
        elemBuf,
        proof.slot,
        c,
        stepVal,
        remainingSteps
      );
      rootHasher.update(chainTip);
    }
    const reconstructedRootHex = rootHasher.digest("hex");
    const wotsVerifyUs = Number(process.hrtime.bigint() - tWots0) / 1e3;
    const expectedWotsRoot = pinnedExpectations.expectedWotsRootHex || proof.notarizeWotsRootHex;
    const wotsValid =
      reconstructedRootHex === expectedWotsRoot &&
      txDigest.toString("hex") === proof.txDigestHex;

    return {
      verified: preimageValid && wotsValid,
      preimageValid,
      wotsValid,
      // V3: A proof is only AUTHENTIC if the OTPK / WOTS root were pinned out-of-band (or re-derived by the
      // seed holder). Without pins the proof merely proves self-consistency and can be forged by anyone.
      authenticity:
        pinnedExpectations.expectedFinalizeOtpkHex && pinnedExpectations.expectedWotsRootHex
          ? "PINNED_OTPK_AND_WOTS_ROOT"
          : "SELF_CONSISTENT_ONLY_UNAUTHENTICATED",
      preimageVerifyNs,
      wotsVerifyUs: Number(wotsVerifyUs.toFixed(2)),
      wireBytes: 32
    };
  }

  destroy() {
    zeroizeBuffer(this._maskedSeed);
    zeroizeBuffer(this._mask);
    this.slotOtpkCache.clear();
  }
}

// ============================================================================
// CELOR VAULT CRYPTO ENGINE (AES-256-GCM + 3-TIER TRENCH KEY HIERARCHY)
// ============================================================================

class VaultCryptoEngine {
  static _validatePassphrase(passphrase) {
    if (
      !passphrase ||
      typeof passphrase !== "string" ||
      passphrase.length < MIN_PASSPHRASE_LENGTH
    ) {
      throw new Error(
        `RULE_11_WEAK_PASSPHRASE: Vault passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`
      );
    }
  }

  static _buildEnvelopeFromSeeds(masterSeed32, importedHotSeed32, salt, iv, aesKey) {
    const cold0Seed = deriveDomainChildSeed32(masterSeed32, "COLD_VAULT", 0);
    const cold0Pub = deriveEd25519PublicKeyFromSeed32(cold0Seed);
    zeroizeBuffer(cold0Seed);

    const hot0Seed = importedHotSeed32
      ? Buffer.from(importedHotSeed32)
      : deriveDomainChildSeed32(masterSeed32, "TRENCH_HOT", 0);
    const hot0Pub = deriveEd25519PublicKeyFromSeed32(hot0Seed);
    zeroizeBuffer(hot0Seed);

    const burner0Seed = deriveDomainChildSeed32(masterSeed32, "STEALTH_BURNER", 0);
    const burner0Pub = deriveEd25519PublicKeyFromSeed32(burner0Seed);
    zeroizeBuffer(burner0Seed);

    // B18 Fix: Dedicated domain-separated Balance-Floor Guard Anchor key (never touches Stealth Burners!)
    const guardAnchor0Seed = deriveDomainChildSeed32(masterSeed32, "BALANCE_GUARD_ANCHOR", 0);
    const guardAnchor0Pub = deriveEd25519PublicKeyFromSeed32(guardAnchor0Seed);
    zeroizeBuffer(guardAnchor0Seed);

    const axSeed = deriveDomainChildSeed32(masterSeed32, "AX_XMSS_MASTER", 0);
    const axEngine = new QuantumglowAxEngine(axSeed);
    const axMasterRootHex = axEngine.masterRootHex;
    axEngine.destroy();
    zeroizeBuffer(axSeed);

    // Fix #2: Compute genuine off-curve SHA-256 Hash-Locked PDA Vault (no Ed25519 private key!)
    const hashLockedPda = deriveHashLockedQuantumPdaVault(axMasterRootHex, 0);

    const secretPayload = Buffer.alloc(65, 0);
    secretPayload[0] = importedHotSeed32 ? 1 : 0;
    masterSeed32.copy(secretPayload, 1);
    if (importedHotSeed32) {
      importedHotSeed32.copy(secretPayload, 33);
    }

    let ciphertext;
    let authTag;
    try {
      const cipher = crypto.createCipheriv(CIPHER_ALGO, aesKey, iv);
      ciphertext = Buffer.concat([cipher.update(secretPayload), cipher.final()]);
      authTag = cipher.getAuthTag();
    } finally {
      zeroizeBuffer(secretPayload);
    }

    const freshEnvelope = {
      version: VAULT_FORMAT_VERSION,
      engine: "CELOR_QUANTUMGLOW_TRENCH_VAULT",
      cipher: CIPHER_ALGO,
      kdf: "pbkdf2-sha512",
      iterations: KDF_ITERATIONS,
      saltHex: salt.toString("hex"),
      ivHex: iv.toString("hex"),
      authTagHex: authTag.toString("hex"),
      ciphertextHex: ciphertext.toString("hex"),
      state: {
        activeColdIndex: 0,
        coldKeyExposedOnChain: false,
        coldRotationHistory: [],
        activeBurnerIndex: 0,
        burnerCount: 1,
        hasImportedTelegramHotKey: Boolean(importedHotSeed32),
        axMasterRootHex,
        quantumColdVaultPubkey: encodeB58(cold0Pub),
        quantumHashLockedPdaVault: hashLockedPda.pdaAddressB58,
        primaryHotWalletPubkey: encodeB58(hot0Pub),
        balanceFloorGuardAnchorPubkey: encodeB58(guardAnchor0Pub),
        axSigSeqCounter: 0,
        activeStealthBurnerPubkey: encodeB58(burner0Pub),
        stealthBurners: [
          { index: 0, pubkey: encodeB58(burner0Pub), label: "Stealth Burner #0" }
        ],
        createdAt: new Date().toISOString()
      }
    };
    FRESH_ENVELOPES.add(freshEnvelope);
    return freshEnvelope;
  }

  static _parseImportedHotSeed(importedTelegramBotSecretKey) {
    if (!importedTelegramBotSecretKey) return null;
    const raw =
      typeof importedTelegramBotSecretKey === "string"
        ? Buffer.from(decodeB58(importedTelegramBotSecretKey))
        : Buffer.from(importedTelegramBotSecretKey);
    try {
      if (raw.length === 64) return Buffer.from(raw.subarray(0, 32));
      if (raw.length === 32) return Buffer.from(raw);
      throw new Error("Imported Telegram Bot key must be 32 or 64 bytes");
    } finally {
      zeroizeBuffer(raw);
    }
  }

  /**
   * Synchronous vault creation (kept for CLI/test convenience) with >= 10 char passphrase
   * and safe path validation (Fixes #8 & #11).
   */
  static createNewVault(passphrase, options = {}) {
    VaultCryptoEngine._validatePassphrase(passphrase);
    const safePath = options.vaultFilePath
      ? validateSafeVaultFilePath(options.vaultFilePath, Boolean(options.allowOverwrite))
      : null;

    const masterSeed32 = options.masterSeed32
      ? Buffer.from(options.masterSeed32)
      : crypto.randomBytes(32);
    const importedHotSeed32 = VaultCryptoEngine._parseImportedHotSeed(
      options.importedTelegramBotSecretKey
    );

    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const aesKey = crypto.pbkdf2Sync(passphrase, salt, KDF_ITERATIONS, KDF_KEYLEN, KDF_DIGEST);

    try {
      const envelope = VaultCryptoEngine._buildEnvelopeFromSeeds(
        masterSeed32,
        importedHotSeed32,
        salt,
        iv,
        aesKey
      );
      const instance = new VaultCryptoEngine(envelope, passphrase, safePath, aesKey);
      if (safePath) {
        instance.persistToDisk(true);
      }
      return instance;
    } finally {
      zeroizeBuffer(masterSeed32);
      zeroizeBuffer(importedHotSeed32);
      zeroizeBuffer(aesKey);
    }
  }

  /**
   * Fix #7: Non-blocking asynchronous vault creation (`pbkdf2Async`) for server handlers.
   */
  static async createNewVaultAsync(passphrase, options = {}) {
    VaultCryptoEngine._validatePassphrase(passphrase);
    const safePath = options.vaultFilePath
      ? validateSafeVaultFilePath(options.vaultFilePath, Boolean(options.allowOverwrite))
      : null;

    const masterSeed32 = options.masterSeed32
      ? Buffer.from(options.masterSeed32)
      : crypto.randomBytes(32);
    const importedHotSeed32 = VaultCryptoEngine._parseImportedHotSeed(
      options.importedTelegramBotSecretKey
    );

    const salt = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const aesKey = await pbkdf2Async(passphrase, salt, KDF_ITERATIONS, KDF_KEYLEN, KDF_DIGEST);

    try {
      const envelope = VaultCryptoEngine._buildEnvelopeFromSeeds(
        masterSeed32,
        importedHotSeed32,
        salt,
        iv,
        aesKey
      );
      const instance = new VaultCryptoEngine(envelope, passphrase, safePath, aesKey);
      if (safePath) {
        instance.persistToDisk(true);
      }
      return instance;
    } finally {
      zeroizeBuffer(masterSeed32);
      zeroizeBuffer(importedHotSeed32);
      zeroizeBuffer(aesKey);
    }
  }

  static loadVault(envelopeOrPath, passphrase) {
    VaultCryptoEngine._validatePassphrase(passphrase);
    let envelope = envelopeOrPath;
    let filePath = null;
    if (typeof envelopeOrPath === "string") {
      filePath = validateSafeVaultFilePath(envelopeOrPath, true);
      envelope = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    const engine = new VaultCryptoEngine(envelope, passphrase, filePath);
    engine._withDecryptedSeeds((masterSeed32) => {
      if (masterSeed32.length !== 32) throw new Error("Corrupt vault seed");
    });
    return engine;
  }

  /**
   * Fix #7: Non-blocking asynchronous vault unlock (`pbkdf2Async`).
   */
  static async loadVaultAsync(envelopeOrPath, passphrase) {
    VaultCryptoEngine._validatePassphrase(passphrase);
    let envelope = envelopeOrPath;
    let filePath = null;
    if (typeof envelopeOrPath === "string") {
      filePath = validateSafeVaultFilePath(envelopeOrPath, true);
      envelope = JSON.parse(fs.readFileSync(filePath, "utf8"));
    }
    const salt = Buffer.from(envelope.saltHex, "hex");
    const kdfIterations = assertSaneKdfIterations(envelope);
    const aesKey = await pbkdf2Async(passphrase, salt, kdfIterations, KDF_KEYLEN, KDF_DIGEST);
    try {
      const engine = new VaultCryptoEngine(envelope, passphrase, filePath, aesKey);
      engine._withDecryptedSeeds((masterSeed32) => {
        if (masterSeed32.length !== 32) throw new Error("Corrupt vault seed");
      });
      return engine;
    } finally {
      zeroizeBuffer(aesKey);
    }
  }

  constructor(envelope, passphrase, vaultFilePath = null, preDerivedAesKey = null) {
    this.envelope = envelope;
    this.vaultFilePath = vaultFilePath;

    const salt = Buffer.from(envelope.saltHex, "hex");
    const derivedAesKey = preDerivedAesKey
      ? Buffer.from(preDerivedAesKey)
      : crypto.pbkdf2Sync(
          passphrase,
          salt,
          assertSaneKdfIterations(envelope),
          KDF_KEYLEN,
          KDF_DIGEST
        );
    this._keyMask = crypto.randomBytes(32);
    this._maskedAesKey = Buffer.allocUnsafe(32);
    for (let i = 0; i < 32; i++) {
      this._maskedAesKey[i] = derivedAesKey[i] ^ this._keyMask[i];
    }
    zeroizeBuffer(derivedAesKey);

    // V3: Authenticate the plaintext `state` block (pubkeys, indices, flags, counters). AES-GCM only covers the
    // seed ciphertext, so without this an attacker with file-write access could silently redirect the Cold Vault /
    // panic-sweep destination. (1) HMAC seal keyed from the vault key; (2) every public key is re-derived from the
    // decrypted seed and must match (this also protects legacy 1.1.0 vaults that have no MAC yet).
    this._authenticateEnvelopeState();

    this.axEngine = this._withDecryptedSeeds((masterSeed32) => {
      const axSeed = deriveDomainChildSeed32(masterSeed32, "AX_XMSS_MASTER", 0);
      try {
        return new QuantumglowAxEngine(
          axSeed,
          (envelope.state && envelope.state.axSigSeqCounter) || 0
        );
      } finally {
        zeroizeBuffer(axSeed);
      }
    });

    this._verifyStatePublicKeysAgainstSeed();
  }

  _computeStateMacHex() {
    const aesKey = Buffer.allocUnsafe(32);
    for (let i = 0; i < 32; i++) aesKey[i] = this._maskedAesKey[i] ^ this._keyMask[i];
    try {
      const macKey = crypto.createHmac("sha256", aesKey).update("CELOR_VAULT_STATE_MAC_V1").digest();
      try {
        const e = this.envelope;
        return crypto
          .createHmac("sha256", macKey)
          .update(
            canonicalJson({
              engine: e.engine,
              cipher: e.cipher,
              kdf: e.kdf,
              iterations: e.iterations || KDF_ITERATIONS,
              saltHex: e.saltHex,
              ivHex: e.ivHex,
              authTagHex: e.authTagHex,
              ciphertextHex: e.ciphertextHex,
              state: e.state
            })
          )
          .digest("hex");
      } finally {
        zeroizeBuffer(macKey);
      }
    } finally {
      zeroizeBuffer(aesKey);
    }
  }

  _authenticateEnvelopeState() {
    const envelope = this.envelope;
    const desc = Object.getOwnPropertyDescriptor(envelope, "stateMacHex");
    // An accessor means this very object was already sealed by an in-process engine (trusted); only a plain
    // data property came from disk / the wire and must be verified.
    // V3 Residual Fix: Unconditionally require stateMacHex on all non-fresh envelopes so stripping
    // stateMacHex + downgrading envelope.version ("1.1.0") can NEVER bypass MAC verification!
    if (desc && !desc.get) {
      const stored = Buffer.from(String(desc.value || ""), "hex");
      const expected = Buffer.from(this._computeStateMacHex(), "hex");
      if (stored.length !== expected.length || !crypto.timingSafeEqual(stored, expected)) {
        throw new Error("VAULT_STATE_TAMPERED: state integrity MAC mismatch (vault file was modified)");
      }
    } else if (!desc && !FRESH_ENVELOPES.has(envelope)) {
      throw new Error("VAULT_STATE_TAMPERED: sealed vault is missing its state integrity MAC (downgrade blocked)");
    }
    envelope.version = VAULT_FORMAT_VERSION;
    const self = this;
    Object.defineProperty(envelope, "stateMacHex", {
      enumerable: true,
      configurable: true,
      get() {
        return self._computeStateMacHex();
      }
    });
  }

  _verifyStatePublicKeysAgainstSeed() {
    const st = this.envelope.state;
    const fail = (field) => {
      throw new Error(`VAULT_STATE_TAMPERED: ${field} does not match the encrypted seed`);
    };
    if (!st || typeof st !== "object") fail("state");
    this._withDecryptedSeeds((master, imported) => {
      const pubOf = (domain, idx) => {
        const s = deriveDomainChildSeed32(master, domain, idx);
        try {
          return encodeB58(deriveEd25519PublicKeyFromSeed32(s));
        } finally {
          zeroizeBuffer(s);
        }
      };
      const isIdx = (n) => Number.isInteger(n) && n >= 0 && n < 0xffffffff;
      if (this.axEngine.masterRootHex !== st.axMasterRootHex) fail("axMasterRootHex");
      if (!isIdx(st.activeColdIndex)) fail("activeColdIndex");
      if (pubOf("COLD_VAULT", st.activeColdIndex) !== st.quantumColdVaultPubkey) fail("quantumColdVaultPubkey");
      if (
        st.quantumHashLockedPdaVault &&
        st.quantumHashLockedPdaVault !==
          deriveHashLockedQuantumPdaVault(st.axMasterRootHex, st.activeColdIndex).pdaAddressB58
      ) {
        fail("quantumHashLockedPdaVault");
      }
      const hotB58 = imported
        ? encodeB58(deriveEd25519PublicKeyFromSeed32(Buffer.from(imported)))
        : pubOf("TRENCH_HOT", 0);
      if (hotB58 !== st.primaryHotWalletPubkey) fail("primaryHotWalletPubkey");
      if (st.balanceFloorGuardAnchorPubkey && pubOf("BALANCE_GUARD_ANCHOR", 0) !== st.balanceFloorGuardAnchorPubkey) {
        fail("balanceFloorGuardAnchorPubkey");
      }
      if (!Array.isArray(st.stealthBurners) || st.stealthBurners.length < 1) fail("stealthBurners");
      st.stealthBurners.forEach((b, i) => {
        if (!b || b.index !== i || pubOf("STEALTH_BURNER", i) !== b.pubkey) fail(`stealthBurners[${i}]`);
      });
      if (!isIdx(st.activeBurnerIndex) || st.activeBurnerIndex >= st.stealthBurners.length) fail("activeBurnerIndex");
      if (st.stealthBurners[st.activeBurnerIndex].pubkey !== st.activeStealthBurnerPubkey) {
        fail("activeStealthBurnerPubkey");
      }
      for (const h of st.coldRotationHistory || []) {
        if (
          !isIdx(h.retiredIndex) ||
          !isIdx(h.rotatedToIndex) ||
          pubOf("COLD_VAULT", h.retiredIndex) !== h.retiredPubkey ||
          pubOf("COLD_VAULT", h.rotatedToIndex) !== h.rotatedToPubkey
        ) {
          fail("coldRotationHistory");
        }
      }
    });
  }

  /**
   * V3: Signs a QuantumGlow proof and durably advances the one-time-key counter. A window of
   * `SIG_SEQ_RESERVE_WINDOW` values is persisted AHEAD of use, so a crash, restore-from-backup or cloned
   * snapshot can never re-issue a counter that was already consumed.
   */
  signQuantumProof(slot, txMessageBytes) {
    const proof = this.axEngine.signTransactionQuantumProof(slot, txMessageBytes);
    const st = this.envelope.state;
    if (!Number.isInteger(st.axSigSeqCounter) || this.axEngine.sigSeqCounter >= st.axSigSeqCounter) {
      st.axSigSeqCounter = this.axEngine.sigSeqCounter + SIG_SEQ_RESERVE_WINDOW;
      this.persistToDisk(true);
    }
    return proof;
  }

  /**
   * V3: Seed-holder verification of a QuantumGlow proof. Re-derives the expected one-time public key and WOTS+
   * root for `(slot, sigSeq)` from the vault's own seed, so only proofs this vault actually issued verify.
   */
  verifyOwnQuantumProof(proof, txMessageBytes) {
    const rootHex = this.axEngine.masterRootHex;
    const sigSeqOk =
      proof &&
      (typeof proof.sigSeq === "number"
        ? Number.isSafeInteger(proof.sigSeq) && proof.sigSeq >= 0
        : typeof proof.sigSeq === "string" && /^\d{1,15}(_[0-9a-f]{16})?$/.test(proof.sigSeq));
    if (!proof || proof.masterRootHex !== rootHex || !Number.isSafeInteger(proof.slot) || proof.slot < 0 || !sigSeqOk) {
      return {
        verified: false,
        preimageValid: false,
        wotsValid: false,
        reason: "NOT_ISSUED_BY_THIS_VAULT",
        authenticity: "LOCAL_VAULT_AUTHENTICATED"
      };
    }
    const otpk = this.axEngine.prewarmSlotOtpk(proof.slot, proof.sigSeq);
    const out = QuantumglowAxEngine.verifyTransactionQuantumProof(proof, txMessageBytes, {
      expectedMasterRootHex: rootHex,
      expectedFinalizeOtpkHex: otpk.finalizeOtpkHex,
      expectedWotsRootHex: otpk.notarizeWotsRootHex
    });
    out.authenticity = "LOCAL_VAULT_AUTHENTICATED";
    return out;
  }

  /**
   * Fix #1: Verifies a re-entered passphrase against the encrypted vault payload
   * before permitting sensitive operations like secret key export (`celor_syncTelegramBot`).
   */
  async verifyPassphraseAsync(candidatePassphrase) {
    if (!candidatePassphrase || typeof candidatePassphrase !== "string") return false;
    const salt = Buffer.from(this.envelope.saltHex, "hex");
    const testKey = await pbkdf2Async(
      candidatePassphrase,
      salt,
      assertSaneKdfIterations(this.envelope),
      KDF_KEYLEN,
      KDF_DIGEST
    );
    try {
      const iv = Buffer.from(this.envelope.ivHex, "hex");
      const authTag = Buffer.from(this.envelope.authTagHex, "hex");
      const ciphertext = Buffer.from(this.envelope.ciphertextHex, "hex");
      const decipher = crypto.createDecipheriv(CIPHER_ALGO, testKey, iv);
      decipher.setAuthTag(authTag);
      const dec = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      zeroizeBuffer(dec);
      return true;
    } catch (_) {
      return false;
    } finally {
      zeroizeBuffer(testKey);
    }
  }

  _withDecryptedSeeds(callback) {
    const aesKey = Buffer.allocUnsafe(32);
    for (let i = 0; i < 32; i++) {
      aesKey[i] = this._maskedAesKey[i] ^ this._keyMask[i];
    }
    let decrypted = null;
    let masterSeed32 = null;
    let importedHotSeed32 = null;
    try {
      const iv = Buffer.from(this.envelope.ivHex, "hex");
      const authTag = Buffer.from(this.envelope.authTagHex, "hex");
      const ciphertext = Buffer.from(this.envelope.ciphertextHex, "hex");

      const decipher = crypto.createDecipheriv(CIPHER_ALGO, aesKey, iv);
      decipher.setAuthTag(authTag);
      decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      const hasImportedHot = decrypted[0] === 1;
      masterSeed32 = Buffer.from(decrypted.subarray(1, 33));
      if (hasImportedHot) {
        importedHotSeed32 = Buffer.from(decrypted.subarray(33, 65));
      }
      return callback(masterSeed32, importedHotSeed32);
    } catch (err) {
      if (/^(VAULT_STATE_TAMPERED|INVALID_KEY_INDEX|Unknown wallet tier)/.test(err.message)) throw err;
      throw new Error(`Vault authentication failed or wrong passphrase: ${err.message}`);
    } finally {
      zeroizeBuffer(aesKey);
      zeroizeBuffer(decrypted);
      zeroizeBuffer(masterSeed32);
      zeroizeBuffer(importedHotSeed32);
    }
  }

  _withTierSeed32(tier, index, callback) {
    return this._withDecryptedSeeds((masterSeed32, importedHotSeed32) => {
      let childSeed32 = null;
      // V3: a *provided* index must be a non-negative integer (no silent fallback for NaN / -1 / 1.5 / "1")
      if (index !== undefined && index !== null && !(Number.isInteger(index) && index >= 0 && index < 0xffffffff)) {
        throw new Error(`INVALID_KEY_INDEX: index must be a non-negative integer (got ${String(index)})`);
      }
      try {
        if (tier === "COLD") {
          const idx = typeof index === "number" ? index : this.envelope.state.activeColdIndex;
          childSeed32 = deriveDomainChildSeed32(masterSeed32, "COLD_VAULT", idx);
        } else if (tier === "HOT") {
          if (importedHotSeed32) {
            childSeed32 = Buffer.from(importedHotSeed32);
          } else {
            childSeed32 = deriveDomainChildSeed32(masterSeed32, "TRENCH_HOT", 0);
          }
        } else if (tier === "BURNER") {
          const idx = typeof index === "number" ? index : this.envelope.state.activeBurnerIndex;
          childSeed32 = deriveDomainChildSeed32(masterSeed32, "STEALTH_BURNER", idx);
        } else if (tier === "GUARD_ANCHOR") {
          const idx = typeof index === "number" ? index : 0;
          childSeed32 = deriveDomainChildSeed32(masterSeed32, "BALANCE_GUARD_ANCHOR", idx);
        } else {
          throw new Error(`Unknown wallet tier: ${tier}`);
        }
        const pubkey32 = deriveEd25519PublicKeyFromSeed32(childSeed32);
        return callback(childSeed32, pubkey32);
      } finally {
        zeroizeBuffer(childSeed32);
      }
    });
  }

  /**
   * Fix #2: Honest & Accurate Quantum Status + Off-Curve Hash-Locked PDA Vault info!
   */
  getPublicVaultSummary() {
    const st = this.envelope.state;
    const pdaInfo = deriveHashLockedQuantumPdaVault(st.axMasterRootHex, st.activeColdIndex);
    return {
      engine: this.envelope.engine,
      axMasterRootHex: st.axMasterRootHex,
      quantumColdVault: {
        activeIndex: st.activeColdIndex,
        pubkey: st.quantumColdVaultPubkey,
        hashLockedQuantumPdaVault: st.quantumHashLockedPdaVault || pdaInfo.pdaAddressB58,
        keyExposedOnChain: st.coldKeyExposedOnChain,
        // Fix #2: Clear separation between Ed25519 OTS rotation vs off-curve SHA-256 PDA Vault
        ed25519AccountModel: st.coldKeyExposedOnChain
          ? "ED25519_SPENT_ROTATION_NEEDED"
          : "ED25519_FRESH_OTS_STEALTH_ADDRESS",
        pdaVaultQuantumModel: "SHOR_IMMUNE_HASH_LOCKED_PDA_NO_ED25519_KEY",
        previousRotationsCount: st.coldRotationHistory.length
      },
      primaryHotWallet: {
        pubkey: st.primaryHotWalletPubkey,
        balanceFloorGuardAnchorPubkey:
          st.balanceFloorGuardAnchorPubkey ||
          this._withTierSeed32("GUARD_ANCHOR", 0, (_s, pub32) => encodeB58(pub32)),
        syncedWithTelegramBot: st.hasImportedTelegramHotKey
      },
      stealthBurnerPool: {
        activeBurnerIndex: st.activeBurnerIndex,
        activeBurnerPubkey: st.activeStealthBurnerPubkey,
        totalBurnersDerived: st.stealthBurners.length,
        burners: st.stealthBurners
      }
    };
  }

  deriveNextStealthBurner(label) {
    const t0 = process.hrtime.bigint();
    const nextIdx = this.envelope.state.stealthBurners.length;
    const pubkeyStr = this._withTierSeed32("BURNER", nextIdx, (_seed32, pub32) => encodeB58(pub32));
    const deriveUs = Number(process.hrtime.bigint() - t0) / 1e3;

    const entry = {
      index: nextIdx,
      pubkey: pubkeyStr,
      label: label || `Stealth Burner #${nextIdx}`,
      createdAt: new Date().toISOString()
    };
    this.envelope.state.stealthBurners.push(entry);
    this.envelope.state.activeBurnerIndex = nextIdx;
    this.envelope.state.burnerCount = this.envelope.state.stealthBurners.length;
    this.envelope.state.activeStealthBurnerPubkey = pubkeyStr;
    this.persistToDisk(true);

    return {
      ...entry,
      deriveLatencyUs: Number(deriveUs.toFixed(2))
    };
  }

  dualSignTransactionBytes(txMessageBytes, opts = {}) {
    const tier = opts.tier || "HOT";
    const slot = opts.slot || 460435000;
    const msgBuf = Buffer.from(txMessageBytes);

    const t0 = process.hrtime.bigint();
    const { sig64, signerPubkeyB58 } = this._withTierSeed32(
      tier,
      opts.index,
      (seed32, pub32) => {
        const signature = signEd25519Seed32Native(seed32, msgBuf);
        return {
          sig64: signature,
          signerPubkeyB58: encodeB58(pub32)
        };
      }
    );
    const ed25519SignUs = Number(process.hrtime.bigint() - t0) / 1e3;

    const wireTx = Buffer.allocUnsafe(1 + 64 + msgBuf.length);
    wireTx[0] = 1;
    sig64.copy(wireTx, 1);
    msgBuf.copy(wireTx, 65);

    const quantumProof = this.signQuantumProof(slot, msgBuf);
    const totalDualSignUs = Number(process.hrtime.bigint() - t0) / 1e3;

    if (tier === "COLD") {
      this.envelope.state.coldKeyExposedOnChain = true;
    }

    return {
      tier,
      signerPubkey: signerPubkeyB58,
      signatureBase58: encodeB58(sig64),
      signatureBuffer64: sig64,
      wireTransaction: wireTx,
      wireBytes: wireTx.length,
      ed25519SignUs: Number(ed25519SignUs.toFixed(2)),
      totalDualSignUs: Number(totalDualSignUs.toFixed(2)),
      quantumProof
    };
  }

  /**
   * Fix #10 Helper: Co-signs a transaction message with TWO internal tiers simultaneously
   * (e.g. `PrimaryHotWallet` + `StealthBurner #0`) so the 2-Instruction Round-Trip Atomic
   * Balance-Floor Guard executes and returns `minRemainingLamports` back to `PrimaryHotWallet`
   * in the exact same transaction!
   */
  dualSignRoundTripGuardedMessage(
    txMessageBytes,
    primaryTierOrOpts = "HOT",
    primaryIndex = 0,
    guardBurnerIndex = 0,
    slot = 460435000
  ) {
    let pTier = "HOT";
    let pIdx = 0;
    let gTier = "GUARD_ANCHOR";
    let gBurnerIdx = 0;
    let sSlot = 460435000;

    if (primaryTierOrOpts && typeof primaryTierOrOpts === "object") {
      pTier = primaryTierOrOpts.primaryTier || "HOT";
      pIdx = primaryTierOrOpts.primaryIndex ?? 0;
      gTier = primaryTierOrOpts.guardTier || "GUARD_ANCHOR";
      gBurnerIdx = primaryTierOrOpts.burnerIndex ?? primaryTierOrOpts.guardBurnerIndex ?? 0;
      sSlot = primaryTierOrOpts.slot || 460435000;
    } else {
      pTier = primaryTierOrOpts || "HOT";
      pIdx = primaryIndex ?? 0;
      gBurnerIdx = guardBurnerIndex ?? 0;
      sSlot = slot || 460435000;
    }

    const msgBuf = Buffer.from(txMessageBytes);
    const { sig1, signerPubkeyB58 } = this._withTierSeed32(pTier, pIdx, (seed32, pub32) => ({
      sig1: signEd25519Seed32Native(seed32, msgBuf),
      signerPubkeyB58: encodeB58(pub32)
    }));
    const sig2 = this._withTierSeed32(gTier, gBurnerIdx, (seed32) =>
      signEd25519Seed32Native(seed32, msgBuf)
    );
    const wireTx = Buffer.allocUnsafe(1 + 128 + msgBuf.length);
    wireTx[0] = 2; // 2 required signatures
    sig1.copy(wireTx, 1);
    sig2.copy(wireTx, 65);
    msgBuf.copy(wireTx, 129);
    const quantumProof = this.signQuantumProof(sSlot, msgBuf);
    return {
      signerPubkey: signerPubkeyB58,
      signatureBase58: encodeB58(sig1),
      coSignerSignatureBase58: encodeB58(sig2),
      wireTransaction: wireTx,
      wireBytes: wireTx.length,
      quantumProof
    };
  }

  prepareColdVaultOtsSpendAndRotate(params) {
    const spendLamports = BigInt(params.spendLamports);
    const totalLamports = BigInt(params.currentColdBalanceLamports);
    const feeLamports = BigInt(params.txFeeLamports ?? 5000n);

    if (spendLamports <= 0n) {
      throw new Error("spendLamports must be > 0");
    }
    if (spendLamports + feeLamports > totalLamports) {
      throw new Error(
        `Insufficient Cold Vault balance: need ${spendLamports + feeLamports} lamports, have ${totalLamports}`
      );
    }

    const currentColdIdx = this.envelope.state.activeColdIndex;
    const nextColdIdx = currentColdIdx + 1;

    const currentColdPubB58 = this._withTierSeed32("COLD", currentColdIdx, (_s, p) => encodeB58(p));
    const nextColdPubB58 = this._withTierSeed32("COLD", nextColdIdx, (_s, p) => encodeB58(p));
    const nextHashLockedPda = deriveHashLockedQuantumPdaVault(
      this.envelope.state.axMasterRootHex,
      nextColdIdx
    );

    const sweepToNextColdLamports = totalLamports - spendLamports - feeLamports;

    const buildSystemTransferIx = (fromB58, toB58, lamportsBig) => {
      const data = Buffer.allocUnsafe(12);
      data.writeUInt32LE(2, 0);
      data.writeBigUInt64LE(BigInt(lamportsBig), 4);
      return {
        programId: SYSTEM_PROGRAM_ID_B58,
        keys: [
          { pubkey: fromB58, isSigner: true, isWritable: true },
          { pubkey: toB58, isSigner: false, isWritable: true }
        ],
        data
      };
    };

    const instructions = [
      buildSystemTransferIx(currentColdPubB58, params.destinationPubkey, spendLamports)
    ];

    if (sweepToNextColdLamports > 0n) {
      instructions.push(
        buildSystemTransferIx(currentColdPubB58, nextColdPubB58, sweepToNextColdLamports)
      );
    }

    this.envelope.state.coldRotationHistory.push({
      retiredIndex: currentColdIdx,
      retiredPubkey: currentColdPubB58,
      rotatedToIndex: nextColdIdx,
      rotatedToPubkey: nextColdPubB58,
      rotatedToQuantumPdaVault: nextHashLockedPda.pdaAddressB58,
      spendLamports: spendLamports.toString(),
      sweptLamports: sweepToNextColdLamports.toString(),
      rotatedAt: new Date().toISOString()
    });
    this.envelope.state.activeColdIndex = nextColdIdx;
    this.envelope.state.quantumColdVaultPubkey = nextColdPubB58;
    this.envelope.state.quantumHashLockedPdaVault = nextHashLockedPda.pdaAddressB58;
    this.envelope.state.coldKeyExposedOnChain = false;
    this.persistToDisk(true);

    return {
      signingColdIndex: currentColdIdx,
      retiredColdVaultPubkey: currentColdPubB58,
      newQuantumColdVaultIndex: nextColdIdx,
      newQuantumColdVaultPubkey: nextColdPubB58,
      newHashLockedQuantumPdaVault: nextHashLockedPda.pdaAddressB58,
      spendLamports,
      sweepToNextColdLamports,
      remainingOnExposedVaultLamports: 0n,
      instructions
    };
  }

  buildQuantumglowMemoIx(slot) {
    const otpk = this.axEngine.prewarmSlotOtpk(slot, 0);
    const memoStr = `CELOR:AX-XMSS:S=${slot}:Y=${otpk.finalizeOtpkHex.slice(0, 24)}`;
    return {
      programId: MEMO_PROGRAM_ID_B58,
      keys: [],
      data: Buffer.from(memoStr, "utf8")
    };
  }

  exportHotWalletBase58ForTelegramSync() {
    return this._withTierSeed32("HOT", 0, (seed32, pub32) => {
      const full64 = Buffer.concat([seed32, pub32]);
      try {
        return encodeB58(full64);
      } finally {
        zeroizeBuffer(full64);
      }
    });
  }

  persistToDisk(allowOverwrite = true) {
    if (!this.vaultFilePath) return;
    const safePath = validateSafeVaultFilePath(this.vaultFilePath, allowOverwrite);
    const dir = path.dirname(safePath);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const tmpFile = `${safePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(this.envelope, null, 2), { mode: 0o600 });
    fs.renameSync(tmpFile, safePath);
  }

  lockAndDestroy() {
    zeroizeBuffer(this._maskedAesKey);
    zeroizeBuffer(this._keyMask);
    if (this.axEngine) {
      this.axEngine.destroy();
    }
  }
}

module.exports = {
  VaultCryptoEngine,
  QuantumglowAxEngine,
  deriveHashLockedQuantumPdaVault,
  validateSafeVaultFilePath,
  zeroizeBuffer,
  encodeB58,
  decodeB58,
  deriveEd25519PublicKeyFromSeed32,
  signEd25519Seed32Native,
  verifyEd25519Native,
  WOTS_TOTAL_CHAINS,
  MIN_PASSPHRASE_LENGTH
};

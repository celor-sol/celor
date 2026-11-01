"use strict";

/**
 * CELOR TRENCH WALLET BACKEND — ADVERSARIAL SECURITY CONFORMANCE AUDIT V3
 * =======================================================================
 * Independent re-audit written AFTER V1 (11 fixes) and V2 (B1-B18 fixes) shipped.
 *
 *   SECTION R — "Really fixed?"  Re-attack every earlier fix with VARIANTS the original test did not use.
 *   SECTION N — New attack classes found by reading the code as an attacker (trust boundaries,
 *               state integrity, caller-controlled policy, proof forgery, instruction injection).
 *
 * Every probe prints HELD (defense worked) or BYPASS (defense defeated). The suite never aborts on a
 * BYPASS; it prints a scoreboard and exits non-zero if any BYPASS remains.
 * All probes run against a private in-process daemon / temp files only.
 */

const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");

const {
  VaultCryptoEngine,
  QuantumglowAxEngine,
  BytecodeDrainerFirewall,
  TrenchExecutionEngine,
  startWalletBackendHttpServer,
  compileV0MessageFast,
  decodeWireTransactionFast,
  encodeCompactU16,
  encodeB58,
  decodeB58,
  deriveEd25519PublicKeyFromSeed32,
  signEd25519Seed32Native,
  buildSetComputeUnitLimitIx,
  buildSetComputeUnitPriceIx,
  SYSTEM_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID
} = require("../lib/wallet-backend");

const JUPITER_V6 = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const PASS = "AuditVaultPass#2026!";

const results = [];
function record(id, target, severity, held, detail) {
  results.push({ id, target, severity, status: held ? "HELD" : "BYPASS", detail });
  console.log(`${held ? "🟢 HELD  " : "🔴 BYPASS"} [${id}] (${severity}) ${target}\n          ↳ ${detail}`);
}
async function probe(id, target, severity, fn) {
  try {
    await fn();
  } catch (e) {
    record(id, target, severity, false, `Probe crashed unexpectedly: ${e.message}`);
  }
}

const rnd = () => encodeB58(deriveEd25519PublicKeyFromSeed32(crypto.randomBytes(32)));
function newSigner() {
  const seed = crypto.randomBytes(32);
  const pub = deriveEd25519PublicKeyFromSeed32(seed);
  return { seed, pub, b58: encodeB58(pub) };
}
function sysTransfer(from, to, lamports) {
  const d = Buffer.alloc(12);
  d.writeUInt32LE(2, 0);
  d.writeBigUInt64LE(BigInt(lamports), 4);
  return {
    programId: SYSTEM_PROGRAM_ID,
    keys: [
      { pubkey: from, isSigner: true, isWritable: true },
      { pubkey: to, isSigner: false, isWritable: true }
    ],
    data: d
  };
}
function wire1(msg) {
  return Buffer.concat([encodeCompactU16(1), Buffer.alloc(64, 0), msg]);
}
function wire2(msg, coSigner) {
  return Buffer.concat([
    encodeCompactU16(2),
    Buffer.alloc(64, 0),
    signEd25519Seed32Native(coSigner.seed, msg),
    msg
  ]);
}
function post(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === "string" ? body : JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
    const u = new URL(url);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: "/",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), ...headers }
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          } catch (_) {}
          resolve({ statusCode: res.statusCode, json });
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log("==========================================================================");
  console.log("🛡️ CELOR WALLET BACKEND — ADVERSARIAL SECURITY CONFORMANCE AUDIT V3");
  console.log("==========================================================================\n");

  const daemon = await startWalletBackendHttpServer({
    port: 0,
    initialSlot: 460600000,
    maxFailedUnlockAttempts: 3,
    unlockLockoutDurationMs: 60_000
  });
  const T = { "X-Celor-Auth-Token": daemon.authToken };
  const rpc = (method, params = {}, extra = {}) =>
    post(daemon.url, { jsonrpc: "2.0", id: 1, method, params }, { ...T, ...extra });

  const created = await rpc("wallet_createVault", { passphrase: PASS });
  const summary = created.json.result.summary;
  const HOT = summary.primaryHotWallet.pubkey;
  const COLD = summary.quantumColdVault.pubkey;
  const engine = daemon.bridge.engine;
  const bh = rnd();
  const attacker = rnd();
  const unknownProg = rnd();
  const tmpRoot = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "celor-v3-"));

  try {
    // =====================================================================
    // SECTION R — ARE THE EARLIER FIXES REALLY FIXED? (variant attacks)
    // =====================================================================
    console.log("── SECTION R: Re-attack earlier fixes with new variants ─────────────────");

    await probe("R1", "B1 origin check — userinfo / suffix / scheme / null variants", "MEDIUM", async () => {
      const origins = [
        "https://celor.cloud@attacker.example",
        "https://celor.cloud.attacker.example",
        "http://celor.cloud", // http (not https) for the production host
        "http://127.0.0.1.attacker.example",
        "chrome-extension://short",
        "null",
        "file://"
      ];
      const codes = [];
      for (const o of origins) codes.push((await rpc("wallet_connect", {}, { Origin: o })).statusCode);
      const held = codes.every((c) => c === 403);
      record("R1", "B1 origin check — userinfo / suffix / scheme / null variants", "MEDIUM", held, `HTTP codes: ${codes.join(",")}`);
    });

    await probe("R2", "B3 tier pinning — non-HOT/BURNER tier strings on dApp signing", "HIGH", async () => {
      const m = compileV0MessageFast(HOT, bh, [sysTransfer(HOT, attacker, 1000n)]);
      const outcomes = [];
      for (const tier of ["GUARD_ANCHOR", "cold", " COLD", "COLD "]) {
        const r = await rpc("wallet_signTransaction", { transactionBase64: wire1(m).toString("base64"), tier });
        outcomes.push(`${tier.trim()}→${r.json.result && r.json.result.approved ? "APPROVED" : "rejected"}`);
      }
      const held = !outcomes.some((o) => o.endsWith("APPROVED"));
      record("R2", "B3 tier pinning — non-HOT/BURNER tier strings on dApp signing", "HIGH", held, outcomes.join(" | "));
    });

    await probe("R3", "B2 rent vacuum — COLD tier + bad burnerIndex accepted?", "MEDIUM", async () => {
      const before = daemon.bridge.vault.envelope.state.coldKeyExposedOnChain;
      const r1 = await rpc("celor_vacuumRent", { emptyAtas: [{ ataPubkeyB58: rnd() }], tier: "COLD" });
      const exposedAfter = daemon.bridge.vault.envelope.state.coldKeyExposedOnChain;
      const r2 = await rpc("celor_vacuumRent", { emptyAtas: [{ ataPubkeyB58: rnd() }], tier: "BURNER", burnerIndex: -5 });
      const r3 = await rpc("celor_vacuumRent", { emptyAtas: [{ ataPubkeyB58: rnd() }], tier: "BURNER", burnerIndex: 1.5 });
      const held = !r1.json.result && !r2.json.result && !r3.json.result && exposedAfter === before;
      record("R3", "B2 rent vacuum — COLD tier + bad burnerIndex accepted?", "MEDIUM", held,
        held ? "COLD / negative / fractional index rejected" :
          `COLD tier ${r1.json.result ? "signed with Cold key" : "rejected"} (coldKeyExposedOnChain ${before}→${exposedAfter}); neg-index ${r2.json.result ? "signed" : "rejected"}; frac-index ${r3.json.result ? "signed" : "rejected"}`);
      daemon.bridge.vault.envelope.state.coldKeyExposedOnChain = before;
    });

    await probe("R4", "B5 SOL cap — CreateAccountWithSeed funding bypasses cap", "CRITICAL", async () => {
      const base = HOT;
      const seed = Buffer.from("abc");
      const d = Buffer.alloc(4 + 32 + 8 + seed.length + 8 + 8 + 32);
      let o = 0;
      d.writeUInt32LE(3, o); o += 4;
      decodeB58(base).copy(d, o); o += 32;
      d.writeBigUInt64LE(BigInt(seed.length), o); o += 8;
      seed.copy(d, o); o += seed.length;
      d.writeBigUInt64LE(50_000_000_000n, o); o += 8; // 50 SOL
      d.writeBigUInt64LE(0n, o); o += 8;
      decodeB58(SYSTEM_PROGRAM_ID).copy(d, o); // verified owner => ONLY the SOL cap can stop this
      const msg = compileV0MessageFast(HOT, bh, [{
        programId: SYSTEM_PROGRAM_ID,
        keys: [
          { pubkey: HOT, isSigner: true, isWritable: true },
          { pubkey: attacker, isSigner: false, isWritable: true }
        ],
        data: d
      }]);
      const a = BytecodeDrainerFirewall.inspectTransactionBytes(wire1(msg), { userPubkeyB58: HOT, maxApprovedSolLamports: 100_000_000n });
      record("R4", "B5 SOL cap — CreateAccountWithSeed funding bypasses cap", "CRITICAL", !a.safe,
        a.safe ? "50 SOL into an attacker-owned seed account passed as VERIFIED_SAFE" : String(a.ruleTriggered));
    });

    await probe("R5", "B5 SOL cap — WithdrawNonceAccount authority drain", "MEDIUM", async () => {
      const d = Buffer.alloc(12);
      d.writeUInt32LE(5, 0);
      d.writeBigUInt64LE(9_000_000_000n, 4);
      const msg = compileV0MessageFast(HOT, bh, [{
        programId: SYSTEM_PROGRAM_ID,
        keys: [
          { pubkey: rnd(), isSigner: false, isWritable: true },
          { pubkey: attacker, isSigner: false, isWritable: true },
          { pubkey: rnd(), isSigner: false, isWritable: false },
          { pubkey: rnd(), isSigner: false, isWritable: false },
          { pubkey: HOT, isSigner: true, isWritable: false }
        ],
        data: d
      }]);
      const a = BytecodeDrainerFirewall.inspectTransactionBytes(wire1(msg), { userPubkeyB58: HOT });
      record("R5", "B5 SOL cap — WithdrawNonceAccount authority drain", "MEDIUM", !a.safe,
        a.safe ? "User-as-nonce-authority withdraw to attacker passed" : String(a.ruleTriggered));
    });

    await probe("R6", "B11 Jupiter — output redirect using the REAL IDL account layout", "HIGH", async () => {
      // sharedAccountsRoute: [0 tokenProgram, 1 programAuthority, 2 userTransferAuthority(signer=user),
      //                       3 sourceTA, 4 programSourceTA, 5 programDestTA, 6 destinationTA, ...]
      const disc = Buffer.from("c1209b3341d69c81", "hex");
      const keys = [
        { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: rnd(), isSigner: false, isWritable: false },
        { pubkey: HOT, isSigner: true, isWritable: false },
        { pubkey: rnd(), isSigner: false, isWritable: true },
        { pubkey: rnd(), isSigner: false, isWritable: true },
        { pubkey: rnd(), isSigner: false, isWritable: true },
        { pubkey: attacker, isSigner: false, isWritable: true } // destination = attacker
      ];
      const msg = compileV0MessageFast(HOT, bh, [{ programId: JUPITER_V6, keys, data: Buffer.concat([disc, crypto.randomBytes(16)]) }]);
      const a = BytecodeDrainerFirewall.inspectTransactionBytes(wire1(msg), { userPubkeyB58: HOT });
      record("R6", "B11 Jupiter — output redirect using the REAL IDL account layout", "HIGH", !a.safe,
        a.safe ? "Valid swap discriminator + attacker destination (idx 6) passed — check inspects idx 2 (the user signer)" : String(a.ruleTriggered));
    });

    await probe("R7", "B13 WOTS counter — is the monotonic counter persisted at all?", "MEDIUM", async () => {
      const f = path.join(tmpRoot, "ctr.json");
      const v = VaultCryptoEngine.createNewVault(PASS, { vaultFilePath: f });
      for (let i = 0; i < 5; i++) v.dualSignTransactionBytes(crypto.randomBytes(120), { tier: "HOT" });
      const onDisk = JSON.parse(fs.readFileSync(f, "utf8")).state.axSigSeqCounter;
      const reloaded = VaultCryptoEngine.loadVault(f, PASS);
      const startsAt = reloaded.axEngine.sigSeqCounter;
      record("R7", "B13 WOTS counter — is the monotonic counter persisted at all?", "MEDIUM", onDisk >= 5 && startsAt >= 5,
        `after 5 signatures: on-disk axSigSeqCounter=${onDisk}, reloaded engine starts at ${startsAt} (random salt is the only reuse guard)`);
    });

    await probe("R8", "B14 WOTS digest binding — effective message-binding strength", "MEDIUM", async () => {
      // Count how many distinct step-vectors exist: 16 message chains x 4 bits = 64 bits.
      // Birthday on the first 8 chains (32 bits) proves the structure cheaply.
      const seen = new Map();
      let collisionAt = -1;
      for (let i = 0; i < 400000; i++) {
        const m = Buffer.allocUnsafe(8);
        m.writeUInt32LE(i, 0);
        const s = QuantumglowAxEngine.computeWotsStepsWithChecksum(crypto.createHash("sha256").update(m).digest());
        const key = Buffer.from(s.subarray(0, 8)).toString("hex");
        if (seen.has(key)) { collisionAt = i; break; }
        seen.set(key, i);
      }
      const msgChains = QuantumglowAxEngine.computeWotsStepsWithChecksum(crypto.randomBytes(32)).length - 3;
      const bits = msgChains * 4;
      record("R8", "B14 WOTS digest binding — effective message-binding strength", "MEDIUM", bits >= 128,
        `Only ${msgChains} message chains × 4 bits = ${bits}-bit digest binding (collision ≈ 2^${bits / 2}); 32-bit sub-collision found after ${collisionAt} hashes. Need ≥ 64 chains for 256-bit binding.`);
    });

    await probe("R9", "B15 proof pinning — forge a 'verified' proof for an unsigned message with NO key", "CRITICAL", async () => {
      const msg = crypto.randomBytes(150);
      const slot = 460600001;
      const sigSeq = "7_deadbeefdeadbeef";
      const X = crypto.randomBytes(32);
      const Y = crypto.createHash("sha256").update(X).digest("hex");
      const txDigest = crypto.createHash("sha256").update(msg).digest();
      const steps = QuantumglowAxEngine.computeWotsStepsWithChecksum(txDigest);
      const elems = [];
      const rootH = crypto.createHash("sha256").update(`AX_WOTS_ROOT_V2:${slot}:${sigSeq}:`);
      for (let c = 0; c < steps.length; c++) {
        const e = crypto.randomBytes(32);
        elems.push(e.toString("hex"));
        rootH.update(QuantumglowAxEngine.stepWotsChain(e, slot, c, steps[c], 15 - steps[c]));
      }
      const forged = {
        scheme: "QUANTUMGLOW_AX_XMSS_SHA256_V2_CHECKSUM",
        slot, sigSeq,
        masterRootHex: daemon.bridge.vault.axEngine.masterRootHex, // public value
        txDigestHex: txDigest.toString("hex"),
        finalizeOtpkHex: Y,
        revealedPreimageHex: X.toString("hex"),
        notarizeWotsRootHex: rootH.digest("hex"),
        wotsChainElementsHex: elems
      };
      const r = await rpc("celor_verifyQuantumProof", { proof: forged, messageBase64: msg.toString("base64") });
      const verified = r.json.result && r.json.result.verified === true;
      record("R9", "B15 proof pinning — forge a 'verified' proof for an unsigned message with NO key", "CRITICAL", !verified,
        verified ? "Attacker-built proof (random preimage + random chains) returned verified:true under the victim's pinned master root" : "Forged proof rejected");
    });

    await probe("R9b", "B15 control — a GENUINE proof from this vault must still verify", "HIGH", async () => {
      const msg = compileV0MessageFast(HOT, bh, [sysTransfer(HOT, COLD, 1000n)]);
      const s = await rpc("wallet_signTransaction", { transactionBase64: wire1(msg).toString("base64") });
      const proof = s.json.result && s.json.result.quantumProof;
      // The wallet re-compiles the transaction (tight CU budget, fresh blockhash), so the proof covers the SIGNED message.
      const signedWire = Buffer.from(s.json.result.signedTransactionBase64, "base64");
      const signedMsg = decodeWireTransactionFast(signedWire).messageBytes;
      const v = await rpc("celor_verifyQuantumProof", { proof, messageBase64: signedMsg.toString("base64") });
      const ok = v.json.result && v.json.result.verified === true;
      record("R9b", "B15 control — a GENUINE proof from this vault must still verify", "HIGH", ok, ok ? "Genuine proof verifies" : `Genuine proof rejected: ${JSON.stringify(v.json.result || v.json.error)}`);
    });

    await probe("R10", "B12 lockout — correct passphrase must be refused during lockout", "MEDIUM", async () => {
      const env = JSON.parse(JSON.stringify(daemon.bridge.vault.envelope));
      daemon.bridge.failedUnlockAttempts = 0; daemon.bridge.unlockLockoutUntilMs = 0;
      for (let i = 0; i < 4; i++) await rpc("wallet_unlockVault", { envelope: env, passphrase: `WrongPass#${i}abcd` });
      const ok = await rpc("wallet_unlockVault", { envelope: env, passphrase: PASS });
      const held = ok.json.error && /RATE_LIMITED/.test(ok.json.error.message);
      record("R10", "B12 lockout — correct passphrase must be refused during lockout", "MEDIUM", Boolean(held), held ? "Locked out" : "Lockout not enforced");
      daemon.bridge.failedUnlockAttempts = 0; daemon.bridge.unlockLockoutUntilMs = 0;
    });

    await probe("R11", "B6 batch cap — one transaction splitting spend across 3 system ix types", "HIGH", async () => {
      const d11 = Buffer.alloc(12 + 4); // TransferWithSeed-shaped (disc 11)
      d11.writeUInt32LE(11, 0);
      d11.writeBigUInt64LE(1_500_000_000n, 4);
      const msg = compileV0MessageFast(HOT, bh, [
        sysTransfer(HOT, attacker, 1_500_000_000n),
        { programId: SYSTEM_PROGRAM_ID, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: HOT, isSigner: true, isWritable: false }, { pubkey: attacker, isSigner: false, isWritable: true }], data: d11 }
      ]);
      const a = BytecodeDrainerFirewall.inspectTransactionBytes(wire1(msg), { userPubkeyB58: HOT, maxApprovedSolLamports: 2_000_000_000n });
      record("R11", "B6 batch cap — one transaction splitting spend across 3 system ix types", "HIGH", !a.safe, a.safe ? `3.0 SOL out vs 2 SOL cap passed (counted ${a.totalDirectSolOutLamports})` : String(a.ruleTriggered));
    });

    // =====================================================================
    // SECTION N — NEW ATTACK CLASSES
    // =====================================================================
    console.log("\n── SECTION N: New attack classes ────────────────────────────────────────");

    await probe("N1", "Pre-signed Panic Eject accepts caller-supplied raw instructions (firewall bypass)", "CRITICAL", async () => {
      const drainIx = sysTransfer(HOT, attacker, 4_000_000_000n);
      let accepted = false;
      const r = await rpc("celor_armPanicEject", {
        hotWalletSolBalanceLamports: "5000000000",
        openPositions: [{ mintB58: rnd(), ataPubkeyB58: rnd(), sellInstruction: { programId: drainIx.programId, keys: drainIx.keys, data: drainIx.data.toString("hex") } }]
      });
      // The RPC JSON cannot carry Buffers, so also try the in-process engine path used by the bridge.
      let engineAccepted = false;
      try {
        engine.armPreSignedPanicEject({ hotWalletSolBalanceLamports: 5_000_000_000n, openPositions: [{ mintB58: rnd(), ataPubkeyB58: rnd(), sellInstruction: drainIx }] });
        const w = engine.preSignedPanicWires.find((x) => x.kind === "EMERGENCY_POSITION_EXIT_100_PCT");
        engineAccepted = Boolean(w);
      } catch (_) {}
      accepted = engineAccepted;
      engine.preSignedPanicWires = []; engine.lastArmedPanicParams = null;
      record("N1", "Pre-signed Panic Eject accepts caller-supplied raw instructions (firewall bypass)", "CRITICAL", !accepted,
        accepted ? `Armed + HOT-signed a 4 SOL SystemProgram::Transfer→attacker as an "exit"; triggerPanicEject would broadcast it (rpc ${r.json.error ? "err" : "ok"})` : "Non-DEX instruction refused");
    });

    await probe("N2", "Offline TP/SL guard signs caller-supplied sell instruction without audit", "CRITICAL", async () => {
      const drainIx = sysTransfer(HOT, attacker, 4_000_000_000n);
      let accepted = false;
      try {
        const st = engine.registerPositionInOfflineGuard({ mintB58: rnd(), ataPubkeyB58: rnd(), costBasisSol: 1, tpPct: 50, slPct: -20, sell100Instruction: drainIx });
        accepted = Boolean(st.hotExit100 && st.hotExit100.wireTransaction);
      } catch (_) {}
      engine.activePositionGuards.clear();
      record("N2", "Offline TP/SL guard signs caller-supplied sell instruction without audit", "CRITICAL", !accepted,
        accepted ? "Pre-signed 4 SOL transfer→attacker as a 'hotExit100' wire (fired automatically by celor_evaluatePoolTick)" : "Refused");
    });

    await probe("N3", "Vault file state tamper → Panic-sweep destination silently redirected", "CRITICAL", async () => {
      const f = path.join(tmpRoot, "tamper.json");
      VaultCryptoEngine.createNewVault(PASS, { vaultFilePath: f });
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      j.state.quantumColdVaultPubkey = attacker; // plaintext, unauthenticated field
      fs.writeFileSync(f, JSON.stringify(j));
      let dest = null;
      let loadErr = null;
      try {
        const v = VaultCryptoEngine.loadVault(f, PASS);
        const eng = new TrenchExecutionEngine(v, { initialSlot: 460600000 });
        eng.armPreSignedPanicEject({ hotWalletSolBalanceLamports: 5_000_000_000n, openPositions: [] });
        const sweep = eng.preSignedPanicWires.find((w) => w.kind === "QUANTUM_COLD_VAULT_SOL_SWEEP");
        const dec = decodeWireTransactionFast(sweep.wireTransaction);
        dest = dec.instructions.find((i) => i.programIdB58 === SYSTEM_PROGRAM_ID).accounts[1].pubkeyB58;
        eng.destroy();
      } catch (e) { loadErr = e.message; }
      const held = Boolean(loadErr) || dest !== attacker;
      record("N3", "Vault file state tamper → Panic-sweep destination silently redirected", "CRITICAL", held,
        held ? (loadErr ? `Tamper detected on load: ${loadErr.slice(0, 70)}` : "Destination re-derived from seed") : "AES-GCM covers only the seed; plaintext `state` (cold vault pubkey) is trusted → panic sweep signed to attacker address");
    });

    const live = () => daemon.bridge.vault.getPublicVaultSummary();
    const HOT2 = () => live().primaryHotWallet.pubkey;

    await probe("N5", "Passphrase-verify oracle has no lockout (celor_syncTelegramBot / rotate)", "HIGH", async () => {
      const current = daemon.bridge.vault && daemon.bridge.vault.getPublicVaultSummary ? true : false;
      if (!current) { record("N5", "Passphrase-verify oracle has no lockout", "HIGH", false, "No vault"); return; }
      let evaluated = 0;
      let rateLimited = 0;
      for (let i = 0; i < 8; i++) {
        const r = await rpc("celor_syncTelegramBot", { passphrase: `Guess#${i}xxxxxxxx` });
        const msg = (r.json.error && r.json.error.message) || "";
        if (/RATE_LIMITED/.test(msg)) rateLimited++;
        else if (/REAUTH_FAILED/.test(msg)) evaluated++;
      }
      record("N5", "Passphrase-verify oracle has no lockout (celor_syncTelegramBot / rotate)", "HIGH", evaluated <= 3 && rateLimited >= 1,
        `${evaluated}/8 wrong guesses were actually evaluated with maxFailedUnlockAttempts=3 (${rateLimited} rate-limited)`);
      daemon.bridge.failedUnlockAttempts = 0; daemon.bridge.unlockLockoutUntilMs = 0;
    });

    await probe("N6", "Caller-controlled policy overrides (cap, token-transfer allow, burn allow)", "HIGH", async () => {
      const big = compileV0MessageFast(HOT2(), bh, [sysTransfer(HOT2(), attacker, 50_000_000_000n)]);
      const r1 = await rpc("wallet_signTransaction", { transactionBase64: wire1(big).toString("base64"), maxApprovedSolLamports: "100000000000" });
      const t = Buffer.alloc(9); t[0] = 3; t.writeBigUInt64LE(1000n, 1);
      const ata = rnd();
      const tokMsg = compileV0MessageFast(HOT2(), bh, [{ programId: SPL_TOKEN_PROGRAM_ID, keys: [{ pubkey: ata, isSigner: false, isWritable: true }, { pubkey: attacker, isSigner: false, isWritable: true }, { pubkey: HOT2(), isSigner: true, isWritable: false }], data: t }]);
      const r2 = await rpc("wallet_signTransaction", { transactionBase64: wire1(tokMsg).toString("base64"), allowDirectTokenTransfers: true, userTokenAtas: [ata] });
      const r3 = await rpc("wallet_signTransaction", { transactionBase64: wire1(tokMsg).toString("base64"), allowedTokenTransferDestinations: [attacker], userTokenAtas: [ata] });
      const a1 = r1.json.result && r1.json.result.approved;
      const a2 = r2.json.result && r2.json.result.approved;
      const a3 = r3.json.result && r3.json.result.approved;
      record("N6", "Caller-controlled policy overrides (cap, token-transfer allow, burn allow)", "HIGH", !a1 && !a2 && !a3,
        `50 SOL w/ self-raised cap: ${a1 ? "APPROVED" : "blocked"}; token→attacker w/ allowDirect: ${a2 ? "APPROVED" : "blocked"}; w/ self-allowlisted dest: ${a3 ? "APPROVED" : "blocked"}`);
    });

    await probe("N7", "Unknown dApp + user signer with NO token inventory → SPL tokens unguarded", "HIGH", async () => {
      const ata = rnd();
      const msg = compileV0MessageFast(HOT2(), bh, [{ programId: unknownProg, keys: [{ pubkey: HOT2(), isSigner: true, isWritable: true }, { pubkey: ata, isSigner: false, isWritable: true }], data: Buffer.from([9]) }]);
      const r = await rpc("wallet_signTransaction", { transactionBase64: wire1(msg).toString("base64"), currentWalletBalanceLamports: "5000000000" });
      const approved = r.json.result && r.json.result.approved;
      record("N7", "Unknown dApp + user signer with NO token inventory → SPL tokens unguarded", "HIGH", !approved,
        approved ? "Signed with only a SOL floor guard; any SPL balance held by the wallet is unprotected because userTokenAtas defaults to []" : "Token inventory required");
    });

    await probe("N8", "Token Balance-Floor Guard does not stop CPI Approve (delegate theft after tx)", "MEDIUM", async () => {
      const g = BytecodeDrainerFirewall.buildOnChainBalanceFloorGuard({
        userHotWalletB58: HOT, userSafeVaultB58: COLD, currentBalanceLamports: 5_000_000_000n, maxApprovedSpendLamports: 100_000_000n,
        protectedTokenAtas: [{ ataPubkeyB58: rnd(), minRemainingRawAmount: 1n }]
      });
      const hasRevoke = g.roundTripDualSignerGuardIxs.some((ix) => (ix.programId === SPL_TOKEN_PROGRAM_ID) && ix.data.length === 1 && ix.data[0] === 5);
      record("N8", "Token Balance-Floor Guard does not stop CPI Approve (delegate theft after tx)", "MEDIUM", hasRevoke,
        hasRevoke ? "Guard appends SPL Revoke per protected ATA" : "Guard only re-checks balance; an unverified program that Approves a delegate passes the guard and drains later");
    });

    await probe("N9", "Priority-fee drain through the multi-signer passthrough (ComputeBudget unchecked)", "HIGH", async () => {
      const co = newSigner();
      const msg = compileV0MessageFast(HOT2(), bh, [
        buildSetComputeUnitLimitIx(1_400_000),
        buildSetComputeUnitPriceIx(5_000_000_000), // 7 SOL of priority fee
        { programId: PUMP_FUN_PROGRAM_ID, keys: [{ pubkey: HOT2(), isSigner: true, isWritable: true }, { pubkey: co.b58, isSigner: true, isWritable: true }], data: Buffer.from([1, 2, 3, 4]) }
      ]);
      const r = engine.turboHijackExternalTransaction(wire2(msg, co), { tier: "HOT" });
      const signed = r.status === "TURBO_HIJACKED_AND_SIGNED";
      record("N9", "Priority-fee drain through the multi-signer passthrough (ComputeBudget unchecked)", "HIGH", !signed,
        signed ? "Signed a tx whose user-paid priority fee is ≈7 SOL (price × limit); fee payer = user" : String(r.firewallAudit && r.firewallAudit.ruleTriggered));
    });

    await probe("N10", "Caller sets slot far in the future → real slot updates ignored forever", "MEDIUM", async () => {
      const before = engine.currentSlot;
      await rpc("celor_updateSlotAndBlockhash", { slot: 9_000_000_000_000_000, blockhashB58: rnd() });
      await rpc("celor_updateSlotAndBlockhash", { slot: before + 1, blockhashB58: rnd() });
      const stuck = engine.currentSlot >= 9_000_000_000_000_000;
      record("N10", "Caller sets slot far in the future → real slot updates ignored forever", "MEDIUM", !stuck, stuck ? `currentSlot stuck at ${engine.currentSlot} (monotonic guard has no upper bound; also accepts non-32-byte blockhash)` : "Slot jump rejected");
      if (stuck) engine.currentSlot = before;
    });

    await probe("N11", "Garbage blockhash accepted into signing cache", "LOW", async () => {
      const before = engine.cachedBlockhashB58;
      const r = await rpc("celor_updateSlotAndBlockhash", { slot: engine.currentSlot + 1, blockhashB58: "not-a-hash" });
      const accepted = engine.cachedBlockhashB58 === "not-a-hash";
      record("N11", "Garbage blockhash accepted into signing cache", "LOW", !accepted, accepted ? "Every later signature compiles with an invalid blockhash (signing DoS)" : "Rejected");
      engine.cachedBlockhashB58 = before;
      void r;
    });

    await probe("N12", "Crafted envelope with extreme KDF iteration count (CPU-exhaustion)", "MEDIUM", async () => {
      const f = path.join(tmpRoot, "kdf.json");
      VaultCryptoEngine.createNewVault(PASS, { vaultFilePath: f });
      const env = JSON.parse(fs.readFileSync(f, "utf8"));
      const out = [];
      for (const it of [1, 6_000_000]) {
        env.iterations = it;
        const t0 = Date.now();
        let msg = "";
        try { await VaultCryptoEngine.loadVaultAsync(JSON.parse(JSON.stringify(env)), PASS); } catch (e) { msg = e.message; }
        out.push({ it, ms: Date.now() - t0, rejected: /KDF_PARAMS|OUT_OF_RANGE/.test(msg) });
      }
      record("N12", "Crafted envelope with extreme KDF iteration count (CPU-exhaustion)", "MEDIUM", out.every((o) => o.rejected),
        out.map((o) => `iter=${o.it}: ${o.rejected ? "rejected" : `evaluated (${o.ms}ms)`}`).join(" | "));
    });

    await probe("N13", "Address-poisoning — 4+2 and 2+4 lookalikes of the Cold Vault", "LOW", async () => {
      const t1 = COLD.slice(0, 4) + "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" + COLD.slice(-2);
      const t2 = COLD.slice(0, 2) + "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz" + COLD.slice(-4);
      const a1 = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(t1, [COLD]);
      const a2 = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(t2, [COLD]);
      record("N13", "Address-poisoning — 4+2 and 2+4 lookalikes of the Cold Vault", "LOW", Boolean(a1.poisoningDetected && a2.poisoningDetected),
        `4+2 flagged=${a1.poisoningDetected}, 2+4 flagged=${a2.poisoningDetected}`);
    });

    await probe("N14", "Burner/fee-payer mismatch: unknown tier on multi-signer path fails closed", "LOW", async () => {
      const co = newSigner();
      const msg = compileV0MessageFast(HOT2(), bh, [{ programId: PUMP_FUN_PROGRAM_ID, keys: [{ pubkey: HOT2(), isSigner: true, isWritable: true }, { pubkey: co.b58, isSigner: true, isWritable: true }], data: Buffer.from([1, 2, 3]) }]);
      let threw = false;
      let signed = false;
      try { const r = engine.turboHijackExternalTransaction(wire2(msg, co), { tier: "GUARD_ANCHOR" }); signed = r.status === "TURBO_HIJACKED_AND_SIGNED"; } catch (_) { threw = true; }
      record("N14", "Burner/fee-payer mismatch: unknown tier on multi-signer path fails closed", "LOW", threw || !signed, signed ? "Engine signed the user slot with the GUARD_ANCHOR key (invalid signature, key material misused)" : "Failed closed");
    });

    await probe("N4", "Active vault replaced / file overwritten with NO re-authentication", "HIGH", async () => {
      const f = path.join(tmpRoot, "victim.json");
      const victim = await rpc("wallet_createVault", { passphrase: PASS, vaultFilePath: f, currentPassphrase: PASS });
      // attacker holding only the session token swaps in a vault whose seed THEY know
      const swap = await rpc("wallet_createVault", { passphrase: "AttackerPass#9999", masterSeedHex: "11".repeat(32) });
      const replaced = Boolean(swap.json.result);
      const over = await rpc("wallet_createVault", { passphrase: "AttackerPass#9999", vaultFilePath: f, allowOverwrite: true });
      const overwritten = Boolean(over.json.result);
      record("N4", "Active vault replaced / file overwritten with NO re-authentication", "HIGH", !replaced && !overwritten,
        `createVault replace-active: ${replaced ? "ACCEPTED" : "rejected"}; overwrite-file: ${overwritten ? "ACCEPTED" : "rejected"} (victim ok=${Boolean(victim.json.result)})`);
    });

    await probe("N15", "MAC downgrade: strip stateMacHex + set version:'1.1.0' to tamper counters/flags", "HIGH", async () => {
      const f = path.join(tmpRoot, "downgrade.json");
      VaultCryptoEngine.createNewVault(PASS, { vaultFilePath: f });
      const env = JSON.parse(fs.readFileSync(f, "utf8"));
      delete env.stateMacHex;
      env.version = "1.1.0";
      env.state.axSigSeqCounter = 0;
      env.state.coldKeyExposedOnChain = true;
      let errMsg = "";
      try {
        VaultCryptoEngine.loadVault(env, PASS);
      } catch (e) {
        errMsg = e.message;
      }
      const blocked = /VAULT_STATE_TAMPERED/.test(errMsg);
      record("N15", "MAC downgrade: strip stateMacHex + set version:'1.1.0' to tamper counters/flags", "HIGH", blocked,
        blocked ? `Downgrade blocked: ${errMsg.slice(0, 72)}` : "Loaded tampered v1.1.0 envelope without stateMacHex");
    });

    await probe("N16", "DEX spend & output redirect on Pump.fun, PumpSwap & Raydium V4", "CRITICAL", async () => {
      // 1) Pump.fun buy with maxSolCost = 50 SOL (exceeds 2 SOL cap)
      const pumpBuy50 = Buffer.alloc(24);
      Buffer.from("66063d1201daebea", "hex").copy(pumpBuy50, 0);
      pumpBuy50.writeBigUInt64LE(1_000_000n, 8);
      pumpBuy50.writeBigUInt64LE(50_000_000_000n, 16);
      const a1 = BytecodeDrainerFirewall.inspectTransactionBytes(
        compileV0MessageFast(HOT, bh, [{ programId: PUMP_FUN_PROGRAM_ID, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: rnd(), isSigner: false, isWritable: true }], data: pumpBuy50 }]),
        { userPubkeyB58: HOT, maxApprovedSolLamports: 2_000_000_000n }
      );
      // 2) 12-account Pump.fun buy redirecting output (idx 5) to attacker ATA even with NO userTokenAtas passed
      const pumpBuy1 = Buffer.alloc(24);
      Buffer.from("66063d1201daebea", "hex").copy(pumpBuy1, 0);
      pumpBuy1.writeBigUInt64LE(1_000_000n, 8);
      pumpBuy1.writeBigUInt64LE(100_000_000n, 16);
      const pump12Keys = Array.from({ length: 12 }, (_, i) => ({
        pubkey: i === 5 ? attacker : i === 6 ? HOT : rnd(),
        isSigner: i === 6,
        isWritable: i === 5 || i === 6
      }));
      const a2 = BytecodeDrainerFirewall.inspectTransactionBytes(
        compileV0MessageFast(HOT, bh, [{ programId: PUMP_FUN_PROGRAM_ID, keys: pump12Keys, data: pumpBuy1 }]),
        { userPubkeyB58: HOT }
      );
      // 3) 17-account Raydium V4 swapBaseIn redirecting output (idx 15) to attacker ATA
      const rayData = Buffer.alloc(17);
      rayData[0] = 9;
      rayData.writeBigUInt64LE(100_000_000n, 1);
      rayData.writeBigUInt64LE(1n, 9);
      const ray17Keys = Array.from({ length: 17 }, (_, i) => ({
        pubkey: i === 15 ? attacker : i === 16 ? HOT : rnd(),
        isSigner: i === 16,
        isWritable: i === 15 || i === 16
      }));
      const a3 = BytecodeDrainerFirewall.inspectTransactionBytes(
        compileV0MessageFast(HOT, bh, [{ programId: "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", keys: ray17Keys, data: rayData }]),
        { userPubkeyB58: HOT }
      );
      const heldAll = !a1.safe && !a2.safe && !a3.safe;
      record("N16", "DEX spend & output redirect on Pump.fun, PumpSwap & Raydium V4", "CRITICAL", heldAll,
        `Pump50SOL=${a1.ruleTriggered} | PumpRedirect=${a2.ruleTriggered} | RaydiumRedirect=${a3.ruleTriggered}`);
    });

    await probe("N17", "Balance-floor under-reporting & token-inventory erasure (userTokenAtas: [])", "HIGH", async () => {
      const ata = rnd();
      // Step 1: Legitimate guarded tx establishes 10 SOL balance + known user ATA
      const okMsg = compileV0MessageFast(HOT2(), bh, [{ programId: unknownProg, keys: [{ pubkey: HOT2(), isSigner: true, isWritable: true }, { pubkey: ata, isSigner: false, isWritable: true }], data: Buffer.from([1]) }]);
      const r1 = await rpc("wallet_signTransaction", {
        transactionBase64: wire1(okMsg).toString("base64"),
        currentWalletBalanceLamports: "10000000000",
        maxApprovedSolLamports: "200000000",
        userTokenAtas: [ata],
        protectedTokenAtas: [{ ataPubkeyB58: ata, minRemainingRawAmount: "5000000" }]
      });
      // Step 2: Attacker attempts to under-report currentWalletBalanceLamports=0.1 SOL to collapse SOL floor
      const r2 = await rpc("wallet_signTransaction", {
        transactionBase64: wire1(okMsg).toString("base64"),
        currentWalletBalanceLamports: "100000000",
        maxApprovedSolLamports: "50000000",
        userTokenAtas: [ata],
        protectedTokenAtas: [{ ataPubkeyB58: ata, minRemainingRawAmount: "5000000" }]
      });
      // Step 3: Attacker passes SPL_TOKEN_PROGRAM_ID + writable account to unknown CPI while claiming userTokenAtas: []
      const cpiTokMsg = compileV0MessageFast(HOT2(), bh, [{
        programId: unknownProg,
        keys: [
          { pubkey: HOT2(), isSigner: true, isWritable: true },
          { pubkey: rnd(), isSigner: false, isWritable: true },
          { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }
        ],
        data: Buffer.from([2])
      }]);
      const r3 = BytecodeDrainerFirewall.inspectTransactionBytes(cpiTokMsg, {
        userPubkeyB58: HOT2(),
        userTokenAtas: [],
        requireTokenInventory: true,
        allowExternalDappWithGuard: true
      });
      const ok1 = Boolean(r1.json.result && r1.json.result.approved);
      const blockedUnderreport = !(r2.json.result && r2.json.result.approved);
      const blockedEmptyTokCpi = !r3.safe;
      record("N17", "Balance-floor under-reporting & token-inventory erasure (userTokenAtas: [])", "HIGH",
        ok1 && blockedUnderreport && blockedEmptyTokCpi,
        `tx1=${ok1 ? "ok" : "fail"} | underreport=${blockedUnderreport ? "blocked" : "BYPASS"} | emptyAtasWithTokenProg=${blockedEmptyTokCpi ? r3.ruleTriggered : "BYPASS"}`);
    });

    await probe("N18", "Unauthenticated /health state leak & non-loopback UDP relay target", "LOW", async () => {
      const hUnauth = await new Promise((resolve, reject) => {
        http.get(`${daemon.url}/health`, (res) => {
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))));
        }).on("error", reject);
      });
      const leaksUnlocked = hUnauth && Object.prototype.hasOwnProperty.call(hUnauth, "unlocked");
      let remoteRelayRejected = false;
      try {
        new TrenchExecutionEngine(daemon.bridge.vault, { quicRelayHost: "8.8.8.8" });
      } catch (e) {
        remoteRelayRejected = /UNSAFE_QUIC_RELAY_HOST/.test(e.message);
      }
      record("N18", "Unauthenticated /health state leak & non-loopback UDP relay target", "LOW",
        !leaksUnlocked && remoteRelayRejected,
        `/health leaks unlocked=${leaksUnlocked} | remote UDP relay rejected=${remoteRelayRejected}`);
    });
  } finally {
    try { await daemon.close(); } catch (_) {}
    try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch (_) {}
  }

  const held = results.filter((r) => r.status === "HELD").length;
  const bypass = results.filter((r) => r.status === "BYPASS");
  console.log("\n==========================================================================");
  console.log(`📊 SCOREBOARD: ${results.length} probes — ${held} HELD, ${bypass.length} BYPASS`);
  console.log("--------------------------------------------------------------------------");
  for (const b of bypass) console.log(`   🔴 [${b.id}] (${b.severity}) ${b.target}`);
  console.log("==========================================================================");
  process.exit(bypass.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("AUDIT HARNESS CRASHED:", e);
  process.exit(2);
});

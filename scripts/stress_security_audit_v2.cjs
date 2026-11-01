"use strict";

/**
 * CELOR TRENCH WALLET BACKEND — ADVERSARIAL SECURITY CONFORMANCE AUDIT V2
 * =======================================================================
 * Re-audits Parts 1-4 AND the 11 new fixes from an attacker's point of view.
 * Every probe reports HELD (defense worked) or BYPASS (defense defeated).
 * The suite never aborts on a BYPASS — it collects everything and prints a scoreboard.
 */

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { performance } = require("perf_hooks");

const {
  VaultCryptoEngine,
  QuantumglowAxEngine,
  BytecodeDrainerFirewall,
  startWalletBackendHttpServer,
  compileV0MessageFast,
  encodeCompactU16,
  encodeB58,
  decodeB58,
  deriveEd25519PublicKeyFromSeed32,
  signEd25519Seed32Native,
  SYSTEM_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID
} = require("../lib/wallet-backend");

const JUPITER_V6 = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const PASS = "AuditVaultPass#2026!";

const results = [];
function record(id, target, severity, held, detail) {
  results.push({ id, target, severity, status: held ? "HELD" : "BYPASS", detail });
  const tag = held ? "🟢 HELD  " : "🔴 BYPASS";
  console.log(`${tag} [${id}] (${severity}) ${target}\n          ↳ ${detail}`);
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
function getHealth(url) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    http
      .get(`${url}/health`, (res) => {
        res.resume();
        res.on("end", () => resolve(performance.now() - t0));
      })
      .on("error", reject);
  });
}

async function main() {
  console.log("==========================================================================");
  console.log("🛡️ CELOR WALLET BACKEND — ADVERSARIAL SECURITY CONFORMANCE AUDIT V2");
  console.log("==========================================================================\n");

  const daemon = await startWalletBackendHttpServer({
    port: 0,
    initialSlot: 460600000,
    maxFailedUnlockAttempts: 3,
    unlockLockoutDurationMs: 60_000
  });
  const T = { "X-Celor-Auth-Token": daemon.authToken };
  const rpc = async (method, params = {}, extraHeaders = {}) => {
    const r = await post(daemon.url, { jsonrpc: "2.0", id: 1, method, params }, { ...T, ...extraHeaders });
    return r;
  };

  const created = await rpc("wallet_createVault", { passphrase: PASS });
  const summary = created.json.result.summary;
  const HOT = summary.primaryHotWallet.pubkey;
  const COLD = summary.quantumColdVault.pubkey;
  const BURNER0 = summary.stealthBurnerPool.burners[0].pubkey;
  const engine = daemon.bridge.engine;
  const bh = rnd();
  const attacker = rnd();
  const unknownProg = rnd();

  try {
    // =====================================================================
    // SECTION A — RE-VERIFY THE 11 FIXES STILL HOLD (REGRESSION GUARD)
    // =====================================================================
    console.log("── SECTION A: Fix regression guard ──────────────────────────────────────");

    await probe("A1", "Fix #1 — no bearer token", "CRITICAL", async () => {
      const r = await post(daemon.url, { jsonrpc: "2.0", id: 1, method: "wallet_connect", params: {} });
      record("A1", "Fix #1 — no bearer token", "CRITICAL", r.statusCode === 401, `HTTP ${r.statusCode}`);
    });
    await probe("A2", "Fix #1 — wrong token, same length", "CRITICAL", async () => {
      const r = await post(daemon.url, { jsonrpc: "2.0", id: 1, method: "wallet_connect", params: {} }, { "X-Celor-Auth-Token": "0".repeat(64) });
      record("A2", "Fix #1 — wrong token, same length", "CRITICAL", r.statusCode === 401, `HTTP ${r.statusCode}`);
    });
    await probe("A3", "Fix #1 — DNS-rebinding Host header", "HIGH", async () => {
      const r = await rpc("wallet_connect", {}, { Host: "attacker-rebind.example:80" });
      record("A3", "Fix #1 — DNS-rebinding Host header", "HIGH", r.statusCode === 403, `HTTP ${r.statusCode}`);
    });
    await probe("A4", "Fix #1 — Telegram key export without passphrase", "CRITICAL", async () => {
      const r = await rpc("celor_syncTelegramBot", {});
      record("A4", "Fix #1 — Telegram key export without passphrase", "CRITICAL", Boolean(r.json.error), r.json.error ? r.json.error.message.slice(0, 60) : "secret exported!");
    });
    await probe("A5", "Fix #3 — SPL Transfer & Token-2022 BurnChecked", "CRITICAL", async () => {
      const t = Buffer.alloc(9); t[0] = 3; t.writeBigUInt64LE(1000n, 1);
      const b = Buffer.alloc(10); b[0] = 15; b.writeBigUInt64LE(1000n, 1); b[9] = 6;
      const ata = rnd();
      const a1 = BytecodeDrainerFirewall.inspectTransactionBytes(compileV0MessageFast(HOT, bh, [{ programId: SPL_TOKEN_PROGRAM_ID, keys: [{ pubkey: ata, isSigner: false, isWritable: true }, { pubkey: attacker, isSigner: false, isWritable: true }, { pubkey: HOT, isSigner: true, isWritable: false }], data: t }]), { userPubkeyB58: HOT });
      const a2 = BytecodeDrainerFirewall.inspectTransactionBytes(compileV0MessageFast(HOT, bh, [{ programId: TOKEN_2022_PROGRAM_ID, keys: [{ pubkey: ata, isSigner: false, isWritable: true }, { pubkey: rnd(), isSigner: false, isWritable: true }, { pubkey: HOT, isSigner: true, isWritable: false }], data: b }]), { userPubkeyB58: HOT });
      record("A5", "Fix #3 — SPL Transfer & Token-2022 BurnChecked", "CRITICAL", !a1.safe && !a2.safe, `${a1.ruleTriggered} / ${a2.ruleTriggered}`);
    });
    await probe("A6", "Fix #4 — unresolved ALT", "HIGH", async () => {
      const tbl = rnd(); const hidden = rnd();
      const m = compileV0MessageFast(HOT, bh, [{ programId: PUMP_FUN_PROGRAM_ID, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: hidden, isSigner: false, isWritable: true }], data: Buffer.from([1]) }], [{ tableKeyB58: tbl, addressesB58: [hidden] }]);
      const a = BytecodeDrainerFirewall.inspectTransactionBytes(m, { userPubkeyB58: HOT });
      record("A6", "Fix #4 — unresolved ALT", "HIGH", a.ruleTriggered === "RULE_03B_UNRESOLVED_ALT_ACCOUNT", String(a.ruleTriggered));
    });
    await probe("A7", "Fix #8 — path traversal via ../", "HIGH", async () => {
      let held = false;
      try { VaultCryptoEngine.createNewVault(PASS, { vaultFilePath: path.join(os.tmpdir(), "..", "..", "..", "etc", "x.json") }); } catch (e) { held = e.message.includes("PATH_TRAVERSAL"); }
      record("A7", "Fix #8 — path traversal via ../", "HIGH", held, held ? "Blocked" : "Wrote outside sandbox");
    });
    await probe("A8", "Fix #11 — 9-char passphrase", "MEDIUM", async () => {
      let held = false;
      try { VaultCryptoEngine.createNewVault("Abcdefg1!"); } catch (e) { held = e.message.includes("WEAK_PASSPHRASE"); }
      record("A8", "Fix #11 — 9-char passphrase", "MEDIUM", held, held ? "Rejected" : "Accepted");
    });

    // =====================================================================
    // SECTION B — ADVERSARIAL PROBES AGAINST THE NEW FIXES
    // =====================================================================
    console.log("\n── SECTION B: Probes against the 11 new fixes ───────────────────────────");

    await probe("B1", "Fix #1 Origin check — prefix-spoofed origins", "MEDIUM", async () => {
      const r1 = await rpc("wallet_connect", {}, { Origin: "https://celor.cloud.attacker.example" });
      const r2 = await rpc("wallet_connect", {}, { Origin: "http://localhost.attacker.example" });
      const held = r1.statusCode === 403 && r2.statusCode === 403;
      record("B1", "Fix #1 Origin check — prefix-spoofed origins", "MEDIUM", held, `celor.cloud.attacker → HTTP ${r1.statusCode}, localhost.attacker → HTTP ${r2.statusCode} (startsWith() match)`);
    });

    await probe("B2", "Fix #1 — one token grants every privileged method (no scopes)", "CRITICAL", async () => {
      const wsolAta = rnd();
      const vac = await rpc("celor_vacuumRent", { emptyAtas: [{ ataPubkeyB58: wsolAta }], rentDestinationPubkeyB58: attacker });
      const rot = await rpc("celor_rotateQuantumColdVault", { destinationPubkey: attacker, spendLamports: "9000000000", currentColdBalanceLamports: "10000000000" });
      const bypass = Boolean(vac.json.result) && Boolean(rot.json.result);
      record("B2", "Fix #1 — one token grants every privileged method (no scopes)", "CRITICAL", !bypass,
        bypass ? `Signed CloseAccount→attacker (drains WSOL ATAs incl. wrapped balance) AND Cold Vault spend of 9 SOL→attacker with NO passphrase re-auth` : "Privileged calls rejected");
    });

    await probe("B3", "dApp-selectable signing tier (COLD key via wallet_signMessage)", "HIGH", async () => {
      const r = await rpc("wallet_signMessage", { messageUtf8: "Sign in to totally-legit-dex", tier: "COLD" });
      const bypass = r.json.result && r.json.result.publicKey === daemon.bridge.vault.getPublicVaultSummary().quantumColdVault.pubkey;
      record("B3", "dApp-selectable signing tier (COLD key via wallet_signMessage)", "HIGH", !bypass, bypass ? "Request param tier=COLD made the Cold Vault key sign a dApp message" : "Tier pinned");
    });

    await probe("B4", "Fix #9 multi-signer path skips Balance-Floor Guard", "CRITICAL", async () => {
      const co = newSigner();
      const msg = compileV0MessageFast(HOT, bh, [{ programId: unknownProg, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: co.b58, isSigner: true, isWritable: true }], data: Buffer.from([0x66]) }]);
      const r = engine.turboHijackExternalTransaction(wire2(msg, co), { tier: "HOT" });
      const bypass = r.status === "TURBO_HIJACKED_AND_SIGNED" && !r.onChainBalanceFloorGuardAttached;
      record("B4", "Fix #9 multi-signer path skips Balance-Floor Guard", "CRITICAL", !bypass,
        bypass ? "Unverified program + attacker co-signer → signed with NO guard and NO balance required (Fix #10 sidestepped)" : "Guard enforced");
    });

    await probe("B5", "SystemProgram::CreateAccount lamports not counted vs SOL cap", "CRITICAL", async () => {
      const co = newSigner();
      const d = Buffer.alloc(52);
      d.writeUInt32LE(0, 0);
      d.writeBigUInt64LE(50_000_000_000n, 4); // 50 SOL
      d.writeBigUInt64LE(0n, 12);
      decodeB58(SYSTEM_PROGRAM_ID).copy(d, 20);
      const msg = compileV0MessageFast(HOT, bh, [{ programId: SYSTEM_PROGRAM_ID, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: co.b58, isSigner: true, isWritable: true }], data: d }]);
      const r = engine.turboHijackExternalTransaction(wire2(msg, co), { tier: "HOT", maxApprovedSolLamports: 100_000_000n });
      const bypass = r.status === "TURBO_HIJACKED_AND_SIGNED";
      record("B5", "SystemProgram::CreateAccount lamports not counted vs SOL cap", "CRITICAL", !bypass,
        bypass ? `50 SOL moved into an attacker-keyed account; cap was 0.1 SOL; firewall tier=${r.firewallTier}` : "Blocked");
    });

    await probe("B6", "Per-tx SOL cap bypass via wallet_signAllTransactions batch", "HIGH", async () => {
      const txs = Array.from({ length: 5 }, () => compileV0MessageFast(HOT, rnd(), [sysTransfer(HOT, attacker, 1_900_000_000n)]).toString("base64"));
      const r = await rpc("wallet_signAllTransactions", { transactionsBase64: txs });
      const bypass = r.json.result && r.json.result.approved && r.json.result.count === 5;
      record("B6", "Per-tx SOL cap bypass via wallet_signAllTransactions batch", "HIGH", !bypass, bypass ? "5 × 1.9 SOL = 9.5 SOL to one external address approved silently (cap is per-tx, VERIFIED_SAFE tier)" : "Batch capped");
    });

    await probe("B7", "Fix #10 'explicit verified balance' is caller-supplied", "CRITICAL", async () => {
      const msg = compileV0MessageFast(HOT, bh, [{ programId: unknownProg, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: rnd(), isSigner: false, isWritable: true }], data: Buffer.from([1]) }]);
      const r = engine.turboHijackExternalTransaction(msg, { tier: "HOT", currentWalletBalanceLamports: 500_000_000n + 50_000n + 1n, maxApprovedSolLamports: 500_000_000n });
      const neutralized = r.balanceFloorInvariant && / >= 1 lamports$/.test(r.balanceFloorInvariant);
      record("B7", "Fix #10 'explicit verified balance' is caller-supplied", "CRITICAL", !neutralized, neutralized ? `Spoofed balance → floor collapsed to: ${r.balanceFloorInvariant}` : String(r.balanceFloorInvariant));
    });

    await probe("B8", "Token drain via unverified CPI (token floor guard opt-in only)", "HIGH", async () => {
      const ata = rnd();
      const msg = compileV0MessageFast(HOT, bh, [{ programId: unknownProg, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: ata, isSigner: false, isWritable: true }, { pubkey: attacker, isSigner: false, isWritable: true }], data: Buffer.from([7]) }]);
      const r = engine.turboHijackExternalTransaction(msg, { tier: "HOT", userTokenAtas: [ata], currentWalletBalanceLamports: 5_000_000_000n, maxApprovedSolLamports: 100_000_000n });
      const bypass = r.status === "TURBO_HIJACKED_AND_SIGNED";
      record("B8", "Token drain via unverified CPI (token floor guard opt-in only)", "HIGH", !bypass, bypass ? "Known user ATA passed writable to unknown program; only SOL guarded — token floor not auto-derived from userTokenAtas" : "Blocked");
    });

    await probe("B9", "Fix #11 poisoning detector not wired into signing path", "HIGH", async () => {
      const lookalike = COLD.slice(0, 4) + "1".repeat(COLD.length - 8) + COLD.slice(-4);
      const r = await rpc("wallet_signTransaction", { transactionBase64: compileV0MessageFast(HOT, bh, [sysTransfer(HOT, lookalike, 900_000_000n)]).toString("base64") });
      const bypass = r.json.result && r.json.result.approved;
      record("B9", "Fix #11 poisoning detector not wired into signing path", "HIGH", !bypass, bypass ? "0.9 SOL transfer to a 4+4 lookalike of the user's own Cold Vault signed as VERIFIED_SAFE" : "Blocked");
    });

    await probe("B10", "Fix #3 coverage — Token-2022 TransferCheckedWithFee (26/1)", "HIGH", async () => {
      const ata = rnd();
      const d = Buffer.alloc(19); d[0] = 26; d[1] = 1; d.writeBigUInt64LE(1_000_000n, 2); d[10] = 6; d.writeBigUInt64LE(0n, 11);
      const a = BytecodeDrainerFirewall.inspectTransactionBytes(compileV0MessageFast(HOT, bh, [{ programId: TOKEN_2022_PROGRAM_ID, keys: [{ pubkey: ata, isSigner: false, isWritable: true }, { pubkey: rnd(), isSigner: false, isWritable: false }, { pubkey: attacker, isSigner: false, isWritable: true }, { pubkey: HOT, isSigner: true, isWritable: false }], data: d }]), { userPubkeyB58: HOT, userTokenAtas: [ata] });
      record("B10", "Fix #3 coverage — Token-2022 TransferCheckedWithFee (26/1)", "HIGH", !a.safe, a.safe ? `Token-2022 fee-transfer to attacker passed (tier=${a.tier})` : a.ruleTriggered);
    });

    await probe("B11", "Whitelisted DEX output-account redirection (Jupiter)", "HIGH", async () => {
      const a = BytecodeDrainerFirewall.inspectTransactionBytes(compileV0MessageFast(HOT, bh, [{ programId: JUPITER_V6, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: rnd(), isSigner: false, isWritable: true }, { pubkey: attacker, isSigner: false, isWritable: true }], data: crypto.randomBytes(24) }]), { userPubkeyB58: HOT });
      record("B11", "Whitelisted DEX output-account redirection (Jupiter)", "HIGH", !a.safe, a.safe ? `Arbitrary Jupiter ix with attacker-owned output slot = ${a.tier} (no per-program account-role decoding)` : a.ruleTriggered);
    });

    await probe("B12", "Fix #7 lockout race — concurrent unlock burst", "HIGH", async () => {
      const env = JSON.parse(JSON.stringify(daemon.bridge.vault.envelope));
      daemon.bridge.failedUnlockAttempts = 0; daemon.bridge.unlockLockoutUntilMs = 0;
      const burst = await Promise.all(Array.from({ length: 15 }, (_, i) => rpc("wallet_unlockVault", { envelope: env, passphrase: `WrongGuess#${i}xyz` })));
      const realGuesses = burst.filter((r) => r.json.error && !r.json.error.message.includes("RATE_LIMITED")).length;
      record("B12", "Fix #7 lockout race — concurrent unlock burst", "HIGH", realGuesses <= 3, `${realGuesses}/15 guesses actually evaluated with max=3 (check happens before the await)`);
      daemon.bridge.failedUnlockAttempts = 0; daemon.bridge.unlockLockoutUntilMs = 0;
    });

    await probe("B13", "Fix #5 WOTS+ one-time key reuse across restarts → forgery", "CRITICAL", async () => {
      const env = JSON.parse(JSON.stringify(daemon.bridge.vault.envelope));
      const v1 = VaultCryptoEngine.loadVault(env, PASS);
      const v2 = VaultCryptoEngine.loadVault(env, PASS);
      const mA = crypto.randomBytes(200), mB = crypto.randomBytes(200);
      const pA = v1.dualSignTransactionBytes(mA, { tier: "HOT" }).quantumProof; // default slot, sigSeq=0
      const pB = v2.dualSignTransactionBytes(mB, { tier: "HOT" }).quantumProof;
      const reused = pA.slot === pB.slot && pA.sigSeq === pB.sigSeq && pA.notarizeWotsRootHex === pB.notarizeWotsRootHex;
      const sA = QuantumglowAxEngine.computeWotsStepsWithChecksum(Buffer.from(pA.txDigestHex, "hex"));
      const sB = QuantumglowAxEngine.computeWotsStepsWithChecksum(Buffer.from(pB.txDigestHex, "hex"));
      let forged = null, tries = 0;
      const t0 = performance.now();
      for (; reused && tries < 3_000_000; tries++) {
        const m = crypto.randomBytes(48);
        const dg = crypto.createHash("sha256").update(m).digest();
        const s = QuantumglowAxEngine.computeWotsStepsWithChecksum(dg);
        let ok = true;
        for (let c = 0; c < s.length; c++) if (s[c] < Math.min(sA[c], sB[c])) { ok = false; break; }
        if (!ok) continue;
        const elems = [];
        for (let c = 0; c < s.length; c++) {
          const useA = sA[c] <= sB[c];
          const base = Buffer.from((useA ? pA : pB).wotsChainElementsHex[c], "hex");
          const from = useA ? sA[c] : sB[c];
          elems.push(QuantumglowAxEngine.stepWotsChain(base, pA.slot, c, from, s[c] - from).toString("hex"));
        }
        const proof = { ...pA, txDigestHex: dg.toString("hex"), wotsChainElementsHex: elems };
        const v = QuantumglowAxEngine.verifyTransactionQuantumProof(proof, m, { expectedMasterRootHex: pA.masterRootHex, expectedWotsRootHex: pA.notarizeWotsRootHex });
        if (v.verified) { forged = m; break; }
      }
      const ms = (performance.now() - t0).toFixed(0);
      v1.lockAndDestroy(); v2.lockAndDestroy();
      record("B13", "Fix #5 WOTS+ one-time key reuse across restarts → forgery", "CRITICAL", !reused,
        reused ? (forged ? `Same (slot,sigSeq=0) key reused after reload; PINNED-verified forgery for an unsigned message found in ${tries.toLocaleString()} tries / ${ms}ms` : `Key reused after reload (root identical); no forgery in ${tries.toLocaleString()} tries`) : "Distinct one-time keys");
    });

    await probe("B14", "Fix #5 WOTS+ digest binding strength", "HIGH", async () => {
      // Two digests that differ in every byte but share all 16 XOR-folded nibbles produce identical step vectors.
      const d1 = crypto.randomBytes(32), d2 = Buffer.from(d1);
      for (let c = 0; c < 16; c++) { const x = crypto.randomBytes(1)[0]; d2[2 * c] ^= x; d2[2 * c + 1] ^= x; }
      const same = Buffer.compare(Buffer.from(QuantumglowAxEngine.computeWotsStepsWithChecksum(d1)), Buffer.from(QuantumglowAxEngine.computeWotsStepsWithChecksum(d2))) === 0;
      record("B14", "Fix #5 WOTS+ digest binding strength", "HIGH", !same, same ? "Only 64 of 256 digest bits are signed (16 XOR-folded nibbles) → 2^32 collision / 2^64 2nd-preimage; standard w=16 WOTS needs 64+3 chains" : "Full digest bound");
    });

    await probe("B15", "celor_verifyQuantumProof accepts foreign self-consistent proofs", "MEDIUM", async () => {
      const other = new QuantumglowAxEngine(crypto.randomBytes(32));
      const m = Buffer.from("spoofed");
      const pr = other.signTransactionQuantumProof(1, m);
      other.destroy();
      const r = await rpc("celor_verifyQuantumProof", { proof: pr, messageBase64: m.toString("base64") });
      const bypass = r.json.result && r.json.result.verified;
      record("B15", "celor_verifyQuantumProof accepts foreign self-consistent proofs", "MEDIUM", !bypass, bypass ? "Unpinned by default → any attacker key 'verifies' (verifier should pin to vault masterRoot)" : "Pinned");
    });

    await probe("B16", "Fix #6 re-sign amplification per 200ms slot", "HIGH", async () => {
      const posAtas = [];
      for (let i = 0; i < 40; i++) {
        const ata = rnd(); posAtas.push(ata);
        const ix = { programId: PUMP_FUN_PROGRAM_ID, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: ata, isSigner: false, isWritable: true }], data: Buffer.from([i]) };
        engine.registerPositionInOfflineGuard({ mintB58: rnd(), ataPubkeyB58: ata, costBasisSol: 1, tpPct: 100, sell100Instruction: ix, sell50Instruction: ix });
      }
      const seq0 = daemon.bridge.vault.axEngine.sigSeqCounter;
      const t0 = performance.now();
      engine.updateAlpenglowSlotAndBlockhash(engine.currentSlot + 1, rnd());
      const ms = performance.now() - t0;
      const consumed = daemon.bridge.vault.axEngine.sigSeqCounter - seq0;
      record("B16", "Fix #6 re-sign amplification per 200ms slot", "HIGH", ms < 100,
        `40 positions → ${consumed} WOTS one-time keys + Ed25519 sigs burned and ${ms.toFixed(0)}ms event-loop block per slot tick (budget 200ms)`);
      engine.activePositionGuards.clear();
    });

    await probe("B17", "Fix #6 panic re-arm reuses stale balance snapshot", "MEDIUM", async () => {
      engine.armPreSignedPanicEject({ hotWalletSolBalanceLamports: 4_000_000_000n, openPositions: [] });
      engine.updateAlpenglowSlotAndBlockhash(engine.currentSlot + 1, rnd());
      const sweep = engine.preSignedPanicWires.find((w) => w.kind === "QUANTUM_COLD_VAULT_SOL_SWEEP");
      const stale = sweep && sweep.sweptLamports === 3_999_975_000n;
      record("B17", "Fix #6 panic re-arm reuses stale balance snapshot", "MEDIUM", !stale, stale ? "Re-signed sweep still uses the 4 SOL arm-time balance — fails on-chain if balance dropped, strands funds if it grew" : "Balance refreshed");
    });

    await probe("B18", "Fix #10 round-trip guard links Hot Wallet ↔ Stealth Burner #0 on-chain", "MEDIUM", async () => {
      const msg = compileV0MessageFast(HOT, bh, [{ programId: unknownProg, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }], data: Buffer.from([1]) }]);
      const r = engine.turboHijackExternalTransaction(msg, { tier: "HOT", currentWalletBalanceLamports: 5_000_000_000n, maxApprovedSolLamports: 100_000_000n });
      const linked = r.wireTransaction.includes(decodeB58(BURNER0));
      record("B18", "Fix #10 round-trip guard links Hot Wallet ↔ Stealth Burner #0 on-chain", "MEDIUM", !linked, linked ? "Burner #0 co-signs every guarded dApp tx → Bubblemaps/Cielo cluster Hot+Burner instantly (defeats stealth burners)" : "No linkage");
    });

    // =====================================================================
    // SECTION C — FUZZ & LOAD
    // =====================================================================
    console.log("\n── SECTION C: Fuzz & load ───────────────────────────────────────────────");

    await probe("C1", "Random-buffer fuzz (20,000 payloads)", "HIGH", async () => {
      let uncaught = 0, falseSafe = 0;
      const t0 = performance.now();
      for (let i = 0; i < 20000; i++) {
        try {
          const r = BytecodeDrainerFirewall.inspectTransactionBytes(crypto.randomBytes(1 + (i % 600)), { userPubkeyB58: HOT });
          if (r.safe) falseSafe++;
        } catch (_) { uncaught++; }
      }
      const ms = performance.now() - t0;
      record("C1", "Random-buffer fuzz (20,000 payloads)", "HIGH", uncaught === 0, `${uncaught} uncaught exceptions, ${falseSafe} parsed-as-safe, ${(ms * 1000 / 20000).toFixed(1)}µs/tx`);
    });

    await probe("C2", "Bit-flip mutation fuzz of a valid swap (10,000 mutants)", "HIGH", async () => {
      const ata = rnd();
      const base = compileV0MessageFast(HOT, bh, [{ programId: PUMP_FUN_PROGRAM_ID, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: ata, isSigner: false, isWritable: true }], data: Buffer.from("66063d1201daebea00e1f505", "hex") }]);
      let uncaught = 0, mutatedSafeSigned = 0, signErrors = 0;
      for (let i = 0; i < 10000; i++) {
        const m = Buffer.from(base);
        const flips = 1 + (i % 4);
        for (let f = 0; f < flips; f++) m[crypto.randomInt(m.length)] ^= 1 << crypto.randomInt(8);
        try {
          const r = BytecodeDrainerFirewall.inspectTransactionBytes(m, { userPubkeyB58: HOT });
          if (r.safe && i % 50 === 0) {
            try { engine.turboHijackExternalTransaction(m, { tier: "HOT", currentWalletBalanceLamports: 5_000_000_000n }); mutatedSafeSigned++; } catch (_) { signErrors++; }
          }
        } catch (_) { uncaught++; }
      }
      record("C2", "Bit-flip mutation fuzz of a valid swap (10,000 mutants)", "HIGH", uncaught === 0, `${uncaught} uncaught in firewall; sampled safe-mutants signed=${mutatedSafeSigned}, signer threw (handled)=${signErrors}`);
    });

    await probe("C3", "Async PBKDF2 keeps event loop responsive under 8 concurrent unlocks", "MEDIUM", async () => {
      const env = JSON.parse(JSON.stringify(daemon.bridge.vault.envelope));
      daemon.bridge.maxFailedUnlockAttempts = 1000;
      const burst = Promise.all(Array.from({ length: 8 }, (_, i) => rpc("wallet_unlockVault", { envelope: env, passphrase: `Wrong#${i}abcdef` })));
      const lat = [];
      for (let i = 0; i < 5; i++) lat.push(await getHealth(daemon.url));
      await burst;
      daemon.bridge.maxFailedUnlockAttempts = 3; daemon.bridge.failedUnlockAttempts = 0; daemon.bridge.unlockLockoutUntilMs = 0;
      const worst = Math.max(...lat);
      record("C3", "Async PBKDF2 keeps event loop responsive under 8 concurrent unlocks", "MEDIUM", worst < 100, `worst /health latency during burst = ${worst.toFixed(1)}ms`);
    });

    await probe("C4", "HTTP load — 300 concurrent authenticated signTransaction", "MEDIUM", async () => {
      const t0 = performance.now();
      const reqs = await Promise.all(Array.from({ length: 300 }, () => rpc("wallet_signTransaction", { transactionBase64: compileV0MessageFast(HOT, rnd(), [{ programId: PUMP_FUN_PROGRAM_ID, keys: [{ pubkey: HOT, isSigner: true, isWritable: true }, { pubkey: rnd(), isSigner: false, isWritable: true }], data: Buffer.from([1, 2, 3]) }]).toString("base64") })));
      const ms = performance.now() - t0;
      const ok = reqs.filter((r) => r.json && r.json.result && r.json.result.approved).length;
      record("C4", "HTTP load — 300 concurrent authenticated signTransaction", "MEDIUM", ok === 300, `${ok}/300 signed in ${ms.toFixed(0)}ms (${(300000 / ms).toFixed(0)} tx/s), server alive`);
    });

    await probe("C5", "Oversized 2 MB body", "LOW", async () => {
      const big = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "wallet_connect", params: { pad: "A".repeat(2 * 1024 * 1024) } });
      const r = await post(daemon.url, big, T);
      const alive = await getHealth(daemon.url).then(() => true).catch(() => false);
      record("C5", "Oversized 2 MB body", "LOW", r.statusCode === 413 && alive, `HTTP ${r.statusCode}, server alive=${alive}`);
    });
  } finally {
    await daemon.close();
  }

  // =====================================================================
  // SCOREBOARD
  // =====================================================================
  const bypasses = results.filter((r) => r.status === "BYPASS");
  const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  console.log("\n==========================================================================");
  console.log(`📊 SCOREBOARD: ${results.length} probes — ${results.length - bypasses.length} HELD, ${bypasses.length} BYPASS`);
  for (const s of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
    const n = bypasses.filter((b) => b.severity === s).length;
    if (n) console.log(`   ${s.padEnd(8)}: ${n}`);
  }
  console.log("--------------------------------------------------------------------------");
  bypasses.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]).forEach((b) => console.log(`   🔴 ${b.id.padEnd(4)} ${b.severity.padEnd(8)} ${b.target}`));
  console.log("==========================================================================");
  fs.writeFileSync(path.join(os.tmpdir(), "celor_audit_v2_results.json"), JSON.stringify(results, null, 2));
}

main().catch((e) => {
  console.error("Audit harness error:", e);
  process.exit(1);
});

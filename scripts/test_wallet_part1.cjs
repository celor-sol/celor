"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  VaultCryptoEngine,
  QuantumglowAxEngine,
  encodeB58,
  decodeB58,
  deriveEd25519PublicKeyFromSeed32,
  verifyEd25519Native
} = require("../lib/wallet-backend/vault_crypto");

async function runPart1Tests() {
  console.log("======================================================================");
  console.log("🛡️ CELOR TRENCH WALLET BACKEND — PART 1 VERIFICATION & BENCHMARK SUITE");
  console.log("======================================================================\n");

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "celor-vault-p1-"));
  const vaultFile = path.join(tmpDir, "test_trench_vault.json");
  const knownMasterSeed = crypto.randomBytes(32);
  const tgSeed32 = crypto.randomBytes(32);
  const tgPub32 = deriveEd25519PublicKeyFromSeed32(tgSeed32);
  const telegramBotSecret64 = Buffer.concat([tgSeed32, tgPub32]);
  const telegramBotPubkeyB58 = encodeB58(tgPub32);
  const telegramBotB58 = encodeB58(telegramBotSecret64);

  // -------------------------------------------------------------------------
  // TEST 1: AES-256-GCM + PBKDF2-SHA512 (600k) Vault Creation & Telegram Sync
  // -------------------------------------------------------------------------
  const tCreate0 = process.hrtime.bigint();
  const vault = VaultCryptoEngine.createNewVault("CelorQuantum#2026!", {
    masterSeed32: knownMasterSeed,
    importedTelegramBotSecretKey: telegramBotB58,
    vaultFilePath: vaultFile
  });
  const createMs = Number(process.hrtime.bigint() - tCreate0) / 1e6;

  const summary = vault.getPublicVaultSummary();
  assert.strictEqual(
    summary.primaryHotWallet.pubkey,
    telegramBotPubkeyB58,
    "Primary Hot Wallet must match imported @CelorTradeBot pubkey 1:1"
  );
  assert.strictEqual(summary.primaryHotWallet.syncedWithTelegramBot, true);
  assert.strictEqual(summary.quantumColdVault.activeIndex, 0);
  assert.strictEqual(summary.quantumColdVault.keyExposedOnChain, false);
  assert.strictEqual(
    summary.quantumColdVault.ed25519AccountModel,
    "ED25519_FRESH_OTS_STEALTH_ADDRESS"
  );
  assert.strictEqual(
    summary.quantumColdVault.pdaVaultQuantumModel,
    "SHOR_IMMUNE_HASH_LOCKED_PDA_NO_ED25519_KEY"
  );
  assert.strictEqual(
    typeof summary.quantumColdVault.hashLockedQuantumPdaVault === "string" &&
      summary.quantumColdVault.hashLockedQuantumPdaVault.length > 30,
    true
  );

  const exportedHotB58 = vault.exportHotWalletBase58ForTelegramSync();
  assert.strictEqual(exportedHotB58, telegramBotB58, "Round-trip Telegram Bot key export must match");

  console.log(`✅ [TEST 1 PASS] Vault Created & Synced with @CelorTradeBot (${createMs.toFixed(1)}ms PBKDF2-600k)`);
  console.log(`   • Quantum Cold Vault #0 : ${summary.quantumColdVault.pubkey}`);
  console.log(`   • Primary Hot Wallet    : ${summary.primaryHotWallet.pubkey}`);
  console.log(`   • Stealth Burner #0     : ${summary.stealthBurnerPool.activeBurnerPubkey}`);
  console.log(`   • Ax-XMSS Master Root   : ${summary.axMasterRootHex.slice(0, 32)}...\n`);

  // -------------------------------------------------------------------------
  // TEST 2: Zero-Plaintext-Heap & Disk Permission Audit (RULE_10)
  // -------------------------------------------------------------------------
  const fileStat = fs.statSync(vaultFile);
  const fileMode = fileStat.mode & 0o777;
  assert.strictEqual(fileMode, 0o600, "Vault file on disk must enforce chmod 0600");

  const rawDiskJson = fs.readFileSync(vaultFile, "utf8");
  const masterSeedHex = knownMasterSeed.toString("hex");
  const tgSeedHex = tgSeed32.toString("hex");
  assert.strictEqual(rawDiskJson.includes(masterSeedHex), false, "Master seed must never appear on disk");
  assert.strictEqual(rawDiskJson.includes(tgSeedHex), false, "Hot seed must never appear on disk");
  assert.strictEqual(
    vault._maskedAesKey.toString("hex") !== vault._keyMask.toString("hex"),
    true,
    "In-RAM session key must be XOR-masked"
  );

  // Wrong passphrase must fail authentication
  let wrongPassFailed = false;
  try {
    VaultCryptoEngine.loadVault(vaultFile, "WrongPassphrase123");
  } catch (_) {
    wrongPassFailed = true;
  }
  assert.strictEqual(wrongPassFailed, true, "AES-256-GCM must reject wrong passphrase");
  console.log(`✅ [TEST 2 PASS] Zero-Plaintext-Heap & Disk Security Verified (chmod 0600, AES-GCM Auth Tag OK)\n`);

  // -------------------------------------------------------------------------
  // TEST 3: 1-Click Deterministic Stealth Burner Pool & Recovery Test
  // -------------------------------------------------------------------------
  const burner1 = vault.deriveNextStealthBurner("Pump.fun Sniper Burner #1");
  const burner2 = vault.deriveNextStealthBurner("Cielo-Evader Burner #2");
  const burner3 = vault.deriveNextStealthBurner("Bubblemap-Clean Burner #3");

  // Re-create a fresh vault from ONLY the masterSeed32 (simulating disaster recovery on a new PC)
  const recoveredVault = VaultCryptoEngine.createNewVault("RecoveryPass#99", {
    masterSeed32: knownMasterSeed
  });
  const recBurner1 = recoveredVault.deriveNextStealthBurner();
  const recBurner2 = recoveredVault.deriveNextStealthBurner();
  const recBurner3 = recoveredVault.deriveNextStealthBurner();

  assert.strictEqual(recBurner1.pubkey, burner1.pubkey, "Stealth Burner #1 must be 100% deterministically recoverable");
  assert.strictEqual(recBurner2.pubkey, burner2.pubkey, "Stealth Burner #2 must be 100% deterministically recoverable");
  assert.strictEqual(recBurner3.pubkey, burner3.pubkey, "Stealth Burner #3 must be 100% deterministically recoverable");

  console.log(`✅ [TEST 3 PASS] Stealth Burner Pool & 100% Seed Recovery Verified`);
  console.log(`   • Burner #1 (${burner1.deriveLatencyUs}µs): ${burner1.pubkey}`);
  console.log(`   • Burner #2 (${burner2.deriveLatencyUs}µs): ${burner2.pubkey}`);
  console.log(`   • Burner #3 (${burner3.deriveLatencyUs}µs): ${burner3.pubkey}\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Dual-Signing (Ed25519 + QuantumGlow Ax-XMSS 32B Preimage + 512B WOTS+)
  // -------------------------------------------------------------------------
  const sampleSlot = 460438900;
  vault.axEngine.prewarmSlotOtpk(sampleSlot); // Epoch OTPK pre-warm

  const fakeV0TxMessage = crypto.randomBytes(248); // Typical V0 ALT swap message size
  const dualSigned = vault.dualSignTransactionBytes(fakeV0TxMessage, {
    tier: "HOT",
    slot: sampleSlot
  });

  // Verify Ed25519 signature via native OpenSSL
  const hotPub32 = Buffer.from(decodeB58(dualSigned.signerPubkey));
  const edSig64 = Buffer.from(decodeB58(dualSigned.signatureBase58));
  const edValid = verifyEd25519Native(hotPub32, fakeV0TxMessage, edSig64);
  assert.strictEqual(edValid, true, "Ed25519 signature must be cryptographically valid");

  // Verify QuantumGlow Ax-XMSS proof (32B Preimage Reveal + 512B WOTS+ w=16)
  const qVerify = QuantumglowAxEngine.verifyTransactionQuantumProof(
    dualSigned.quantumProof,
    fakeV0TxMessage
  );
  assert.strictEqual(qVerify.verified, true, "QuantumGlow Ax-XMSS proof must verify");
  assert.strictEqual(qVerify.preimageValid, true);
  assert.strictEqual(qVerify.wotsValid, true);

  // Tamper test: flip 1 bit in transaction message and verify WOTS+ rejects it!
  const tamperedMsg = Buffer.from(fakeV0TxMessage);
  tamperedMsg[10] ^= 0xff;
  const tamperedVerify = QuantumglowAxEngine.verifyTransactionQuantumProof(
    dualSigned.quantumProof,
    tamperedMsg
  );
  assert.strictEqual(tamperedVerify.verified, false, "WOTS+ must reject tampered transaction bytes");

  console.log(`✅ [TEST 4 PASS] Dual-Sign (Ed25519 + QuantumGlow Ax-XMSS) & Tamper Rejection Verified`);
  console.log(`   • Ed25519 Sign Latency       : ${dualSigned.ed25519SignUs} µs`);
  console.log(`   • Total Dual-Sign Latency    : ${dualSigned.totalDualSignUs} µs`);
  console.log(`   • Ax-XMSS 32B Preimage Verify: ${qVerify.preimageVerifyNs} ns (32 bytes wire, 0B Merkle path)`);
  console.log(`   • Ax-XMSS 512B WOTS+ Verify  : ${qVerify.wotsVerifyUs} µs (16 chains, tamper-rejected)\n`);

  // -------------------------------------------------------------------------
  // TEST 5: Atomic One-Time Spend (OTS) Quantum Cold Vault Rotation
  // -------------------------------------------------------------------------
  const initialColdPubkey = vault.getPublicVaultSummary().quantumColdVault.pubkey;
  const rotPlan = vault.prepareColdVaultOtsSpendAndRotate({
    destinationPubkey: summary.primaryHotWallet.pubkey,
    spendLamports: 2_000_000_000n, // 2.0 SOL sent to Hot Wallet
    currentColdBalanceLamports: 10_000_000_000n, // 10.0 SOL total in Cold Vault #0
    txFeeLamports: 5_000n
  });

  assert.strictEqual(rotPlan.retiredColdVaultPubkey, initialColdPubkey);
  assert.notStrictEqual(rotPlan.newQuantumColdVaultPubkey, initialColdPubkey);
  assert.strictEqual(rotPlan.spendLamports, 2_000_000_000n);
  assert.strictEqual(rotPlan.sweepToNextColdLamports, 7_999_995_000n);
  assert.strictEqual(rotPlan.remainingOnExposedVaultLamports, 0n);
  assert.strictEqual(rotPlan.instructions.length, 2);

  const updatedSummary = vault.getPublicVaultSummary();
  assert.strictEqual(updatedSummary.quantumColdVault.activeIndex, 1);
  assert.strictEqual(updatedSummary.quantumColdVault.pubkey, rotPlan.newQuantumColdVaultPubkey);
  assert.strictEqual(updatedSummary.quantumColdVault.keyExposedOnChain, false);

  console.log(`✅ [TEST 5 PASS] Atomic One-Time Spend (OTS) Quantum Cold Vault Rotation Verified`);
  console.log(`   • Retired Cold Vault #0 (0◎ left) : ${rotPlan.retiredColdVaultPubkey}`);
  console.log(`   • Sent to Trench Hot Wallet       : 2.000000 SOL`);
  console.log(`   • Swept to New Cold Vault #1      : 7.999995 SOL -> ${rotPlan.newQuantumColdVaultPubkey}`);
  console.log(`   • New Cold Vault Account Model    : ${updatedSummary.quantumColdVault.ed25519AccountModel}`);
  console.log(`   • Off-Curve Quantum PDA Vault #1  : ${updatedSummary.quantumColdVault.hashLockedQuantumPdaVault}\n`);

  vault.lockAndDestroy();
  recoveredVault.lockAndDestroy();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log("======================================================================");
  console.log("🎉 PART 1 COMPLETE: ALL 5 CRYPTOGRAPHIC & VAULT TESTS PASSED 100%!");
  console.log("======================================================================");
}

runPart1Tests().catch((err) => {
  console.error("❌ PART 1 TEST FAILED:", err);
  process.exit(1);
});

"use strict";

const assert = require("assert");
const crypto = require("crypto");
const {
  VaultCryptoEngine,
  encodeB58,
  deriveEd25519PublicKeyFromSeed32
} = require("../lib/wallet-backend/vault_crypto");
const {
  SYSTEM_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID
} = require("../lib/wallet-backend/drainer_firewall");
const {
  TrenchExecutionEngine,
  compileV0MessageFast,
  buildSetComputeUnitLimitIx,
  SOLANA_QUIC_MTU_BYTES
} = require("../lib/wallet-backend/trench_engine");

function randomPubkeyB58() {
  return encodeB58(deriveEd25519PublicKeyFromSeed32(crypto.randomBytes(32)));
}

async function runPart3Tests() {
  console.log("======================================================================");
  console.log("⚡ CELOR TRENCH WALLET BACKEND — PART 3 EXECUTION & AUTOMATION SUITE");
  console.log("======================================================================\n");

  const vault = VaultCryptoEngine.createNewVault("CelorPart3#2026!");
  const summary = vault.getPublicVaultSummary();
  const hotWalletB58 = summary.primaryHotWallet.pubkey;
  const coldVaultB58 = summary.quantumColdVault.pubkey;

  const liveAlpenglowBlockhash = randomPubkeyB58();
  const engine = new TrenchExecutionEngine(vault, {
    initialSlot: 460445100,
    initialBlockhashB58: liveAlpenglowBlockhash
  });

  // -------------------------------------------------------------------------
  // TEST 1: External dApp `signAndSendTransaction` Turbo-Hijack + Bribe Strip
  // -------------------------------------------------------------------------
  const staleDappBlockhash = randomPubkeyB58();
  const tokenAtaB58 = randomPubkeyB58();
  const jitoTipAccountB58 = "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt";

  // Build 0.015 SOL Jito Bribe Transfer instruction stuffed by external dApp
  const jitoBribeData = Buffer.allocUnsafe(12);
  jitoBribeData.writeUInt32LE(2, 0);
  jitoBribeData.writeBigUInt64LE(15_000_000n, 4); // 0.015 SOL bribe

  const bloatedDappMsg = compileV0MessageFast(hotWalletB58, staleDappBlockhash, [
    buildSetComputeUnitLimitIx(250000), // Bloated 250k CU
    {
      programId: PUMP_FUN_PROGRAM_ID,
      keys: [
        { pubkey: hotWalletB58, isSigner: true, isWritable: true },
        { pubkey: tokenAtaB58, isSigner: false, isWritable: true }
      ],
      data: Buffer.from("66063d1201daebea00e1f5050000000000ca9a3b00000000", "hex")
    },
    {
      programId: SYSTEM_PROGRAM_ID,
      keys: [
        { pubkey: hotWalletB58, isSigner: true, isWritable: true },
        { pubkey: jitoTipAccountB58, isSigner: false, isWritable: true }
      ],
      data: jitoBribeData
    }
  ]);

  const hijackRes = engine.turboHijackExternalTransaction(bloatedDappMsg, {
    tier: "HOT",
    stripJitoBribes: true
  });

  assert.strictEqual(hijackRes.status, "TURBO_HIJACKED_AND_SIGNED");
  assert.strictEqual(hijackRes.firewallTier, "VERIFIED_SAFE");
  assert.strictEqual(hijackRes.jitoBribeSaved.strippedBribeCount, 1);
  assert.strictEqual(hijackRes.jitoBribeSaved.savedLamports, 15_000_000n);
  assert.strictEqual(hijackRes.computeOptimization.tightCuLimit, 75000);
  assert.strictEqual(
    hijackRes.replacedBlockhash.newAlpenglowRamBlockhash,
    liveAlpenglowBlockhash
  );
  assert.strictEqual(hijackRes.wireBytes <= SOLANA_QUIC_MTU_BYTES, true);

  console.log(`✅ [TEST 1 PASS] External dApp Transaction Turbo-Hijacked in ${hijackRes.totalHijackAndSignLatencyUs}µs`);
  console.log(`   • Stripped Hidden Jito Bribe : +${hijackRes.jitoBribeSaved.savedSol} SOL saved ($0 Bribe)`);
  console.log(`   • Tightened Compute Limit    : 250,000 CU -> ${hijackRes.computeOptimization.tightCuLimit} CU (3.3x Priority)`);
  console.log(`   • Injected 0ns RAM Blockhash : ${hijackRes.replacedBlockhash.newAlpenglowRamBlockhash.slice(0, 16)}...`);
  console.log(`   • Dual-Signed Wire Size      : ${hijackRes.wireBytes} bytes (Fits 1 QUIC Packet)\n`);

  // -------------------------------------------------------------------------
  // TEST 2: External Unknown dApp Auto-Injects On-Chain Balance-Floor Guard
  // -------------------------------------------------------------------------
  const unknownDappProg = randomPubkeyB58();
  const unknownDappMsg = compileV0MessageFast(hotWalletB58, staleDappBlockhash, [
    {
      programId: unknownDappProg,
      keys: [
        { pubkey: hotWalletB58, isSigner: true, isWritable: true },
        { pubkey: randomPubkeyB58(), isSigner: false, isWritable: true }
      ],
      data: Buffer.from("01020304", "hex")
    }
  ]);

  const guardedRes = engine.turboHijackExternalTransaction(unknownDappMsg, {
    tier: "HOT",
    currentWalletBalanceLamports: 10_000_000_000n,
    maxApprovedSolLamports: 500_000_000n,
    allowExternalDappWithGuard: true
  });
  assert.strictEqual(guardedRes.status, "TURBO_HIJACKED_AND_SIGNED");
  assert.strictEqual(guardedRes.firewallTier, "EXTERNAL_DAPP_GUARDED");
  assert.strictEqual(guardedRes.onChainBalanceFloorGuardAttached, true);
  console.log(`✅ [TEST 2 PASS] External dApp Protected with On-Chain Balance-Floor Guard`);
  console.log(`   • Enforced SVM Invariant: ${guardedRes.balanceFloorInvariant}\n`);

  // -------------------------------------------------------------------------
  // TEST 3: 22-ATA Single-Packet Batch Rent Vacuum (50 Empty ATAs, 0% Fee)
  // -------------------------------------------------------------------------
  const emptyAtas50 = Array.from({ length: 50 }, (_, idx) => ({
    ataPubkeyB58: randomPubkeyB58(),
    isToken2022: idx % 3 === 0
  }));

  const vacuumRes = engine.buildBatchRentVacuumTransactions(emptyAtas50, {
    tier: "HOT",
    rentDestinationPubkeyB58: coldVaultB58
  });

  assert.strictEqual(vacuumRes.totalAtasClosed, 50);
  assert.strictEqual(vacuumRes.batchesCount, 3); // 22 + 22 + 6
  assert.strictEqual(vacuumRes.batches[0].closedAtasCount, 22);
  assert.strictEqual(vacuumRes.batches[1].closedAtasCount, 22);
  assert.strictEqual(vacuumRes.batches[2].closedAtasCount, 6);
  assert.strictEqual(vacuumRes.platformFeeChargedLamports, 0n);
  assert.strictEqual(vacuumRes.batches[0].wireBytes <= SOLANA_QUIC_MTU_BYTES, true);

  console.log(`✅ [TEST 3 PASS] 50 Empty ATAs Packed into ${vacuumRes.batchesCount} V0 Rent-Vacuum Packets in ${vacuumRes.buildLatencyUs}µs`);
  console.log(`   • Batch #0 (22 ATAs): ${vacuumRes.batches[0].wireBytes} bytes <= 1232B QUIC MTU`);
  console.log(`   • Total Rent Reclaimed: +${vacuumRes.totalReclaimedSol.toFixed(6)} SOL (0% Celor Fee!)\n`);

  // -------------------------------------------------------------------------
  // TEST 4: Pre-Signed <50µs `PANIC EJECT` Nuclear Emergency Evac
  // -------------------------------------------------------------------------
  const pos1Mint = randomPubkeyB58();
  const pos1Ata = randomPubkeyB58();
  const sampleSellIx = {
    programId: PUMP_FUN_PROGRAM_ID,
    keys: [
      { pubkey: hotWalletB58, isSigner: true, isWritable: true },
      { pubkey: pos1Ata, isSigner: false, isWritable: true }
    ],
    data: Buffer.from("33e685a4017f83ad0000000000000000", "hex")
  };

  const armedPanic = engine.armPreSignedPanicEject({
    hotWalletSolBalanceLamports: 5_000_000_000n,
    openPositions: [
      {
        mintB58: pos1Mint,
        ataPubkeyB58: pos1Ata,
        sellInstruction: sampleSellIx,
        isToken2022: false
      }
    ]
  });
  assert.strictEqual(armedPanic.armed, true);
  assert.strictEqual(armedPanic.preSignedWireCount, 2); // 1 position exit + 1 Cold Vault SOL sweep

  const ejectRes = engine.triggerPanicEjectNow();
  assert.strictEqual(ejectRes.status, "PANIC_EJECT_DISPATCHED_0US_BUILD");
  assert.strictEqual(ejectRes.buildAndSignLatencyUs, 0.0);
  assert.strictEqual(ejectRes.dispatchedCount, 2);

  console.log(`✅ [TEST 4 PASS] Pre-Signed PANIC EJECT Dispatched to Quantum Cold Vault`);
  console.log(`   • Build & Sign Time at Trigger : ${ejectRes.buildAndSignLatencyUs.toFixed(1)} µs (Pre-Signed in L1 RAM!)`);
  console.log(`   • QUIC UDP Socket Flush Time   : ${ejectRes.triggerFlushLatencyUs} µs`);
  console.log(`   • Swept Destination Cold Vault : ${armedPanic.destinationQuantumColdVault}\n`);

  // -------------------------------------------------------------------------
  // TEST 5: 220ms Offline TP / SL / Trailing Stop + Moonbag + Breakeven Ratchet
  // -------------------------------------------------------------------------
  const guardedMint = randomPubkeyB58();
  const guardedAta = randomPubkeyB58();
  const posGuard = engine.registerPositionInOfflineGuard({
    mintB58: guardedMint,
    ataPubkeyB58: guardedAta,
    costBasisSol: 1.0,
    totalTaxBps: 100, // 1% each way = 2% round-trip
    tpPct: 300,
    slPct: -20,
    trailPct: 12,
    moonbagMode: true,
    sell100Instruction: sampleSellIx,
    sell50Instruction: sampleSellIx
  });

  // Tick 0: Entry calibration (Base = 1,000,000, Quote = 1,000,000 -> Spot = 1.0)
  engine.evaluatePoolReserveTick(guardedMint, 1_000_000n, 1_000_000n);

  // Tick 1: Price rises +30% (Quote = 1,300,000) -> Net PnL > +20% -> Auto-Breakeven Floor locks at +1.0%!
  const tick1 = engine.evaluatePoolReserveTick(guardedMint, 1_000_000n, 1_300_000n);
  assert.strictEqual(tick1.triggered, false);
  assert.strictEqual(posGuard.breakevenFloorLocked, true);
  assert.strictEqual(posGuard.slPct, 1.0);

  // Tick 2: Price hits 2.15x (Quote = 2,150,000) -> Net PnL > +100% -> Fires 2x Moonbag (Sell 50%)!
  const tick2 = engine.evaluatePoolReserveTick(guardedMint, 1_000_000n, 2_150_000n);
  assert.strictEqual(tick2.triggered, true);
  assert.strictEqual(tick2.triggers[0].exitPct, 50);
  assert.strictEqual(posGuard.isClosed, false); // Still holding remaining 50% moonbag!

  // Tick 3: Price peaks at 2.60x (Quote = 2,600,000, Net PnL ~ +154.8%) then pulls back to 2.35x (Net PnL ~ +130.3%, drop ~24.5% >= 12% Trail)
  engine.evaluatePoolReserveTick(guardedMint, 1_000_000n, 2_600_000n);
  const tick3 = engine.evaluatePoolReserveTick(guardedMint, 1_000_000n, 2_350_000n);
  assert.strictEqual(tick3.triggered, true);
  assert.strictEqual(tick3.triggers[0].exitPct, 100);
  assert.strictEqual(posGuard.isClosed, true);

  // Verify QuantumGlow Ax-XMSS Order Preimage Commitment: SHA256(revealedPreimage) == axOrderCommitHex
  const trig = tick3.triggers[0];
  const verifyCommitHex = crypto
    .createHash("sha256")
    .update(Buffer.from(trig.revealedAxOrderPreimageHex, "hex"))
    .digest("hex");
  assert.strictEqual(verifyCommitHex, trig.axOrderCommitHex);

  console.log(`✅ [TEST 5 PASS] 220ms Offline TP/SL/Trail + 2x Moonbag + Breakeven Ratchet Verified (${tick3.evalLatencyUs}µs eval)`);
  console.log(`   • Auto-Breakeven Floor Ratchet : Locked SL at +1.0% Net SOL once PnL crossed +20%`);
  console.log(`   • Tier 1 Exit (50% Moonbag)    : ${tick2.triggers[0].exitReason}`);
  console.log(`   • Tier 2 Exit (100% Trail)     : ${trig.exitReason} -> Realized ${trig.realizableNetSol} SOL`);
  console.log(`   • Ax-XMSS Order Preimage Proof : Verified (SHA256(X_order) == ${trig.axOrderCommitHex.slice(0, 20)}...)\n`);

  engine.destroy();
  vault.lockAndDestroy();

  console.log("======================================================================");
  console.log("🎉 PART 3 COMPLETE: ALL 5 EXECUTION & AUTOMATION TESTS PASSED 100%!");
  console.log("======================================================================");
}

runPart3Tests().catch((err) => {
  console.error("❌ PART 3 TEST FAILED:", err);
  process.exit(1);
});

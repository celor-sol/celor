"use strict";

const assert = require("assert");
const crypto = require("crypto");
const {
  encodeB58,
  decodeB58,
  deriveEd25519PublicKeyFromSeed32
} = require("../lib/wallet-backend/vault_crypto");
const {
  BytecodeDrainerFirewall,
  SYSTEM_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID
} = require("../lib/wallet-backend/drainer_firewall");

/**
 * Helper to compile a raw V0 (0x80) Solana TransactionMessage for red-team drainer testing.
 */
function buildTestV0Message(payerB58, blockhashB58, instructions) {
  const writableUnsigned = [];
  const readonlyUnsigned = [];
  const metaMap = new Map();
  const programSet = new Set();

  metaMap.set(payerB58, { b58: payerB58, isSigner: true, isWritable: true });

  for (const ix of instructions) {
    programSet.add(ix.programId);
    if (!metaMap.has(ix.programId)) {
      metaMap.set(ix.programId, { b58: ix.programId, isSigner: false, isWritable: false });
    }
    for (const k of ix.keys) {
      const m = metaMap.get(k.pubkey);
      if (!m) {
        metaMap.set(k.pubkey, {
          b58: k.pubkey,
          isSigner: Boolean(k.isSigner),
          isWritable: Boolean(k.isWritable)
        });
      } else {
        if (k.isSigner) m.isSigner = true;
        if (k.isWritable) m.isWritable = true;
      }
    }
  }

  for (const [b58, m] of metaMap.entries()) {
    if (b58 === payerB58) continue;
    if (m.isWritable) writableUnsigned.push(m);
    else readonlyUnsigned.push(m);
  }

  const staticKeys = [
    metaMap.get(payerB58),
    ...writableUnsigned,
    ...readonlyUnsigned
  ];
  const idxMap = new Map();
  staticKeys.forEach((k, idx) => idxMap.set(k.b58, idx));

  const chunks = [];
  // 0x80 (V0) + 3B header + staticKeys count
  chunks.push(
    Buffer.from([
      0x80,
      1, // 1 signer
      0, // 0 readonly signed
      readonlyUnsigned.length,
      staticKeys.length
    ])
  );
  for (const k of staticKeys) {
    chunks.push(decodeB58(k.b58));
  }
  chunks.push(decodeB58(blockhashB58));
  chunks.push(Buffer.from([instructions.length]));

  for (const ix of instructions) {
    chunks.push(Buffer.from([idxMap.get(ix.programId)]));
    chunks.push(Buffer.from([ix.keys.length]));
    chunks.push(Buffer.from(ix.keys.map((k) => idxMap.get(k.pubkey))));
    chunks.push(Buffer.from([ix.data.length]));
    chunks.push(Buffer.from(ix.data));
  }
  // 0 ALT lookups
  chunks.push(Buffer.from([0]));
  return Buffer.concat(chunks);
}

function randomPubkeyB58() {
  return encodeB58(deriveEd25519PublicKeyFromSeed32(crypto.randomBytes(32)));
}

async function runPart2RedTeamSuite() {
  console.log("======================================================================");
  console.log("🛡️ CELOR TRENCH WALLET BACKEND — PART 2 ANTI-DRAINER RED-TEAM SUITE");
  console.log("======================================================================\n");

  const userWalletB58 = randomPubkeyB58();
  const userSafeColdVaultB58 = randomPubkeyB58();
  const userTokenAtaB58 = randomPubkeyB58();
  const hackerWalletB58 = randomPubkeyB58();
  const hackerProgramB58 = randomPubkeyB58();
  const recentBlockhashB58 = randomPubkeyB58();

  // Warm V8 JIT once
  const warmupTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: COMPUTE_BUDGET_PROGRAM_ID,
      keys: [],
      data: Buffer.from([2, 0x40, 0x0d, 0x03, 0x00])
    }
  ]);
  BytecodeDrainerFirewall.inspectTransactionBytes(warmupTx, { userPubkeyB58: userWalletB58 });

  // -------------------------------------------------------------------------
  // ATTACK 1 (RULE_01): SystemProgram::Assign Account Ownership Hijack
  // -------------------------------------------------------------------------
  const assignData = Buffer.allocUnsafe(36);
  assignData.writeUInt32LE(1, 0); // SystemInstruction::Assign = 1
  decodeB58(hackerProgramB58).copy(assignData, 4);

  const assignDrainerTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: SYSTEM_PROGRAM_ID,
      keys: [{ pubkey: userWalletB58, isSigner: true, isWritable: true }],
      data: assignData
    }
  ]);
  const res1 = BytecodeDrainerFirewall.inspectTransactionBytes(assignDrainerTx, {
    userPubkeyB58: userWalletB58
  });
  assert.strictEqual(res1.safe, false);
  assert.strictEqual(res1.ruleTriggered, "RULE_01_NO_SYSTEM_ASSIGN");
  console.log(`✅ [RULE_01 PASS] Blocked SystemProgram::Assign Ownership Hijack in ${res1.inspectLatencyUs}µs`);
  console.log(`   • Reason: ${res1.reason}\n`);

  // -------------------------------------------------------------------------
  // ATTACK 2 (RULE_02): SPL-Token SetAuthority ATA Ownership Theft
  // -------------------------------------------------------------------------
  const setAuthData = Buffer.allocUnsafe(35);
  setAuthData[0] = 6; // TokenInstruction::SetAuthority = 6
  setAuthData[1] = 2; // AuthorityType::AccountOwner = 2
  setAuthData[2] = 1; // Option::Some = 1
  decodeB58(hackerWalletB58).copy(setAuthData, 3);

  const setAuthDrainerTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: SPL_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true },
        { pubkey: userWalletB58, isSigner: true, isWritable: false }
      ],
      data: setAuthData
    }
  ]);
  const res2 = BytecodeDrainerFirewall.inspectTransactionBytes(setAuthDrainerTx, {
    userPubkeyB58: userWalletB58,
    userTokenAtas: [userTokenAtaB58]
  });
  assert.strictEqual(res2.safe, false);
  assert.strictEqual(res2.ruleTriggered, "RULE_02_NO_SET_AUTHORITY");
  console.log(`✅ [RULE_02 PASS] Blocked SPL SetAuthority ATA Theft in ${res2.inspectLatencyUs}µs`);
  console.log(`   • Reason: ${res2.reason}\n`);

  // -------------------------------------------------------------------------
  // ATTACK 3 (RULE_03): Simulation-Spoofing Unknown CPI Time-Bomb Drainer
  // -------------------------------------------------------------------------
  const spoofDrainerTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: hackerProgramB58,
      keys: [
        { pubkey: userWalletB58, isSigner: true, isWritable: true },
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true },
        { pubkey: hackerWalletB58, isSigner: false, isWritable: true }
      ],
      data: Buffer.from("deadd00d1337", "hex")
    }
  ]);
  const res3 = BytecodeDrainerFirewall.inspectTransactionBytes(spoofDrainerTx, {
    userPubkeyB58: userWalletB58,
    userTokenAtas: [userTokenAtaB58],
    allowExternalDappWithGuard: false
  });
  assert.strictEqual(res3.safe, false);
  assert.strictEqual(res3.ruleTriggered, "RULE_03_UNKNOWN_CPI_WRITABLE_QUARANTINE");
  console.log(`✅ [RULE_03 PASS] Blocked Unknown CPI Simulation-Spoofing Drainer in ${res3.inspectLatencyUs}µs`);
  console.log(`   • Reason: ${res3.reason}\n`);

  // -------------------------------------------------------------------------
  // ATTACK 4 (RULE_04): Durable Nonce ("Sign Today, Drain Next Month") Time-Bomb
  // -------------------------------------------------------------------------
  const nonceData = Buffer.allocUnsafe(4);
  nonceData.writeUInt32LE(4, 0); // SystemInstruction::AdvanceNonceAccount = 4

  const nonceDrainerTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: SYSTEM_PROGRAM_ID,
      keys: [
        { pubkey: randomPubkeyB58(), isSigner: false, isWritable: true },
        { pubkey: userWalletB58, isSigner: true, isWritable: false }
      ],
      data: nonceData
    }
  ]);
  const res4 = BytecodeDrainerFirewall.inspectTransactionBytes(nonceDrainerTx, {
    userPubkeyB58: userWalletB58
  });
  assert.strictEqual(res4.safe, false);
  assert.strictEqual(res4.ruleTriggered, "RULE_04_NO_EXTERNAL_DURABLE_NONCE");
  console.log(`✅ [RULE_04 PASS] Blocked Durable Nonce Time-Bomb Attack in ${res4.inspectLatencyUs}µs`);
  console.log(`   • Reason: ${res4.reason}\n`);

  // -------------------------------------------------------------------------
  // ATTACK 5 (RULE_05): signMessage() Raw Transaction Bit-Flip Phishing
  // -------------------------------------------------------------------------
  // Hacker passes a raw V0 TransactionMessage into wallet.signMessage()
  const res5Bad = BytecodeDrainerFirewall.inspectSignMessagePayload(
    assignDrainerTx,
    userWalletB58
  );
  assert.strictEqual(res5Bad.safe, false);
  assert.strictEqual(res5Bad.ruleTriggered, "RULE_05_SIGN_MESSAGE_TX_BITFLIP");

  // Legitimate text sign-in message must pass and receive `\xffsolana offchain` prefix
  const res5Good = BytecodeDrainerFirewall.inspectSignMessagePayload(
    "Sign in to Pump.fun Trench Portal - Nonce: 948102",
    userWalletB58
  );
  assert.strictEqual(res5Good.safe, true);
  assert.strictEqual(
    res5Good.domainSeparatedPayload.subarray(0, 16).toString("binary"),
    "\xffsolana offchain"
  );
  console.log(`✅ [RULE_05 PASS] Blocked signMessage() Raw TX Bit-Flip Phishing in ${res5Bad.inspectLatencyUs}µs`);
  console.log(`   • Reason: ${res5Bad.reason}\n`);

  // -------------------------------------------------------------------------
  // ATTACK 6 (RULE_06): Unlimited SPL Token Approve Delegation + 1-Click Revoke
  // -------------------------------------------------------------------------
  const approveData = Buffer.allocUnsafe(9);
  approveData[0] = 4; // Approve = 4
  approveData.writeBigUInt64LE(1_000_000_000_000n, 1);

  const approveDrainerTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: SPL_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true },
        { pubkey: hackerWalletB58, isSigner: false, isWritable: false },
        { pubkey: userWalletB58, isSigner: true, isWritable: false }
      ],
      data: approveData
    }
  ]);
  const res6 = BytecodeDrainerFirewall.inspectTransactionBytes(approveDrainerTx, {
    userPubkeyB58: userWalletB58
  });
  assert.strictEqual(res6.safe, false);
  assert.strictEqual(res6.ruleTriggered, "RULE_06_NO_TOKEN_DELEGATE");
  const revokeIx = BytecodeDrainerFirewall.buildRevokeDelegateIx(userTokenAtaB58, userWalletB58);
  assert.strictEqual(revokeIx.data[0], 5);
  console.log(`✅ [RULE_06 PASS] Blocked Unlimited SPL Token Approve Delegation in ${res6.inspectLatencyUs}µs\n`);

  // -------------------------------------------------------------------------
  // ATTACK 7 (RULE_07): Malicious Token-2022 Extensions (PermanentDelegate + 99% Tax)
  // -------------------------------------------------------------------------
  // Build a synthetic Token-2022 Mint account with PermanentDelegate (Type 12) + 99% TransferFee (Type 1)
  const t22MintBuf = Buffer.alloc(166 + (4 + 36) + (4 + 108), 0);
  t22MintBuf[165] = 1; // AccountType::Mint = 1
  let off = 166;
  // TLV #1: PermanentDelegate (extType = 12, len = 36)
  t22MintBuf.writeUInt16LE(12, off);
  t22MintBuf.writeUInt16LE(36, off + 2);
  t22MintBuf.writeUInt32LE(1, off + 4);
  decodeB58(hackerWalletB58).copy(t22MintBuf, off + 8);
  off += 40;
  // TLV #2: TransferFeeConfig (extType = 1, len = 108, 9900 bps = 99% tax at offset 106)
  t22MintBuf.writeUInt16LE(1, off);
  t22MintBuf.writeUInt16LE(108, off + 2);
  t22MintBuf.writeUInt16LE(9900, off + 4 + 106);

  const res7 = BytecodeDrainerFirewall.auditToken2022MintAccountData(t22MintBuf);
  assert.strictEqual(res7.safe, false);
  assert.strictEqual(res7.findings.length, 2);
  console.log(`✅ [RULE_07 PASS] Detected Malicious Token-2022 PermanentDelegate & 99% Tax in ${res7.auditLatencyUs}µs`);
  console.log(`   • Finding 1: ${res7.findings[0].detail}`);
  console.log(`   • Finding 2: ${res7.findings[1].detail}\n`);

  // -------------------------------------------------------------------------
  // ATTACK 8 (RULE_08): CloseAccount Rent/WSOL Redirect Steal to Hacker
  // -------------------------------------------------------------------------
  const closeStealTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: SPL_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true },
        { pubkey: hackerWalletB58, isSigner: false, isWritable: true }, // Destination is hacker instead of user!
        { pubkey: userWalletB58, isSigner: true, isWritable: false }
      ],
      data: Buffer.from([9]) // CloseAccount = 9
    }
  ]);
  const res8 = BytecodeDrainerFirewall.inspectTransactionBytes(closeStealTx, {
    userPubkeyB58: userWalletB58,
    userTokenAtas: [userTokenAtaB58]
  });
  assert.strictEqual(res8.safe, false);
  assert.strictEqual(res8.ruleTriggered, "RULE_08_CLOSE_ACCOUNT_RENT_STEAL");
  console.log(`✅ [RULE_08 PASS] Blocked CloseAccount Rent/WSOL Redirect Steal in ${res8.inspectLatencyUs}µs\n`);

  // -------------------------------------------------------------------------
  // ATTACK 9 (RULE_09): Vanity Address Poisoning Lookalike Attack
  // -------------------------------------------------------------------------
  const middleFlipped =
    userSafeColdVaultB58.slice(0, 4) +
    "ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ" +
    userSafeColdVaultB58.slice(-4);
  const res9 = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(middleFlipped, [
    userSafeColdVaultB58
  ]);
  assert.strictEqual(res9.safe, false);
  assert.strictEqual(res9.poisoningDetected, true);
  assert.strictEqual(res9.ruleTriggered, "RULE_09_VANITY_ADDRESS_POISONING");
  console.log(`✅ [RULE_09 PASS] Blocked Vanity Lookalike Address Poisoning Attack`);
  console.log(`   • Reason: ${res9.reason}\n`);

  // -------------------------------------------------------------------------
  // TEST 10 (RULE_10): Legitimate Pump.fun Swap (<150µs) + On-Chain Balance-Floor Guard
  // -------------------------------------------------------------------------
  const legitPumpBuyTx = buildTestV0Message(userWalletB58, recentBlockhashB58, [
    {
      programId: COMPUTE_BUDGET_PROGRAM_ID,
      keys: [],
      data: Buffer.from([2, 0x70, 0x25, 0x01, 0x00]) // 75,000 CU
    },
    {
      programId: PUMP_FUN_PROGRAM_ID,
      keys: [
        { pubkey: userWalletB58, isSigner: true, isWritable: true },
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true }
      ],
      data: Buffer.from("66063d1201daebea00e1f5050000000000ca9a3b00000000", "hex")
    },
    {
      programId: SPL_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true },
        { pubkey: userWalletB58, isSigner: false, isWritable: true }, // Destination is USER (Safe!)
        { pubkey: userWalletB58, isSigner: true, isWritable: false }
      ],
      data: Buffer.from([9]) // CloseAccount = 9
    }
  ]);

  const res10 = BytecodeDrainerFirewall.inspectTransactionBytes(legitPumpBuyTx, {
    userPubkeyB58: userWalletB58,
    userTokenAtas: [userTokenAtaB58]
  });
  assert.strictEqual(res10.safe, true);
  assert.strictEqual(res10.tier, "VERIFIED_SAFE");
  assert.strictEqual(res10.inspectLatencyUs < 150, true, `Expected <150µs, got ${res10.inspectLatencyUs}µs`);

  const floorGuard = BytecodeDrainerFirewall.buildOnChainBalanceFloorGuard({
    userHotWalletB58: userWalletB58,
    userSafeVaultB58: userSafeColdVaultB58,
    currentBalanceLamports: 10_000_000_000n, // 10.0 SOL
    maxApprovedSpendLamports: 500_000_000n, // 0.5 SOL max approved
    feeBufferLamports: 50_000n
  });
  assert.strictEqual(floorGuard.enforcedMinRemainingLamports, 9_499_950_000n);
  assert.strictEqual(floorGuard.roundTripDualSignerGuardIxs.length, 2);

  console.log(`✅ [RULE_10 PASS] Verified Safe Pump.fun V0 Swap in ${res10.inspectLatencyUs}µs + On-Chain Balance-Floor Guard`);
  console.log(`   • SVM Enforced Floor: ${floorGuard.svmInvariant}\n`);

  console.log("======================================================================");
  console.log("🎉 PART 2 COMPLETE: ALL 10 ANTI-DRAINER FIREWALL TESTS PASSED 100%!");
  console.log("======================================================================");
}

runPart2RedTeamSuite().catch((err) => {
  console.error("❌ PART 2 TEST FAILED:", err);
  process.exit(1);
});

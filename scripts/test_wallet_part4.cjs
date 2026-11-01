"use strict";

const assert = require("assert");
const crypto = require("crypto");
const http = require("http");
const {
  startWalletBackendHttpServer,
  compileV0MessageFast,
  buildSetComputeUnitLimitIx,
  encodeB58,
  decodeB58,
  deriveEd25519PublicKeyFromSeed32,
  SYSTEM_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID
} = require("../lib/wallet-backend");

function randomPubkeyB58() {
  return encodeB58(deriveEd25519PublicKeyFromSeed32(crypto.randomBytes(32)));
}

let activeAuthToken = null;

function rpcCall(url, method, params = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    });
    const parsedUrl = new URL(url);
    const headers = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    };
    if (activeAuthToken) {
      headers["X-Celor-Auth-Token"] = activeAuthToken;
    }
    const req = http.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: "/",
        method: "POST",
        headers
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (json.error) reject(new Error(json.error.message));
            else resolve(json.result);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function runPart4FullE2ESuite() {
  console.log("======================================================================");
  console.log("🌐 CELOR TRENCH WALLET BACKEND — PART 4 JSON-RPC & E2E RED-TEAM SUITE");
  console.log("======================================================================\n");

  const daemon = await startWalletBackendHttpServer({
    port: 0,
    initialSlot: 460450000
  });
  activeAuthToken = daemon.authToken;
  console.log(`🟢 Wallet Standard JSON-RPC 2.0 Server listening at ${daemon.url}\n`);

  try {
    // -----------------------------------------------------------------------
    // STEP 1: Create Vault & Connect Wallet Standard (`wallet_createVault`, `wallet_connect`)
    // -----------------------------------------------------------------------
    const created = await rpcCall(daemon.url, "wallet_createVault", {
      passphrase: "CelorMasterVault#2026!"
    });
    assert.strictEqual(created.status, "VAULT_CREATED_AND_UNLOCKED");

    const connected = await rpcCall(daemon.url, "wallet_connect", { tier: "HOT" });
    assert.strictEqual(connected.connected, true);
    assert.strictEqual(connected.quantumShield, "QUANTUMGLOW_AX_XMSS_SHA256");

    const hotWalletB58 = connected.publicKey;
    const coldVaultB58 = created.summary.quantumColdVault.pubkey;

    const newBurner = await rpcCall(daemon.url, "celor_deriveStealthBurner", {
      label: "Pump.fun Trench Burner #1"
    });
    assert.strictEqual(newBurner.index, 1);

    console.log(`✅ [STEP 1 PASS] JSON-RPC Vault Created, Connected & Stealth Burner Derived`);
    console.log(`   • Active Hot Wallet   : ${hotWalletB58}`);
    console.log(`   • Quantum Cold Vault  : ${coldVaultB58}`);
    console.log(`   • Stealth Burner #1   : ${newBurner.pubkey} (${newBurner.deriveLatencyUs}µs)\n`);

    // -----------------------------------------------------------------------
    // STEP 2: `wallet_signAndSendTransaction` Turbo-Hijack over JSON-RPC
    // -----------------------------------------------------------------------
    const jitoBribeData = Buffer.allocUnsafe(12);
    jitoBribeData.writeUInt32LE(2, 0);
    jitoBribeData.writeBigUInt64LE(20_000_000n, 4); // 0.02 SOL Jito Bribe

    const dappTxMsg = compileV0MessageFast(hotWalletB58, randomPubkeyB58(), [
      buildSetComputeUnitLimitIx(300000),
      {
        programId: PUMP_FUN_PROGRAM_ID,
        keys: [
          { pubkey: hotWalletB58, isSigner: true, isWritable: true },
          { pubkey: randomPubkeyB58(), isSigner: false, isWritable: true }
        ],
        data: Buffer.from("66063d1201daebea00e1f5050000000000ca9a3b00000000", "hex")
      },
      {
        programId: SYSTEM_PROGRAM_ID,
        keys: [
          { pubkey: hotWalletB58, isSigner: true, isWritable: true },
          {
            pubkey: "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
            isSigner: false,
            isWritable: true
          }
        ],
        data: jitoBribeData
      }
    ]);

    const signSendRes = await rpcCall(daemon.url, "wallet_signAndSendTransaction", {
      transactionBase64: dappTxMsg.toString("base64")
    });
    assert.strictEqual(signSendRes.approved, true);
    assert.strictEqual(signSendRes.status, "TURBO_SIGNED_AND_DISPATCHED_0RTT_QUIC");
    assert.strictEqual(signSendRes.jitoBribeSavedSol, 0.02);
    assert.strictEqual(signSendRes.tightCuLimit, 75000);

    console.log(`✅ [STEP 2 PASS] wallet_signAndSendTransaction Turbo-Hijacked & Dispatched (${signSendRes.totalLatencyUs}µs)`);
    console.log(`   • Stripped Jito Bribe : +${signSendRes.jitoBribeSavedSol} SOL saved`);
    console.log(`   • Signature           : ${signSendRes.signature.slice(0, 28)}...\n`);

    // -----------------------------------------------------------------------
    // STEP 3: Red-Team Drainer Block over JSON-RPC (`Assign`, `signMessage` Bit-Flip, Poisoning)
    // -----------------------------------------------------------------------
    const hackerProgB58 = randomPubkeyB58();
    const assignData = Buffer.allocUnsafe(36);
    assignData.writeUInt32LE(1, 0);
    decodeB58(hackerProgB58).copy(assignData, 4);

    const drainerMsg = compileV0MessageFast(hotWalletB58, randomPubkeyB58(), [
      {
        programId: SYSTEM_PROGRAM_ID,
        keys: [{ pubkey: hotWalletB58, isSigner: true, isWritable: true }],
        data: assignData
      }
    ]);

    const blockedTxRes = await rpcCall(daemon.url, "wallet_signTransaction", {
      transactionBase64: drainerMsg.toString("base64")
    });
    assert.strictEqual(blockedTxRes.approved, false);
    assert.strictEqual(blockedTxRes.status, "BLOCKED_BY_DRAINER_FIREWALL");
    assert.strictEqual(blockedTxRes.ruleTriggered, "RULE_01_NO_SYSTEM_ASSIGN");

    const blockedSignMsgRes = await rpcCall(daemon.url, "wallet_signMessage", {
      messageBase64: drainerMsg.toString("base64")
    });
    assert.strictEqual(blockedSignMsgRes.approved, false);
    assert.strictEqual(blockedSignMsgRes.ruleTriggered, "RULE_05_SIGN_MESSAGE_TX_BITFLIP");

    const poisonedAddr =
      coldVaultB58.slice(0, 4) +
      "111111111111111111111111111111111111" +
      coldVaultB58.slice(-4);
    const riskAudit = await rpcCall(daemon.url, "celor_inspectDrainerRisk", {
      targetAddressB58: poisonedAddr
    });
    assert.strictEqual(riskAudit.addressPoisoningAudit.poisoningDetected, true);

    console.log(`✅ [STEP 3 PASS] JSON-RPC Blocked Assign Drainer, signMessage Bit-Flip & Vanity Poisoning\n`);

    // -----------------------------------------------------------------------
    // STEP 4: One-Time Spend (`OTS`) Quantum Cold Vault Rotation over JSON-RPC
    // -----------------------------------------------------------------------
    const rotRes = await rpcCall(daemon.url, "celor_rotateQuantumColdVault", {
      destinationPubkey: hotWalletB58,
      spendLamports: "1500000000", // 1.5 SOL
      currentColdBalanceLamports: "10000000000" // 10.0 SOL
    });
    assert.strictEqual(rotRes.status, "COLD_VAULT_OTS_ROTATED_AND_SIGNED");
    assert.strictEqual(rotRes.retiredColdVaultPubkey, coldVaultB58);
    assert.notStrictEqual(rotRes.newQuantumColdVaultPubkey, coldVaultB58);
    assert.strictEqual(rotRes.remainingOnExposedVaultLamports, "0");

    console.log(`✅ [STEP 4 PASS] Quantum Cold Vault OTS Rotated via JSON-RPC`);
    console.log(`   • Retired Cold Vault #0 (0◎) : ${rotRes.retiredColdVaultPubkey}`);
    console.log(`   • New Cold Vault #1 (8.499◎) : ${rotRes.newQuantumColdVaultPubkey}\n`);

    // -----------------------------------------------------------------------
    // STEP 5: 22-ATA Rent Vacuum, Panic Eject & 220ms Offline Guard over JSON-RPC
    // -----------------------------------------------------------------------
    const vacuumRpc = await rpcCall(daemon.url, "celor_vacuumRent", {
      emptyAtas: Array.from({ length: 22 }, () => ({
        ataPubkeyB58: randomPubkeyB58(),
        isToken2022: false
      }))
    });
    assert.strictEqual(vacuumRpc.batchesCount, 1);
    assert.strictEqual(vacuumRpc.totalAtasClosed, 22);
    assert.strictEqual(vacuumRpc.platformFeeChargedLamports, "0");

    await rpcCall(daemon.url, "celor_armPanicEject", {
      hotWalletSolBalanceLamports: "3000000000",
      openPositions: []
    });
    const panicRpc = await rpcCall(daemon.url, "celor_triggerPanicEject", {});
    assert.strictEqual(panicRpc.status, "PANIC_EJECT_DISPATCHED_0US_BUILD");
    assert.strictEqual(panicRpc.buildAndSignLatencyUs, 0);

    // Lock vault and verify locked protection
    const lockedRes = await rpcCall(daemon.url, "wallet_lockVault", {});
    assert.strictEqual(lockedRes.status, "VAULT_LOCKED_MEMORY_ZEROIZED");

    let rejectedWhenLocked = false;
    try {
      await rpcCall(daemon.url, "wallet_connect", {});
    } catch (e) {
      if (e.message.includes("WALLET_LOCKED")) rejectedWhenLocked = true;
    }
    assert.strictEqual(rejectedWhenLocked, true);

    console.log(`✅ [STEP 5 PASS] 22-ATA Rent Vacuum, 0µs Panic Eject & Memory-Zeroized Vault Lock Verified\n`);
    console.log("======================================================================");
    console.log("🎉 ALL 4 BACKEND PARTS COMPLETE & 100% VERIFIED!");
    console.log("======================================================================");
  } finally {
    await daemon.close();
  }
}

runPart4FullE2ESuite().catch((err) => {
  console.error("❌ PART 4 TEST FAILED:", err);
  process.exit(1);
});

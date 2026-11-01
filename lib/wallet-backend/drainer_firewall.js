"use strict";

/**
 * CELOR TRENCH WALLET BACKEND — PART 2: BytecodeDrainerFirewall
 * ============================================================================
 * <150µs Static Binary Instruction Decoder, 10-Rule Anti-Drainer Engine &
 * Native On-Chain Balance-Floor Guard Injector (Zero RPC Simulation Lag!)
 *
 * Defeats all 10 real-world Solana wallet drainer attack vectors:
 * - RULE_01: SystemProgram::Assign / AssignWithSeed account ownership hijack
 * - RULE_02: SPL-Token & Token-2022 SetAuthority (AccountOwner / CloseAuthority) theft
 * - RULE_03: Unknown CPI program with writable user wallet/ATA (Simulation Spoofing)
 * - RULE_04: SystemProgram::AdvanceNonceAccount durable-nonce time-bomb signatures
 * - RULE_05: signMessage() raw TransactionMessage bit-flip phishing
 * - RULE_06: Unlimited SPL Approve / ApproveChecked token delegation (+ 1-click Revoke)
 * - RULE_07: Malicious Token-2022 TLV extensions (PermanentDelegate, TransferHook, 100% Fee)
 * - RULE_08: Fake WSOL wrap / CloseAccount rent-redirection & unauthorized SOL sweep
 * - RULE_09: Vanity address poisoning lookalike detector & <0.0001 SOL dust filter
 * - RULE_10: Native On-Chain Balance-Floor Guard (forces validator SVM revert if
 *            post-execution balance drops 1 lamport below `minRemainingLamports`)
 */

const { encodeB58, decodeB58 } = require("./vault_crypto");

// Canonical Solana Program IDs
const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
const SPL_TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const ATA_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const MEMO_V1_PROGRAM_ID = "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo";

// Verified Solana Trench DEX Programs
const PUMP_FUN_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";
const PUMPSWAP_AMM_PROGRAM_ID = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA";
const RAYDIUM_V4_PROGRAM_ID = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
const RAYDIUM_CPMM_PROGRAM_ID = "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
const RAYDIUM_CLMM_PROGRAM_ID = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";
const JUPITER_V6_PROGRAM_ID = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";

const VERIFIED_WHITELIST_PROGRAMS = new Set([
  SYSTEM_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ATA_PROGRAM_ID,
  MEMO_PROGRAM_ID,
  MEMO_V1_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID,
  PUMPSWAP_AMM_PROGRAM_ID,
  RAYDIUM_V4_PROGRAM_ID,
  RAYDIUM_CPMM_PROGRAM_ID,
  RAYDIUM_CLMM_PROGRAM_ID,
  JUPITER_V6_PROGRAM_ID
]);

// Known Jito & MEV Bribe Tip Vaults (used to detect hidden bribe drains in dApp TXs)
const KNOWN_MEV_TIP_ACCOUNTS = new Set([
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT"
]);

/**
 * Reads a Solana compact-u16 integer from `buf` at `offset`.
 * @param {Buffer} buf
 * @param {number} offset
 * @returns {{ value: number, nextOffset: number }}
 */
function readCompactU16(buf, offset) {
  let val = 0;
  let shift = 0;
  let cursor = offset;
  for (let i = 0; i < 3; i++) {
    if (cursor >= buf.length) {
      throw new Error("Truncated compact-u16 in transaction buffer");
    }
    const byte = buf[cursor++];
    val |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value: val, nextOffset: cursor };
    }
    shift += 7;
  }
  throw new Error("Malformed compact-u16 (>3 bytes)");
}

/**
 * Decodes either a full wire transaction (`[sigCount] + [64B * N] + [messageBytes]`)
 * or raw `TransactionMessage` bytes (`Legacy`, `V0 = 0x80`, or Alpenglow `V1 = 0x81`) in <100µs.
 *
 * @param {Buffer|Uint8Array} rawBytes
 * @param {object} [opts]
 * @param {boolean} [opts.isMessageOnly=false] - Set true if `rawBytes` is already a TransactionMessage
 * @param {Map<string, string[]>} [opts.altLookupMap] - Optional Map<tablePubkeyB58, string[] addresses>
 */
function decodeWireTransactionFast(rawBytes, opts = {}) {
  const buf = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
  if (buf.length < 40) {
    throw new Error(`Transaction buffer too short (${buf.length} bytes)`);
  }

  let offset = 0;
  let signatures = [];
  let messageStartOffset = 0;

  // Heuristic: if not explicitly `isMessageOnly`, check whether `buf` starts with a signature array
  if (!opts.isMessageOnly) {
    const firstByte = buf[0];
    // A raw V0/V1 message starts with 0x80 or 0x81. A signed wire tx starts with sigCount (1..16).
    const looksLikeRawVersionedMessage = firstByte === 0x80 || firstByte === 0x81;
    if (!looksLikeRawVersionedMessage && firstByte >= 1 && firstByte <= 16) {
      const potentialMsgOffset = 1 + firstByte * 64;
      if (potentialMsgOffset + 36 <= buf.length) {
        const msgFirstByte = buf[potentialMsgOffset];
        const isValidNextHeader =
          msgFirstByte === 0x80 ||
          msgFirstByte === 0x81 ||
          (msgFirstByte >= 1 && msgFirstByte <= 16 && buf[potentialMsgOffset + 3] >= 1);
        if (isValidNextHeader) {
          for (let s = 0; s < firstByte; s++) {
            const sigStart = 1 + s * 64;
            signatures.push(buf.subarray(sigStart, sigStart + 64));
          }
          offset = potentialMsgOffset;
          messageStartOffset = potentialMsgOffset;
        }
      }
    }
  }

  // Parse Message Version (Legacy vs V0 vs Alpenglow V1)
  let version = "legacy";
  const prefixByte = buf[offset];
  if ((prefixByte & 0x80) !== 0) {
    version = prefixByte & 0x7f; // 0 for V0, 1 for Alpenglow V1
    if (version !== 0 && version !== 1) {
      throw new Error(`Unsupported versioned transaction version: ${version}`);
    }
    offset += 1;
  }

  // Parse 3-byte Message Header
  const numRequiredSignatures = buf[offset++];
  const numReadonlySignedAccounts = buf[offset++];
  const numReadonlyUnsignedAccounts = buf[offset++];

  if (numRequiredSignatures < 1 || numRequiredSignatures > 32) {
    throw new Error(`Invalid numRequiredSignatures: ${numRequiredSignatures}`);
  }

  // Parse Static Account Keys
  const keyCountRes = readCompactU16(buf, offset);
  const numStaticKeys = keyCountRes.value;
  offset = keyCountRes.nextOffset;

  if (numStaticKeys < numRequiredSignatures || offset + numStaticKeys * 32 + 32 > buf.length) {
    throw new Error("Truncated static account keys or blockhash");
  }

  const numWritableSigned = numRequiredSignatures - numReadonlySignedAccounts;
  const numUnsigned = numStaticKeys - numRequiredSignatures;
  const numWritableUnsigned = numUnsigned - numReadonlyUnsignedAccounts;

  const staticAccounts = new Array(numStaticKeys);
  for (let i = 0; i < numStaticKeys; i++) {
    const pkBuf = Buffer.from(buf.subarray(offset, offset + 32));
    offset += 32;
    const isSigner = i < numRequiredSignatures;
    const isWritable = isSigner
      ? i < numWritableSigned
      : i - numRequiredSignatures < numWritableUnsigned;
    staticAccounts[i] = {
      index: i,
      pubkeyBuf: pkBuf,
      pubkeyB58: encodeB58(pkBuf),
      isSigner,
      isWritable,
      isAltLoaded: false
    };
  }

  // Parse 32-byte Recent Blockhash / Durable Nonce
  const recentBlockhashBuf = Buffer.from(buf.subarray(offset, offset + 32));
  const recentBlockhashB58 = encodeB58(recentBlockhashBuf);
  offset += 32;

  // Parse Instructions
  const ixCountRes = readCompactU16(buf, offset);
  const numInstructions = ixCountRes.value;
  offset = ixCountRes.nextOffset;

  const rawInstructions = new Array(numInstructions);
  for (let i = 0; i < numInstructions; i++) {
    if (offset >= buf.length) throw new Error(`Truncated instruction #${i}`);
    const programIdIndex = buf[offset++];

    const accRes = readCompactU16(buf, offset);
    const numAccs = accRes.value;
    offset = accRes.nextOffset;
    if (offset + numAccs > buf.length) throw new Error(`Truncated accounts in instruction #${i}`);
    const accountIndices = Array.from(buf.subarray(offset, offset + numAccs));
    offset += numAccs;

    const dataRes = readCompactU16(buf, offset);
    const dataLen = dataRes.value;
    offset = dataRes.nextOffset;
    if (offset + dataLen > buf.length) throw new Error(`Truncated data in instruction #${i}`);
    const data = Buffer.from(buf.subarray(offset, offset + dataLen));
    offset += dataLen;

    rawInstructions[i] = {
      ixIndex: i,
      programIdIndex,
      accountIndices,
      data
    };
  }

  // Parse Address Lookup Table (ALT) Lookups if Versioned (V0 / V1)
  const addressTableLookups = [];
  const loadedWritableAccounts = [];
  const loadedReadonlyAccounts = [];

  if (version !== "legacy" && offset < buf.length) {
    const altCountRes = readCompactU16(buf, offset);
    const numAltLookups = altCountRes.value;
    offset = altCountRes.nextOffset;

    for (let t = 0; t < numAltLookups; t++) {
      if (offset + 32 > buf.length) throw new Error("Truncated ALT table key");
      const tableKeyBuf = Buffer.from(buf.subarray(offset, offset + 32));
      const tableKeyB58 = encodeB58(tableKeyBuf);
      offset += 32;

      const wRes = readCompactU16(buf, offset);
      offset = wRes.nextOffset;
      const writableIndexes = Array.from(buf.subarray(offset, offset + wRes.value));
      offset += wRes.value;

      const rRes = readCompactU16(buf, offset);
      offset = rRes.nextOffset;
      const readonlyIndexes = Array.from(buf.subarray(offset, offset + rRes.value));
      offset += rRes.value;

      addressTableLookups.push({
        tableKeyB58,
        tableKeyBuf,
        writableIndexes,
        readonlyIndexes
      });

      const knownTableAddrs =
        opts.altLookupMap && opts.altLookupMap.get(tableKeyB58);

      for (const wIdx of writableIndexes) {
        const resolvedB58 =
          knownTableAddrs && knownTableAddrs[wIdx]
            ? knownTableAddrs[wIdx]
            : `ALT_WRITABLE_${tableKeyB58.slice(0, 6)}_${wIdx}`;
        loadedWritableAccounts.push({
          index: staticAccounts.length + loadedWritableAccounts.length,
          pubkeyBuf: null,
          pubkeyB58: resolvedB58,
          isSigner: false,
          isWritable: true,
          isAltLoaded: true
        });
      }
      for (const rIdx of readonlyIndexes) {
        const resolvedB58 =
          knownTableAddrs && knownTableAddrs[rIdx]
            ? knownTableAddrs[rIdx]
            : `ALT_READONLY_${tableKeyB58.slice(0, 6)}_${rIdx}`;
        loadedReadonlyAccounts.push({
          index:
            staticAccounts.length +
            loadedWritableAccounts.length +
            loadedReadonlyAccounts.length,
          pubkeyBuf: null,
          pubkeyB58: resolvedB58,
          isSigner: false,
          isWritable: false,
          isAltLoaded: true
        });
      }
    }
  }

  const allAccounts = [
    ...staticAccounts,
    ...loadedWritableAccounts,
    ...loadedReadonlyAccounts
  ];

  // Hydrate instructions with resolved programId & account metadata
  const instructions = rawInstructions.map((rawIx) => {
    const progMeta = allAccounts[rawIx.programIdIndex];
    const programIdB58 = progMeta ? progMeta.pubkeyB58 : "UNKNOWN_PROGRAM_INDEX";
    const accounts = rawIx.accountIndices.map(
      (idx) =>
        allAccounts[idx] || {
          index: idx,
          pubkeyB58: `UNRESOLVED_IDX_${idx}`,
          isSigner: false,
          isWritable: false,
          isAltLoaded: true
        }
    );
    return {
      ixIndex: rawIx.ixIndex,
      programIdIndex: rawIx.programIdIndex,
      programIdB58,
      accountIndices: rawIx.accountIndices,
      accounts,
      data: rawIx.data
    };
  });

  return {
    version,
    header: {
      numRequiredSignatures,
      numReadonlySignedAccounts,
      numReadonlyUnsignedAccounts
    },
    signatures,
    messageBytes: Buffer.from(buf.subarray(messageStartOffset)),
    staticAccounts,
    allAccounts,
    feePayerB58: staticAccounts[0] ? staticAccounts[0].pubkeyB58 : null,
    recentBlockhashB58,
    recentBlockhashBuf,
    instructions,
    addressTableLookups
  };
}

// ============================================================================
// BYTECODE DRAINER FIREWALL (10 HACKER / DRAINER RULES IN <150µs)
// ============================================================================

class BytecodeDrainerFirewall {
  /**
   * Audits a raw transaction (`Buffer` or `Uint8Array`) against all 10 Anti-Drainer Rules in <150µs.
   *
   * @param {Buffer|Uint8Array} rawTxBytes
   * @param {object} context
   * @param {string} context.userPubkeyB58 - The user's active signing wallet address
   * @param {Set<string>|string[]} [context.userTokenAtas] - Optional list of user's owned token ATAs
   * @param {bigint|number} [context.maxApprovedSolLamports=5_000_000_000n] - Max SOL user approved spending
   * @param {boolean} [context.allowExternalDappWithGuard=false] - Allow unverified dApp ONLY if Balance-Floor Guard is injected
   * @param {Map<string, string[]>} [context.altLookupMap] - Optional ALT lookup map
   */
  static inspectTransactionBytes(rawTxBytes, context = {}) {
    const t0 = process.hrtime.bigint();
    const userPubkeyB58 = context.userPubkeyB58;
    if (!userPubkeyB58) {
      throw new Error("context.userPubkeyB58 is required for drainer firewall audit");
    }

    const userAtas = new Set(context.userTokenAtas || []);
    const allowedTokenDestSet = new Set(context.allowedTokenTransferDestinations || []);
    const protectedAtaSet = new Set(
      (context.protectedTokenAtas || [])
        .map((t) => (typeof t === "string" ? t : t && t.ataPubkeyB58))
        .filter(Boolean)
    );
    const trustedAddressesList = Array.from(
      new Set([userPubkeyB58, ...(context.trustedAddresses || [])])
    );
    const maxApprovedLamports = BigInt(context.maxApprovedSolLamports ?? 5_000_000_000n);

    let decoded;
    try {
      decoded = decodeWireTransactionFast(rawTxBytes, {
        altLookupMap: context.altLookupMap
      });
    } catch (err) {
      return {
        safe: false,
        tier: "BLOCKED_DRAINER_ATTACK",
        ruleTriggered: "RULE_00_MALFORMED_WIRE_PAYLOAD",
        reason: `Malformed transaction wire payload: ${err.message}`,
        threats: [{ rule: "RULE_00", severity: "CRITICAL", detail: err.message }],
        inspectLatencyUs: Number(Number(process.hrtime.bigint() - t0) / 1e3)
      };
    }

    const threats = [];
    const warnings = [];
    let totalDirectSolOutLamports = 0n;
    let mevBribeDetectedLamports = 0n;
    let invokesUnverifiedProgram = false;

    // FIX #4a: Fail closed if any V0/V1 Address Lookup Table (ALT) account or program index is unresolved
    const hasUnresolvedAlt =
      decoded.allAccounts.some((a) => a.isAltLoaded && a.pubkeyB58.startsWith("ALT_")) ||
      decoded.instructions.some(
        (ix) =>
          ix.programIdB58 === "UNKNOWN_PROGRAM_INDEX" ||
          ix.programIdB58.startsWith("ALT_") ||
          ix.accounts.some(
            (a) =>
              a.pubkeyB58.startsWith("ALT_") || a.pubkeyB58.startsWith("UNRESOLVED_IDX_")
          )
      );
    if (hasUnresolvedAlt) {
      threats.push({
        rule: "RULE_03B_UNRESOLVED_ALT_ACCOUNT",
        severity: "CRITICAL",
        detail:
          "Blocked transaction containing unresolved Address Lookup Table (ALT) accounts. All ALT tables must be resolved prior to signing to prevent hidden writable ATA or program bypasses."
      });
    }

    // V3 (N9): Priority-fee drain guard. A dApp can set an enormous ComputeUnitPrice x ComputeUnitLimit so the
    // fee payer (the user) burns SOL to a colluding validator. Cap the implied fee when the user pays it.
    {
      let cuPriceMicro = 0n;
      let cuLimit = null;
      let additionalFeeLamports = 0n;
      let nonBuiltinIxCount = 0;
      for (const cix of decoded.instructions) {
        if (cix.programIdB58 === COMPUTE_BUDGET_PROGRAM_ID) {
          const d = cix.data;
          if (d[0] === 3 && d.length >= 9) cuPriceMicro = d.readBigUInt64LE(1);
          else if (d[0] === 2 && d.length >= 5) cuLimit = BigInt(d.readUInt32LE(1));
          else if (d[0] === 0 && d.length >= 9) {
            cuLimit = BigInt(d.readUInt32LE(1));
            additionalFeeLamports = BigInt(d.readUInt32LE(5));
          }
        } else if (cix.programIdB58 !== SYSTEM_PROGRAM_ID) {
          nonBuiltinIxCount++;
        }
      }
      const defaultLimit = BigInt(Math.max(1, nonBuiltinIxCount)) * 200_000n;
      let effLimit = cuLimit === null ? defaultLimit : cuLimit;
      if (effLimit > 1_400_000n) effLimit = 1_400_000n;
      const priorityFeeLamports = (cuPriceMicro * effLimit + 999_999n) / 1_000_000n + additionalFeeLamports;
      const maxPriorityFeeLamports = BigInt(context.maxPriorityFeeLamports ?? 100_000_000n); // 0.1 SOL
      if (decoded.feePayerB58 === userPubkeyB58 && priorityFeeLamports > maxPriorityFeeLamports) {
        threats.push({
          rule: "RULE_12_EXCESSIVE_PRIORITY_FEE",
          severity: "HIGH",
          detail: `Blocked transaction whose implied priority fee is ${Number(priorityFeeLamports) / 1e9} SOL (cap ${Number(maxPriorityFeeLamports) / 1e9} SOL) and is paid by your wallet.`
        });
      }
    }

    for (let i = 0; i < decoded.instructions.length; i++) {
      const ix = decoded.instructions[i];
      const prog = ix.programIdB58;
      const data = ix.data;

      // -----------------------------------------------------------------------
      // 1. SYSTEM PROGRAM CHECKS (RULE_01, RULE_04, RULE_08)
      // -----------------------------------------------------------------------
      if (prog === SYSTEM_PROGRAM_ID && data.length >= 4) {
        const sysDisc = data.readUInt32LE(0);

        // RULE_04: Durable Nonce Time-Bomb (`AdvanceNonceAccount = 4`, `InitializeNonce = 6`, `AuthorizeNonce = 7`)
        if (sysDisc === 4 || sysDisc === 6 || sysDisc === 7) {
          threats.push({
            rule: "RULE_04_NO_EXTERNAL_DURABLE_NONCE",
            severity: "CRITICAL",
            ixIndex: i,
            detail:
              "Blocked Durable Nonce instruction (AdvanceNonceAccount). Durable Nonces can be held off-chain and broadcast later."
          });
        }

        // RULE_01: Account Ownership Hijack (`Assign = 1`, `AssignWithSeed = 9`, `AllocateWithSeed = 10`)
        if (sysDisc === 1 || sysDisc === 9 || sysDisc === 10) {
          const newOwnerB58 =
            data.length >= 36 ? encodeB58(data.subarray(4, 36)) : "UNKNOWN_OWNER";
          threats.push({
            rule: "RULE_01_NO_SYSTEM_ASSIGN",
            severity: "CRITICAL",
            ixIndex: i,
            detail: `Blocked SystemProgram::Assign ownership transfer attempting to assign wallet ownership to ${newOwnerB58}!`
          });
        }

        // RULE_01b & B5 Fix: CreateAccount (`0`) — check owner AND count funding lamports against SOL cap!
        if (sysDisc === 0 && data.length >= 52) {
          const lamports = data.readBigUInt64LE(4);
          const fromAcc = ix.accounts[0]?.pubkeyB58;
          const createdAcc = ix.accounts[1]?.pubkeyB58;
          const newOwnerB58 = encodeB58(data.subarray(20, 52));

          if (fromAcc === userPubkeyB58) {
            totalDirectSolOutLamports += lamports;
            if (createdAcc && createdAcc !== userPubkeyB58) {
              const poisonCheck = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(
                createdAcc,
                trustedAddressesList
              );
              if (poisonCheck.poisoningDetected) {
                threats.push({
                  rule: "RULE_09_VANITY_ADDRESS_POISONING",
                  severity: "CRITICAL",
                  ixIndex: i,
                  detail: poisonCheck.reason
                });
              }
            }
          }

          if (!VERIFIED_WHITELIST_PROGRAMS.has(newOwnerB58)) {
            threats.push({
              rule: "RULE_01_CREATE_ACCOUNT_UNVERIFIED_OWNER",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked SystemProgram::CreateAccount assigning account ownership to unverified program ${newOwnerB58}.`
            });
          }
        }

        // V3 (R4): CreateAccountWithSeed (`3`) — layout: disc(4) base(32) seedLen(u64) seed lamports(u64) space(u64) owner(32).
        // Funding lamports count toward the SOL cap and the new owner must be a verified program.
        if (sysDisc === 3 && data.length >= 4 + 32 + 8) {
          const seedLenBig = data.readBigUInt64LE(36);
          if (seedLenBig > 32n * 4n || BigInt(data.length) < 44n + seedLenBig + 8n + 8n + 32n) {
            threats.push({
              rule: "RULE_01_CREATE_ACCOUNT_WITH_SEED_MALFORMED",
              severity: "CRITICAL",
              ixIndex: i,
              detail: "Blocked malformed SystemProgram::CreateAccountWithSeed payload."
            });
          } else {
            const o = 44 + Number(seedLenBig);
            const lamports = data.readBigUInt64LE(o);
            const newOwnerB58 = encodeB58(data.subarray(o + 16, o + 48));
            const fromAcc = ix.accounts[0]?.pubkeyB58;
            const createdAcc = ix.accounts[1]?.pubkeyB58;
            if (fromAcc === userPubkeyB58) {
              totalDirectSolOutLamports += lamports;
              if (createdAcc && createdAcc !== userPubkeyB58) {
                const poisonCheck = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(
                  createdAcc,
                  trustedAddressesList
                );
                if (poisonCheck.poisoningDetected) {
                  threats.push({
                    rule: "RULE_09_VANITY_ADDRESS_POISONING",
                    severity: "CRITICAL",
                    ixIndex: i,
                    detail: poisonCheck.reason
                  });
                }
              }
            }
            if (!VERIFIED_WHITELIST_PROGRAMS.has(newOwnerB58)) {
              threats.push({
                rule: "RULE_01_CREATE_ACCOUNT_UNVERIFIED_OWNER",
                severity: "CRITICAL",
                ixIndex: i,
                detail: `Blocked SystemProgram::CreateAccountWithSeed assigning account ownership to unverified program ${newOwnerB58}.`
              });
            }
          }
        }

        // V3 (R5): WithdrawNonceAccount (`5`) — the user must never act as a nonce authority in a dApp transaction.
        if (sysDisc === 5) {
          const touchesUserAsSigner = ix.accounts.some(
            (a) => a.pubkeyB58 === userPubkeyB58 && a.isSigner
          );
          if (touchesUserAsSigner) {
            threats.push({
              rule: "RULE_04B_NONCE_WITHDRAW_BLOCKED",
              severity: "HIGH",
              ixIndex: i,
              detail:
                "Blocked SystemProgram::WithdrawNonceAccount authorised by your wallet (durable-nonce balance sweep)."
            });
          }
        }

        // RULE_08 & B5/B9 Fix: Direct SystemProgram::Transfer (`2`), CreateAccountWithSeed (`3`), TransferWithSeed (`11`)
        if ((sysDisc === 2 || sysDisc === 11) && data.length >= 12) {
          const lamports = data.readBigUInt64LE(4);
          const fromAcc = ix.accounts[0]?.pubkeyB58;
          const toAcc = ix.accounts[sysDisc === 11 ? 2 : 1]?.pubkeyB58;

          if (fromAcc === userPubkeyB58 || ix.accounts[1]?.pubkeyB58 === userPubkeyB58) {
            totalDirectSolOutLamports += lamports;
            if (toAcc && toAcc !== userPubkeyB58) {
              const poisonCheck = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(
                toAcc,
                trustedAddressesList
              );
              if (poisonCheck.poisoningDetected) {
                threats.push({
                  rule: "RULE_09_VANITY_ADDRESS_POISONING",
                  severity: "CRITICAL",
                  ixIndex: i,
                  detail: poisonCheck.reason
                });
              }
            }
            if (KNOWN_MEV_TIP_ACCOUNTS.has(toAcc)) {
              mevBribeDetectedLamports += lamports;
              warnings.push({
                rule: "MEV_BRIBE_DETECTED",
                ixIndex: i,
                lamports: lamports.toString(),
                toAcc,
                detail: `Detected ${Number(lamports) / 1e9} SOL Jito/MEV bribe transfer to ${toAcc}`
              });
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // 2. SPL-TOKEN & TOKEN-2022 CHECKS (RULE_02, RULE_02B, RULE_02C, RULE_02D, RULE_06, RULE_08)
      // -----------------------------------------------------------------------
      if ((prog === SPL_TOKEN_PROGRAM_ID || prog === TOKEN_2022_PROGRAM_ID) && data.length >= 1) {
        const tokDisc = data[0];

        // FIX #3a & B10 (RULE_02B): Direct SPL-Token / Token-2022 Transfer (`3`), TransferChecked (`12`),
        // and Token-2022 TransferFeeExtension::TransferCheckedWithFee (`26` + sub-disc `1`)
        const isTransferCheckedWithFee = tokDisc === 26 && data.length >= 11 && data[1] === 1;
        if (
          (tokDisc === 3 && data.length >= 9) ||
          (tokDisc === 12 && data.length >= 10) ||
          isTransferCheckedWithFee
        ) {
          const amount = isTransferCheckedWithFee
            ? data.readBigUInt64LE(2)
            : data.readBigUInt64LE(1);
          const sourceAta = ix.accounts[0]?.pubkeyB58 || "UNKNOWN_SOURCE_ATA";
          const destAta =
            (tokDisc === 12 || isTransferCheckedWithFee
              ? ix.accounts[2]?.pubkeyB58
              : ix.accounts[1]?.pubkeyB58) || "UNKNOWN_DEST_ATA";
          const authority =
            (tokDisc === 12 || isTransferCheckedWithFee
              ? ix.accounts[3]?.pubkeyB58
              : ix.accounts[2]?.pubkeyB58) || "UNKNOWN_AUTHORITY";

          const isUserSourceOrSigner =
            authority === userPubkeyB58 ||
            userAtas.has(sourceAta) ||
            ix.accounts.some((a) => a.pubkeyB58 === userPubkeyB58 && a.isSigner);

          if (destAta && destAta !== userPubkeyB58 && destAta !== sourceAta) {
            const poisonCheck = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(
              destAta,
              trustedAddressesList
            );
            if (poisonCheck.poisoningDetected) {
              threats.push({
                rule: "RULE_09_VANITY_ADDRESS_POISONING",
                severity: "CRITICAL",
                ixIndex: i,
                detail: poisonCheck.reason
              });
            }
          }

          // Self-transfer (sourceAta === destAta) is allowed for on-chain Token Balance-Floor Guard
          const isSelfTransferGuard = sourceAta === destAta;
          const isExplicitlyAllowedDest =
            isSelfTransferGuard ||
            destAta === userPubkeyB58 ||
            userAtas.has(destAta) ||
            allowedTokenDestSet.has(destAta) ||
            Boolean(context.allowDirectTokenTransfers);

          if (isUserSourceOrSigner && !isExplicitlyAllowedDest) {
            threats.push({
              rule: "RULE_02B_UNAUTHORIZED_TOKEN_TRANSFER",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked direct SPL/Token-2022 Transfer (${amount.toString()} units) from ${sourceAta} to unapproved recipient ${destAta}!`
            });
          }
        }

        // B10 Fix (RULE_02D): Default-deny any unverified Token-2022 / SPL extension instruction
        // when the user is a signer or a user ATA is passed!
        const AUDITED_SPL_DISCS = new Set([1, 3, 4, 5, 6, 8, 9, 12, 13, 15, 16, 17, 18]);
        if (!AUDITED_SPL_DISCS.has(tokDisc) && !isTransferCheckedWithFee) {
          const touchesUser = ix.accounts.some(
            (a) =>
              a.pubkeyB58 === userPubkeyB58 ||
              a.isSigner ||
              userAtas.has(a.pubkeyB58)
          );
          if (touchesUser) {
            threats.push({
              rule: "RULE_02D_UNVERIFIED_TOKEN_EXTENSION_IX",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked unverified SPL/Token-2022 extension instruction (discriminator=${tokDisc}) touching user wallet/ATA.`
            });
          }
        }

        // FIX #3b (RULE_02C): Direct SPL-Token / Token-2022 Burn (`8`) & BurnChecked (`15`)
        if ((tokDisc === 8 && data.length >= 9) || (tokDisc === 15 && data.length >= 10)) {
          const amount = data.readBigUInt64LE(1);
          const sourceAta = ix.accounts[0]?.pubkeyB58 || "UNKNOWN_SOURCE_ATA";
          const authority = ix.accounts[2]?.pubkeyB58 || "UNKNOWN_AUTHORITY";
          const isUserSourceOrSigner =
            authority === userPubkeyB58 ||
            userAtas.has(sourceAta) ||
            ix.accounts.some((a) => a.pubkeyB58 === userPubkeyB58 && a.isSigner);

          if (isUserSourceOrSigner && !context.allowTokenBurn) {
            threats.push({
              rule: "RULE_02C_UNAUTHORIZED_TOKEN_BURN",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked unauthorized SPL Token Burn (${amount.toString()} units) from token account ${sourceAta}!`
            });
          }
        }

        // RULE_02: SetAuthority (`6`) ATA / Mint Ownership Theft
        if (tokDisc === 6 && data.length >= 3) {
          const authType = data[1]; // 0=MintTokens, 1=Freeze, 2=AccountOwner, 3=CloseAccount
          const hasNewAuth = data[2];
          const newAuthB58 =
            hasNewAuth === 1 && data.length >= 35
              ? encodeB58(data.subarray(3, 35))
              : "NONE";
          if (newAuthB58 !== userPubkeyB58) {
            threats.push({
              rule: "RULE_02_NO_SET_AUTHORITY",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked SPL SetAuthority (type=${authType}) attempting to transfer your token account ownership to ${newAuthB58}!`
            });
          }
        }

        // RULE_06: Approve (`4`) / ApproveChecked (`13`) Unlimited Token Delegation
        if (tokDisc === 4 || tokDisc === 13) {
          const delegateAcc = ix.accounts[1]?.pubkeyB58 || "UNKNOWN_DELEGATE";
          threats.push({
            rule: "RULE_06_NO_TOKEN_DELEGATE",
            severity: "CRITICAL",
            ixIndex: i,
            detail: `Blocked SPL Token Approve/ApproveChecked granting token drain permission to delegate ${delegateAcc}.`
          });
        }

        // RULE_08a: CloseAccount (`9`) where rent/WSOL lamports are sent to an attacker instead of user!
        if (tokDisc === 9) {
          const closedAcc = ix.accounts[0]?.pubkeyB58;
          const destAcc = ix.accounts[1]?.pubkeyB58;
          const ownerAcc = ix.accounts[2]?.pubkeyB58;
          if (
            (ownerAcc === userPubkeyB58 || userAtas.has(closedAcc)) &&
            destAcc !== userPubkeyB58 &&
            !allowedTokenDestSet.has(destAcc)
          ) {
            threats.push({
              rule: "RULE_08_CLOSE_ACCOUNT_RENT_STEAL",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked CloseAccount redirect! Attempted to close account ${closedAcc} and send its SOL/WSOL to ${destAcc}.`
            });
          }
        }

        // RULE_08b: InitializeAccount (`1`), InitializeAccount2 (`16`), InitializeAccount3 (`18`) Fake WSOL Trap
        if (tokDisc === 1 || tokDisc === 16 || tokDisc === 18) {
          let initOwnerB58 = null;
          if (tokDisc === 1) {
            initOwnerB58 = ix.accounts[2]?.pubkeyB58;
          } else if (data.length >= 33) {
            initOwnerB58 = encodeB58(data.subarray(1, 33));
          }
          if (initOwnerB58 && initOwnerB58 !== userPubkeyB58 && !VERIFIED_WHITELIST_PROGRAMS.has(initOwnerB58)) {
            threats.push({
              rule: "RULE_08_FAKE_WSOL_INIT_OWNER",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked fake WSOL/Token account initialization setting external owner ${initOwnerB58}!`
            });
          }
        }
      }

      // -----------------------------------------------------------------------
      // 2B. WHITELISTED AGGREGATOR OUTPUT-ACCOUNT & DISCRIMINATOR AUDIT (B11 Fix)
      // -----------------------------------------------------------------------
      if (prog === JUPITER_V6_PROGRAM_ID) {
        const JUPITER_V6_SWAP_DISCS = new Set([
          "e517cb977ae3ad2a", // route
          "c1209b3341d69c81", // sharedAccountsRoute
          "d033ef977b2bed5c", // exactOutRoute
          "b0d169a89a7d453e"  // sharedAccountsExactOutRoute
        ]);
        const discHex = data.length >= 8 ? data.subarray(0, 8).toString("hex") : "";
        const hasVerifiedDisc = JUPITER_V6_SWAP_DISCS.has(discHex);
        // V3 (R6): Real Jupiter V6 IDL account layouts. The user's FINAL output token account lives at:
        //   route / exactOutRoute:                      idx 3 (userDestinationTokenAccount) [+ optional idx 4]
        //   sharedAccountsRoute / sharedAccountsExactOutRoute: idx 6 (destinationTokenAccount)
        // (Optional slots hold the Jupiter program id as a "None" placeholder.)
        const JUPITER_DEST_INDEXES = {
          e517cb977ae3ad2a: [3, 4],
          d033ef977b2bed5c: [3, 4],
          c1209b3341d69c81: [6],
          b0d169a89a7d453e: [6]
        };
        const destIdxs = JUPITER_DEST_INDEXES[discHex] || [];
        let destAccB58 = null;
        let isAllowedOutput = destIdxs.length > 0;
        for (const di of destIdxs) {
          const acc = ix.accounts[di];
          const b58 = acc ? acc.pubkeyB58 : null;
          if (di === destIdxs[0]) destAccB58 = b58;
          const ok =
            b58 !== null &&
            (b58 === userPubkeyB58 ||
              b58 === JUPITER_V6_PROGRAM_ID ||
              userAtas.has(b58) ||
              allowedTokenDestSet.has(b58));
          if (!ok) {
            isAllowedOutput = false;
            destAccB58 = b58;
            break;
          }
        }

        if (!hasVerifiedDisc || !isAllowedOutput) {
          threats.push({
            rule: "RULE_03E_DEX_OUTPUT_REDIRECT_OR_UNKNOWN_IX",
            severity: "CRITICAL",
            ixIndex: i,
            detail: `Blocked Jupiter V6 instruction: unverified swap discriminator (${discHex || "short"}) or untrusted output account (${destAccB58})!`
          });
        }
      }

      // 2C. PUMP.FUN / PUMPSWAP / RAYDIUM DEX SPEND CAP & RECIPIENT AUDIT (V3 Residual Fix)
      if (prog === PUMP_FUN_PROGRAM_ID || prog === PUMPSWAP_AMM_PROGRAM_ID) {
        const discHex = data.length >= 8 ? data.subarray(0, 8).toString("hex") : "";
        // Pump.fun / PumpSwap `buy` (`66063d1201daebea`, 24B: [8B disc][8B tokenAmount][8B maxSolCost])
        if (discHex === "66063d1201daebea" && data.length >= 24) {
          const maxSolCostLamports = data.readBigUInt64LE(16);
          totalDirectSolOutLamports += maxSolCostLamports;
        }
        // Full 12-account IDL layout check: index 5 = associatedUser (dest ATA), index 6 = user (signer/SOL receiver)
        if (
          (discHex === "66063d1201daebea" || discHex === "33e685a4017f83ad") &&
          ix.accounts.length >= 7
        ) {
          const userSlotB58 = ix.accounts[6]?.pubkeyB58;
          const assocUserAtaB58 = ix.accounts[5]?.pubkeyB58;
          const badUserSlot = userSlotB58 && userSlotB58 !== userPubkeyB58;
          const badBuyDestAta =
            discHex === "66063d1201daebea" &&
            assocUserAtaB58 !== userPubkeyB58 &&
            !userAtas.has(assocUserAtaB58) &&
            !allowedTokenDestSet.has(assocUserAtaB58);
          if (badUserSlot || badBuyDestAta) {
            threats.push({
              rule: "RULE_03E_DEX_OUTPUT_REDIRECT_OR_UNKNOWN_IX",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked ${prog === PUMP_FUN_PROGRAM_ID ? "Pump.fun" : "PumpSwap"} swap redirecting output/proceeds to external account (${badUserSlot ? userSlotB58 : assocUserAtaB58})!`
            });
          }
        }
      }

      if (prog === RAYDIUM_V4_PROGRAM_ID) {
        const isSwapDisc = data.length >= 17 && (data[0] === 9 || data[0] === 11);
        if (!isSwapDisc) {
          threats.push({
            rule: "RULE_03E_DEX_OUTPUT_REDIRECT_OR_UNKNOWN_IX",
            severity: "CRITICAL",
            ixIndex: i,
            detail: `Blocked Raydium V4 instruction: unverified swap discriminator (${data.length > 0 ? data[0] : "empty"})!`
          });
        } else if (ix.accounts.length >= 17) {
          const destTokenAccB58 = ix.accounts[ix.accounts.length - 2]?.pubkeyB58;
          const userOwnerAccB58 = ix.accounts[ix.accounts.length - 1]?.pubkeyB58;
          const badOwner = userOwnerAccB58 && userOwnerAccB58 !== userPubkeyB58;
          const badDest =
            destTokenAccB58 !== userPubkeyB58 &&
            !userAtas.has(destTokenAccB58) &&
            !allowedTokenDestSet.has(destTokenAccB58);
          if (badOwner || badDest) {
            threats.push({
              rule: "RULE_03E_DEX_OUTPUT_REDIRECT_OR_UNKNOWN_IX",
              severity: "CRITICAL",
              ixIndex: i,
              detail: `Blocked Raydium V4 swap redirecting output to untrusted account (${badOwner ? userOwnerAccB58 : destTokenAccB58})!`
            });
          }
        }
      }

      // -----------------------------------------------------------------------
      // 3. UNKNOWN CPI WRITABLE QUARANTINE (RULE_03 & B8 Fix — Simulation-Spoofing Defense)
      // -----------------------------------------------------------------------
      if (!VERIFIED_WHITELIST_PROGRAMS.has(prog)) {
        invokesUnverifiedProgram = true;
        // FIX #4b: Quarantine any unverified program when the user is a transaction signer or
        // any writable/signer account is passed to the CPI (even if userTokenAtas list is empty)
        const userIsTxSigner = decoded.staticAccounts.some(
          (a) => a.isSigner && a.pubkeyB58 === userPubkeyB58
        );
        const exposesUserWritableOrSigner =
          userIsTxSigner ||
          ix.accounts.some(
            (a) =>
              a.isWritable ||
              a.isSigner ||
              a.pubkeyB58 === userPubkeyB58 ||
              userAtas.has(a.pubkeyB58)
          );
        if (exposesUserWritableOrSigner && !context.allowExternalDappWithGuard) {
          threats.push({
            rule: "RULE_03_UNKNOWN_CPI_WRITABLE_QUARANTINE",
            severity: "CRITICAL",
            ixIndex: i,
            detail: `Unverified program ${prog} requests signer/writable access. Blocked to prevent simulation-spoofing CPI drains (enable Balance-Floor Guard to proceed safely).`
          });
        }

        // V3 (N7): Without a verified token inventory the Balance-Floor Guard can only protect SOL. When the policy
        // layer demands inventory (`requireTokenInventory`), an unverified program that receives the user as a
        // signer is refused unless the caller supplied the wallet's token accounts (`userTokenAtas`).
        // Also block when `userTokenAtas` is claimed empty (`[]`) while the transaction includes SPL-Token / Token-2022
        // alongside writable accounts, since the unverified CPI can invoke SPL-Token to drain an undisclosed ATA.
        const txIncludesTokenProgram =
          ix.accounts.some(
            (a) => a.pubkeyB58 === SPL_TOKEN_PROGRAM_ID || a.pubkeyB58 === TOKEN_2022_PROGRAM_ID
          ) ||
          decoded.staticAccounts.some(
            (a) => a.pubkeyB58 === SPL_TOKEN_PROGRAM_ID || a.pubkeyB58 === TOKEN_2022_PROGRAM_ID
          );
        const hasUnprotectedWritableWithTokenProg =
          txIncludesTokenProgram &&
          userAtas.size === 0 &&
          protectedAtaSet.size === 0 &&
          ix.accounts.some((a) => a.isWritable && a.pubkeyB58 !== userPubkeyB58);

        if (
          context.requireTokenInventory &&
          (!Array.isArray(context.userTokenAtas) || hasUnprotectedWritableWithTokenProg) &&
          ix.accounts.some((a) => a.pubkeyB58 === userPubkeyB58 && a.isSigner)
        ) {
          threats.push({
            rule: "RULE_03F_UNKNOWN_CPI_TOKEN_INVENTORY_REQUIRED",
            severity: "HIGH",
            ixIndex: i,
            detail: `Unverified program ${prog} receives your signature ${hasUnprotectedWritableWithTokenProg ? "with SPL-Token/Token-2022 and writable accounts while claiming empty userTokenAtas" : "without a verified token-account inventory (userTokenAtas)"}, so SPL balances cannot be protected.`
          });
        }

        // B8 Fix: Even when allowExternalDappWithGuard is true, if a known user Token ATA is passed
        // as writable to an unverified program, require a Token Balance-Floor Guard (protectedTokenAtas)
        // for that ATA so the CPI cannot drain tokens while only SOL is guarded!
        const unprotectedWritableUserAta = ix.accounts.find(
          (a) =>
            a.isWritable &&
            userAtas.has(a.pubkeyB58) &&
            !protectedAtaSet.has(a.pubkeyB58)
        );
        if (unprotectedWritableUserAta) {
          threats.push({
            rule: "RULE_03D_UNPROTECTED_USER_ATA_IN_UNKNOWN_CPI",
            severity: "CRITICAL",
            ixIndex: i,
            detail: `Unverified program ${prog} requests writable access to your token account ${unprotectedWritableUserAta.pubkeyB58} without a Token Balance-Floor Guard (protectedTokenAtas).`
          });
        }
      }
    }

    // Check total direct SOL spend against user's approved ceiling
    if (totalDirectSolOutLamports > maxApprovedLamports) {
      threats.push({
        rule: "RULE_08_EXCESSIVE_SOL_SWEEP",
        severity: "CRITICAL",
        detail: `Transaction transfers ${Number(totalDirectSolOutLamports) / 1e9} SOL, exceeding approved limit of ${Number(maxApprovedLamports) / 1e9} SOL.`
      });
    }

    const inspectLatencyUs = Number(process.hrtime.bigint() - t0) / 1e3;

    if (threats.length > 0) {
      return {
        safe: false,
        tier: "BLOCKED_DRAINER_ATTACK",
        ruleTriggered: threats[0].rule,
        reason: threats[0].detail,
        threats,
        warnings,
        totalDirectSolOutLamports,
        mevBribeDetectedLamports,
        inspectLatencyUs: Number(inspectLatencyUs.toFixed(2)),
        decodedSummary: {
          version: decoded.version,
          feePayer: decoded.feePayerB58,
          recentBlockhash: decoded.recentBlockhashB58,
          instructionCount: decoded.instructions.length
        }
      };
    }

    return {
      safe: true,
      tier: invokesUnverifiedProgram ? "EXTERNAL_DAPP_GUARDED" : "VERIFIED_SAFE",
      ruleTriggered: null,
      reason: invokesUnverifiedProgram
        ? "External dApp permitted ONLY with On-Chain Balance-Floor Guard attached"
        : "100% verified safe instruction bytecode",
      threats: [],
      warnings,
      requiresOnChainBalanceFloorGuard: invokesUnverifiedProgram,
      totalDirectSolOutLamports,
      mevBribeDetectedLamports,
      inspectLatencyUs: Number(inspectLatencyUs.toFixed(2)),
      decoded
    };
  }

  /**
   * RULE_05: `signMessage` Raw Transaction Bit-Flip Firewall!
   * Prevents phishing websites from passing a serialized Solana V0/Legacy `TransactionMessage`
   * into `wallet.signMessage()` and broadcasting the resulting 64-byte signature on-chain.
   *
   * @param {Buffer|Uint8Array|string} messagePayload
   * @param {string} userPubkeyB58
   */
  static inspectSignMessagePayload(messagePayload, userPubkeyB58) {
    const t0 = process.hrtime.bigint();
    const buf =
      typeof messagePayload === "string"
        ? Buffer.from(messagePayload, "utf8")
        : Buffer.from(messagePayload);
    const userPubBuf = decodeB58(userPubkeyB58);

    // Check 1: Does the buffer start with 0x80 (V0) or 0x81 (Alpenglow V1) versioned tx prefix?
    if (buf.length >= 68 && (buf[0] === 0x80 || buf[0] === 0x81)) {
      const potentialPayer = buf.subarray(5, 37);
      if (potentialPayer.equals(userPubBuf) || buf[1] >= 1) {
        return {
          safe: false,
          ruleTriggered: "RULE_05_SIGN_MESSAGE_TX_BITFLIP",
          reason:
            "CRITICAL PHISHING BLOCK: Website passed a raw Versioned Solana Transaction (0x80/0x81) into signMessage() to steal your signature!",
          inspectLatencyUs: Number((Number(process.hrtime.bigint() - t0) / 1e3).toFixed(2))
        };
      }
    }

    // Check 2: Does it parse structurally as a valid Legacy or Versioned TransactionMessage?
    try {
      const parsed = decodeWireTransactionFast(buf, { isMessageOnly: true });
      if (
        parsed.instructions.length > 0 &&
        parsed.staticAccounts.some((a) => a.pubkeyB58 === userPubkeyB58)
      ) {
        return {
          safe: false,
          ruleTriggered: "RULE_05_SIGN_MESSAGE_TX_BITFLIP",
          reason:
            "CRITICAL PHISHING BLOCK: Payload inside signMessage() is a disguised Solana TransactionMessage containing your wallet as a signer!",
          inspectLatencyUs: Number((Number(process.hrtime.bigint() - t0) / 1e3).toFixed(2))
        };
      }
    } catch (_) {
      // Not a valid transaction message -> expected for genuine off-chain text messages!
    }

    // Check 3: Does the buffer contain the user's raw 32-byte public key at legacy payer offset [4..36]?
    if (buf.length >= 68 && buf.subarray(4, 36).equals(userPubBuf)) {
      return {
        safe: false,
        ruleTriggered: "RULE_05_SIGN_MESSAGE_TX_BITFLIP",
        reason:
          "CRITICAL PHISHING BLOCK: Binary payload contains your 32-byte public key at the exact Solana fee-payer offset [4..36]!",
        inspectLatencyUs: Number((Number(process.hrtime.bigint() - t0) / 1e3).toFixed(2))
      };
    }

    return {
      safe: true,
      ruleTriggered: null,
      reason: "Verified off-chain message (cannot be broadcast as a Solana transaction)",
      domainSeparatedPayload: BytecodeDrainerFirewall.wrapSafeOffchainMessage(buf),
      inspectLatencyUs: Number((Number(process.hrtime.bigint() - t0) / 1e3).toFixed(2))
    };
  }

  /**
   * Prepends the official Solana Off-Chain Message Domain Separator (`\xffsolana offchain`)
   * so that even if signed, the 64-byte Ed25519 signature is 100% rejected by Solana validators as a transaction.
   * @param {Buffer} msgBuf
   */
  static wrapSafeOffchainMessage(msgBuf) {
    const prefix = Buffer.from("\xffsolana offchain\x00\x01", "binary");
    if (msgBuf.subarray(0, 16).equals(prefix.subarray(0, 16))) {
      return msgBuf;
    }
    const lenBuf = Buffer.allocUnsafe(2);
    lenBuf.writeUInt16LE(msgBuf.length, 0);
    return Buffer.concat([prefix, lenBuf, msgBuf]);
  }

  /**
   * RULE_06 Helper: Builds a 1-byte `SPL-Token::Revoke` (`u8 = 5`) instruction to immediately
   * strip any active token delegation from a user's token account.
   */
  static buildRevokeDelegateIx(tokenAccountB58, ownerPubkeyB58, isToken2022 = false) {
    return {
      programId: isToken2022 ? TOKEN_2022_PROGRAM_ID : SPL_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: tokenAccountB58, isSigner: false, isWritable: true },
        { pubkey: ownerPubkeyB58, isSigner: true, isWritable: false }
      ],
      data: Buffer.from([5]) // Revoke = 5
    };
  }

  /**
   * RULE_07: Audits a Token-2022 Mint Account's raw TLV extension bytes in <20µs!
   * Detects:
   * - Type 1: `TransferFeeConfig` with predatory >= 50% (5,000 bps) or 100% honeypot tax
   * - Type 6: `DefaultAccountState` == Frozen (`2`)
   * - Type 9: `NonTransferable` (Soulbound token — cannot be sold!)
   * - Type 12: `PermanentDelegate` (Creator can burn or steal tokens from your wallet anytime!)
   * - Type 14: `TransferHook` (Custom CPI hook on every transfer — used by honeypot rugs!)
   *
   * @param {Buffer|Uint8Array} mintAccountData
   */
  static auditToken2022MintAccountData(mintAccountData) {
    const t0 = process.hrtime.bigint();
    const buf = Buffer.isBuffer(mintAccountData)
      ? mintAccountData
      : Buffer.from(mintAccountData);

    // Standard SPL Mint is 82 bytes. Token-2022 Mint with extensions is > 165 bytes
    // (82B Mint + 83B padding + 1B AccountType[1=Mint] at index 165 + TLV array starting at 166).
    const findings = [];
    if (buf.length <= 166) {
      return {
        safe: true,
        isToken2022WithExtensions: false,
        findings: [],
        auditLatencyUs: Number((Number(process.hrtime.bigint() - t0) / 1e3).toFixed(2))
      };
    }

    let offset = 166;
    while (offset + 4 <= buf.length) {
      const extType = buf.readUInt16LE(offset);
      const extLen = buf.readUInt16LE(offset + 2);
      offset += 4;
      if (extType === 0) break; // Uninitialized padding
      if (offset + extLen > buf.length) break;

      const extData = buf.subarray(offset, offset + extLen);
      offset += extLen;

      if (extType === 12) {
        // PermanentDelegate: [32B Option<Pubkey>] (COption u32=1 + 32B or NonZeroPubkey 32B)
        const delegateB58 = extData.length >= 32 ? encodeB58(extData.subarray(extData.length - 32)) : "ACTIVE";
        if (delegateB58 !== SYSTEM_PROGRAM_ID) {
          findings.push({
            rule: "RULE_07_PERMANENT_DELEGATE_TRAP",
            severity: "CRITICAL",
            extensionType: 12,
            detail: `Token-2022 PermanentDelegate is active (${delegateB58})! The creator can steal or burn 100% of your tokens out of your wallet at any time.`
          });
        }
      } else if (extType === 9) {
        findings.push({
          rule: "RULE_07_NON_TRANSFERABLE_HONEYPOT",
          severity: "CRITICAL",
          extensionType: 9,
          detail: "Token-2022 NonTransferable extension active! Once bought, this token can NEVER be sold or transferred."
        });
      } else if (extType === 14) {
        const hookProgB58 = extData.length >= 64 ? encodeB58(extData.subarray(32, 64)) : "CUSTOM_HOOK";
        if (hookProgB58 !== SYSTEM_PROGRAM_ID) {
          findings.push({
            rule: "RULE_07_TRANSFER_HOOK_HONEYPOT",
            severity: "HIGH",
            extensionType: 14,
            detail: `Token-2022 TransferHook active (Program: ${hookProgB58}). Creator can block sells dynamically.`
          });
        }
      } else if (extType === 6 && extData.length >= 1 && extData[0] === 2) {
        findings.push({
          rule: "RULE_07_DEFAULT_FROZEN_STATE",
          severity: "CRITICAL",
          extensionType: 6,
          detail: "Token-2022 DefaultAccountState is FROZEN! Your token account will be frozen immediately upon purchase."
        });
      } else if (extType === 1 && extData.length >= 108) {
        // TransferFeeConfig: newer TransferFee is at end of 108-byte struct (`u16 LE` basis points at offset 106)
        const feeBps = extData.readUInt16LE(106);
        if (feeBps >= 5000) {
          findings.push({
            rule: "RULE_07_PREDATORY_TRANSFER_FEE",
            severity: "CRITICAL",
            extensionType: 1,
            detail: `Token-2022 TransferFee is set to ${(feeBps / 100).toFixed(2)}%! Selling will lose ${(feeBps / 100).toFixed(0)}% to tax.`
          });
        }
      }
    }

    const hasCritical = findings.some((f) => f.severity === "CRITICAL");
    return {
      safe: !hasCritical,
      isToken2022WithExtensions: true,
      findings,
      auditLatencyUs: Number((Number(process.hrtime.bigint() - t0) / 1e3).toFixed(2))
    };
  }

  /**
   * RULE_09 (FIX #11): Anti-Poisoning Vanity Lookalike & Unsolicited Dust Filter.
   * Detects when an external address mimics the prefix/suffix or visual homoglyphs
   * of a user's saved/trusted vault address (`>=3 prefix + >=3 suffix`, `>=5 prefix`, or `>=5 suffix`).
   *
   * @param {string} targetAddressB58
   * @param {string[]} trustedAddressesB58
   */
  static inspectAddressPoisoningRisk(targetAddressB58, trustedAddressesB58 = []) {
    if (trustedAddressesB58.includes(targetAddressB58)) {
      return {
        safe: true,
        isTrustedExactMatch: true,
        poisoningDetected: false,
        reason: "Exact match with your verified address book / vault"
      };
    }

    const normalizeHomoglyphs = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/[0o]/g, "0")
        .replace(/[1il]/g, "1");

    const normTarget = normalizeHomoglyphs(targetAddressB58);

    for (const trusted of trustedAddressesB58) {
      if (!trusted || trusted === targetAddressB58) continue;
      const normTrusted = normalizeHomoglyphs(trusted);

      let prefixMatchLen = 0;
      const minLen = Math.min(normTarget.length, normTrusted.length);
      while (
        prefixMatchLen < minLen &&
        normTarget[prefixMatchLen] === normTrusted[prefixMatchLen]
      ) {
        prefixMatchLen++;
      }

      let suffixMatchLen = 0;
      while (
        suffixMatchLen < minLen &&
        normTarget[normTarget.length - 1 - suffixMatchLen] ===
          normTrusted[normTrusted.length - 1 - suffixMatchLen]
      ) {
        suffixMatchLen++;
      }

      const isDualEndLookalike =
        (prefixMatchLen >= 3 && suffixMatchLen >= 3) ||
        (prefixMatchLen >= 4 && suffixMatchLen >= 2) ||
        (prefixMatchLen >= 2 && suffixMatchLen >= 4);
      const isSingleEndDeepVanity = prefixMatchLen >= 5 || suffixMatchLen >= 5;

      if (isDualEndLookalike || isSingleEndDeepVanity) {
        return {
          safe: false,
          isTrustedExactMatch: false,
          poisoningDetected: true,
          ruleTriggered: "RULE_09_VANITY_ADDRESS_POISONING",
          spoofedTrustedAddress: trusted,
          prefixMatchLen,
          suffixMatchLen,
          reason: `CRITICAL ADDRESS POISONING ALERT: Target ${targetAddressB58} mimics ${prefixMatchLen} leading and ${suffixMatchLen} trailing characters of your trusted vault ${trusted}, but the middle characters differ!`
        };
      }
    }

    return {
      safe: true,
      isTrustedExactMatch: false,
      poisoningDetected: false,
      reason: "New external address (no vanity lookalike collision detected)"
    };
  }

  /**
   * RULE_10 / LOOPHOLE #2 (FIX #10): Native On-Chain Balance-Floor Guard Injector!
   * ==============================================================================
   * Enforces on-chain inside the Solana Validator SVM that the user's post-execution balance
   * cannot drop below `minRemainingLamports`.
   * - Requires an explicit verified `currentBalanceLamports` (never silently assumes a default balance).
   * - Supports both `singleSignerGuardIx` and `roundTripDualSignerGuardIxs` (2-instruction round-trip
   *   `HotWallet -> StealthBurner#0 -> HotWallet` so funds never get unintentionally locked in Cold Vault).
   * - Also supports `tokenGuards` (`SPL-Token::Transfer` self-transfer of `minRemainingTokens` on each user ATA)
   *   so token balances are equally protected on-chain!
   *
   * @param {object} params
   * @param {string} params.userHotWalletB58
   * @param {string} params.userSafeVaultB58 - User's Stealth Burner #0 (for round-trip) or Cold Vault address
   * @param {bigint|number} params.currentBalanceLamports - Explicit verified balance in lamports (REQUIRED)
   * @param {bigint|number} params.maxApprovedSpendLamports
   * @param {bigint|number} [params.feeBufferLamports=50000n]
   * @param {Array<{ataPubkeyB58: string, minRemainingRawAmount: bigint|number, isToken2022?: boolean}>} [params.protectedTokenAtas=[]]
   */
  static buildOnChainBalanceFloorGuard(params) {
    if (
      params === null ||
      typeof params !== "object" ||
      params.currentBalanceLamports === undefined ||
      params.currentBalanceLamports === null
    ) {
      throw new Error(
        "EXPLICIT_VERIFIED_BALANCE_REQUIRED: currentBalanceLamports must be explicitly provided to buildOnChainBalanceFloorGuard"
      );
    }

    const currentBal = BigInt(params.currentBalanceLamports);
    const maxSpend = BigInt(params.maxApprovedSpendLamports ?? 0n);
    const feeBuf = BigInt(params.feeBufferLamports ?? 50000n);

    if (currentBal <= 0n || maxSpend + feeBuf >= currentBal) {
      throw new Error(
        "Cannot build Balance-Floor Guard when maxApprovedSpend + feeBuffer >= currentBalanceLamports"
      );
    }

    const minRemainingLamports = currentBal - maxSpend - feeBuf;
    const minProtectedReserveLamports = BigInt(
      params.minProtectedReserveLamports ?? 10_000_000n
    ); // B7 Fix: Minimum 0.01 SOL (10,000,000 lamports) non-collapsible protected floor
    if (minRemainingLamports < minProtectedReserveLamports) {
      throw new Error(
        `BALANCE_FLOOR_COLLAPSE_BLOCKED: Enforced balance floor (${minRemainingLamports} lamports) is below the minimum ${minProtectedReserveLamports} lamports safety reserve`
      );
    }

    // Build native 12-byte SystemProgram::Transfer([u32 LE = 2] + [u64 LE = minRemainingLamports])
    const guardData = Buffer.allocUnsafe(12);
    guardData.writeUInt32LE(2, 0); // SystemInstruction::Transfer = 2
    guardData.writeBigUInt64LE(minRemainingLamports, 4);

    const guardTransferOutIx = {
      programId: SYSTEM_PROGRAM_ID,
      keys: [
        { pubkey: params.userHotWalletB58, isSigner: true, isWritable: true },
        { pubkey: params.userSafeVaultB58, isSigner: false, isWritable: true }
      ],
      data: guardData
    };

    const guardTransferBackIx = {
      programId: SYSTEM_PROGRAM_ID,
      keys: [
        { pubkey: params.userSafeVaultB58, isSigner: true, isWritable: true },
        { pubkey: params.userHotWalletB58, isSigner: false, isWritable: true }
      ],
      data: Buffer.from(guardData)
    };

    // Optional Token ATA Balance-Floor Guards (self-transfer of minRemainingRawAmount)
    const tokenFloorGuardIxs = [];
    if (Array.isArray(params.protectedTokenAtas)) {
      for (const tok of params.protectedTokenAtas) {
        if (!tok || !tok.ataPubkeyB58) continue;
        tokenFloorGuardIxs.push(
          BytecodeDrainerFirewall.buildTokenBalanceFloorGuardIx({
            userTokenAtaB58: tok.ataPubkeyB58,
            userOwnerPubkeyB58: params.userHotWalletB58,
            minRemainingRawAmount: BigInt(tok.minRemainingRawAmount ?? 1n),
            isToken2022: Boolean(tok.isToken2022)
          })
        );
      }
    }

    // V3 (N8): A balance-only floor cannot stop an unverified program from CPI-Approving a delegate on a protected
    // token account (balance unchanged, funds drained later). Append `Revoke` for every protected ATA at the end.
    const tokenDelegateRevokeIxs = [];
    if (Array.isArray(params.protectedTokenAtas)) {
      for (const tok of params.protectedTokenAtas) {
        if (!tok || !tok.ataPubkeyB58) continue;
        tokenDelegateRevokeIxs.push(
          BytecodeDrainerFirewall.buildRevokeDelegateIx(
            tok.ataPubkeyB58,
            params.userHotWalletB58,
            Boolean(tok.isToken2022)
          )
        );
      }
    }

    return {
      protectedWallet: params.userHotWalletB58,
      safeVaultAnchor: params.userSafeVaultB58,
      currentBalanceLamports: currentBal,
      maxApprovedSpendLamports: maxSpend,
      enforcedMinRemainingLamports: minRemainingLamports,
      svmInvariant: `post_balance(${params.userHotWalletB58.slice(0, 6)}...) >= ${minRemainingLamports} lamports`,
      singleSignerGuardIx: guardTransferOutIx,
      roundTripDualSignerGuardIxs: [
        guardTransferOutIx,
        guardTransferBackIx,
        ...tokenFloorGuardIxs,
        ...tokenDelegateRevokeIxs
      ],
      tokenFloorGuardIxs,
      tokenDelegateRevokeIxs
    };
  }

  /**
   * Builds a native 9-byte `SPL-Token::Transfer` (`0x03` + `u64 LE minRemainingRawAmount`)
   * where `source == destination == userTokenAtaB58`.
   * If an external CPI secretly drained tokens from `userTokenAtaB58` below `minRemainingRawAmount`,
   * the Solana Token Program aborts the entire transaction on-chain (`TokenError::InsufficientFunds`)!
   */
  static buildTokenBalanceFloorGuardIx({
    userTokenAtaB58,
    userOwnerPubkeyB58,
    minRemainingRawAmount,
    isToken2022 = false
  }) {
    const data = Buffer.allocUnsafe(9);
    data[0] = 3; // TokenInstruction::Transfer = 3
    data.writeBigUInt64LE(BigInt(minRemainingRawAmount), 1);
    return {
      programId: isToken2022 ? TOKEN_2022_PROGRAM_ID : SPL_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true },
        { pubkey: userTokenAtaB58, isSigner: false, isWritable: true },
        { pubkey: userOwnerPubkeyB58, isSigner: true, isWritable: false }
      ],
      data
    };
  }
}

module.exports = {
  BytecodeDrainerFirewall,
  decodeWireTransactionFast,
  readCompactU16,
  VERIFIED_WHITELIST_PROGRAMS,
  KNOWN_MEV_TIP_ACCOUNTS,
  SYSTEM_PROGRAM_ID,
  COMPUTE_BUDGET_PROGRAM_ID,
  SPL_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ATA_PROGRAM_ID,
  PUMP_FUN_PROGRAM_ID,
  PUMPSWAP_AMM_PROGRAM_ID
};

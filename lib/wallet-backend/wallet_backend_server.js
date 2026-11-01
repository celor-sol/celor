"use strict";

/**
 * CELOR TRENCH WALLET BACKEND — PART 4: WalletStandardRpcBridge & Server
 * ============================================================================
 * Unifies Part 1 (`VaultCryptoEngine`), Part 2 (`BytecodeDrainerFirewall`),
 * and Part 3 (`TrenchExecutionEngine`) behind a zero-dependency Solana Wallet-Standard
 * JSON-RPC 2.0 Server & In-Process Bridge.
 *
 * Ready to power:
 * - Chrome / Brave Browser Extension (`window.celor` / `window.solana`)
 * - Installable Web / PWA Wallet (`celor.cloud/wallet`)
 * - `@CelorTradeBot` Telegram Mini-App
 */

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  VaultCryptoEngine,
  QuantumglowAxEngine,
  encodeB58,
  decodeB58,
  signEd25519Seed32Native,
  verifyEd25519Native
} = require("./vault_crypto");
const { BytecodeDrainerFirewall } = require("./drainer_firewall");
const {
  TrenchExecutionEngine,
  compileV0MessageFast,
  buildSetComputeUnitLimitIx,
  buildSetComputeUnitPriceIx
} = require("./trench_engine");

// V3: Internal-only channel for already-resolved signing policy. A Symbol key can never arrive through
// JSON-RPC, so a remote caller cannot forge it.
const INTERNAL_POLICY = Symbol("celor.internalSigningPolicy");
const MAX_BATCH_TRANSACTIONS = 64;

class CelorWalletStandardBridge {
  /**
   * @param {object} [options]
   */
  constructor(options = {}) {
    this.options = options;
    this.vault = null;
    this.engine = null;
    this.connectedTier = "HOT";
    this.connectedBurnerIndex = 0;
    this.trustedAddresses = new Set();

    // FIX #1: Per-session cryptographic bearer token (256-bit)
    this.sessionAuthToken =
      options.sessionAuthToken || crypto.randomBytes(32).toString("hex");

    // FIX #7 & B12: Non-blocking async PBKDF2 + mutex-serialized failed unlock rate-limiter
    this.failedUnlockAttempts = 0;
    this.maxFailedUnlockAttempts = options.maxFailedUnlockAttempts ?? 5;
    this.unlockLockoutDurationMs = options.unlockLockoutDurationMs ?? 30_000;
    this.unlockLockoutUntilMs = 0;
    this._unlockQueue = Promise.resolve();

    // V3 (N6): Server-side signing policy. Per-request values can only TIGHTEN it; loosening requires
    // passphrase re-authentication (`policyOverridePassphrase`).
    this.policy = {
      maxPerTxSolLamports: BigInt(options.maxPerTxSolLamports ?? 2_000_000_000n)
    };

    // V3 Residual Fix (N17): Sticky server-side inventory & balance-floor ratchet.
    // Prevents a caller with only the session token from erasing known user ATAs (`userTokenAtas: []`)
    // or under-reporting `currentWalletBalanceLamports` to collapse the On-Chain Balance-Floor Guard.
    this.knownUserTokenAtas = new Set();
    this.knownProtectedTokenFloors = new Map();
    this.knownWalletBalanceFloorLamports = new Map();
  }

  _resetStickySecurityTrackers() {
    this.knownUserTokenAtas.clear();
    this.knownProtectedTokenFloors.clear();
    this.knownWalletBalanceFloorLamports.clear();
  }

  /**
   * V3 (N5): Every passphrase check shares ONE failed-attempt counter + lockout with `wallet_unlockVault`.
   * `_verifyPassphraseCounted` must only be called while already holding the unlock queue.
   */
  async _verifyPassphraseCounted(passphrase) {
    if (Date.now() < this.unlockLockoutUntilMs) {
      const waitSec = Math.ceil((this.unlockLockoutUntilMs - Date.now()) / 1000);
      throw new Error(
        `VAULT_UNLOCK_RATE_LIMITED: Too many failed passphrase attempts. Locked out for ${waitSec}s.`
      );
    }
    const ok =
      Boolean(this.vault) &&
      typeof passphrase === "string" &&
      (await this.vault.verifyPassphraseAsync(passphrase));
    if (!ok) {
      this.failedUnlockAttempts += 1;
      if (this.failedUnlockAttempts >= this.maxFailedUnlockAttempts) {
        this.unlockLockoutUntilMs = Date.now() + this.unlockLockoutDurationMs;
      }
    } else {
      this.failedUnlockAttempts = 0;
    }
    return ok;
  }

  _verifyPassphraseRateLimited(passphrase) {
    return this._runSerializedUnlock(() => this._verifyPassphraseCounted(passphrase));
  }

  /** Tier gate for every dApp-facing signing endpoint (HOT / BURNER only). */
  _assertDappSigningTier(tier, noun) {
    if (tier === "COLD") {
      throw new Error(
        `COLD_VAULT_DAPP_SIGNING_FORBIDDEN: Quantum Cold Vault cannot sign external dApp ${noun}; use HOT or BURNER tier`
      );
    }
    if (tier !== "HOT" && tier !== "BURNER") {
      throw new Error(`INVALID_TIER: dApp signing supports only HOT or BURNER (got ${JSON.stringify(tier)})`);
    }
  }

  _assertValidBurnerIndex(burnerIndex) {
    const burners = this.vault.getPublicVaultSummary().stealthBurnerPool.burners || [];
    if (!Number.isInteger(burnerIndex) || burnerIndex < 0 || burnerIndex >= burners.length) {
      throw new Error(`INVALID_BURNER_INDEX: ${String(burnerIndex)} is outside the derived burner pool`);
    }
  }

  /**
   * V3 (N6): Resolve the effective signing policy. Request params may only tighten the server policy unless the
   * caller re-authenticates with the vault passphrase (`policyOverridePassphrase`).
   */
  async _resolveSigningPolicy(params) {
    let overrideOk = false;
    if (params.policyOverridePassphrase !== undefined) {
      overrideOk = await this._verifyPassphraseRateLimited(params.policyOverridePassphrase);
      if (!overrideOk) {
        throw new Error("POLICY_OVERRIDE_REAUTH_FAILED: Invalid vault passphrase for policy override");
      }
    }
    const cap = this.policy.maxPerTxSolLamports;
    let requested = params.maxApprovedSolLamports !== undefined ? BigInt(params.maxApprovedSolLamports) : cap;
    if (requested < 0n) requested = 0n;
    const own = this._getOwnVaultAddressesSet();
    return {
      overrideOk,
      maxApprovedSolLamports: overrideOk ? requested : requested < cap ? requested : cap,
      allowDirectTokenTransfers: overrideOk && Boolean(params.allowDirectTokenTransfers),
      allowTokenBurn: overrideOk && Boolean(params.allowTokenBurn),
      allowedTokenTransferDestinations: (Array.isArray(params.allowedTokenTransferDestinations)
        ? params.allowedTokenTransferDestinations
        : []
      ).filter((a) => overrideOk || own.has(a))
    };
  }

  _recordAndResolveStickyInventory(params, activePubkey, overrideOk = false) {
    if (overrideOk && Array.isArray(params.userTokenAtas)) {
      this.knownUserTokenAtas = new Set(params.userTokenAtas.filter(Boolean));
    } else if (Array.isArray(params.userTokenAtas)) {
      for (const a of params.userTokenAtas) {
        if (a) this.knownUserTokenAtas.add(a);
      }
    }

    if (overrideOk && Array.isArray(params.protectedTokenAtas)) {
      this.knownProtectedTokenFloors.clear();
    }
    if (Array.isArray(params.protectedTokenAtas)) {
      for (const p of params.protectedTokenAtas) {
        if (!p || !p.ataPubkeyB58) continue;
        this.knownUserTokenAtas.add(p.ataPubkeyB58);
        const raw = BigInt(p.minRemainingRawAmount ?? 1n);
        const prev = this.knownProtectedTokenFloors.get(p.ataPubkeyB58);
        if (!prev || overrideOk || raw > prev.minRemainingRawAmount) {
          this.knownProtectedTokenFloors.set(p.ataPubkeyB58, {
            ataPubkeyB58: p.ataPubkeyB58,
            minRemainingRawAmount: raw,
            isToken2022: Boolean(p.isToken2022)
          });
        }
      }
    }

    const effectiveUserTokenAtas = Array.isArray(params.userTokenAtas)
      ? Array.from(new Set([...params.userTokenAtas.filter(Boolean), ...this.knownUserTokenAtas]))
      : undefined;

    const mergedProtectedMap = new Map(this.knownProtectedTokenFloors);
    for (const p of params.protectedTokenAtas || []) {
      if (!p || !p.ataPubkeyB58) continue;
      const raw = BigInt(p.minRemainingRawAmount ?? 1n);
      const existing = mergedProtectedMap.get(p.ataPubkeyB58);
      if (!existing || overrideOk || raw >= existing.minRemainingRawAmount) {
        mergedProtectedMap.set(p.ataPubkeyB58, {
          ataPubkeyB58: p.ataPubkeyB58,
          minRemainingRawAmount: raw,
          isToken2022: Boolean(p.isToken2022)
        });
      }
    }

    return {
      effectiveUserTokenAtas,
      effectiveProtectedTokenAtas: Array.from(mergedProtectedMap.values())
    };
  }

  /** RPC JSON cannot carry Buffers: accept hex / base64 / byte-array `data` for caller-supplied instructions. */
  _normalizeRpcInstruction(ix) {
    if (!ix || typeof ix !== "object") return ix;
    let data = ix.data;
    if (typeof data === "string") {
      data = /^(?:[0-9a-fA-F]{2})*$/.test(data) ? Buffer.from(data, "hex") : Buffer.from(data, "base64");
    } else if (Array.isArray(data)) {
      data = Buffer.from(data);
    } else if (data && data.type === "Buffer" && Array.isArray(data.data)) {
      data = Buffer.from(data.data);
    }
    return { ...ix, data };
  }

  _runSerializedUnlock(fn) {
    const next = this._unlockQueue.then(fn, fn);
    this._unlockQueue = next.catch(() => {});
    return next;
  }

  _getOwnVaultAddressesSet() {
    if (!this.vault) return new Set();
    const summary = this.vault.getPublicVaultSummary();
    return new Set(
      [
        summary.primaryHotWallet.pubkey,
        summary.primaryHotWallet.balanceFloorGuardAnchorPubkey,
        summary.quantumColdVault.pubkey,
        summary.quantumColdVault.hashLockedQuantumPdaVault,
        ...(summary.stealthBurnerPool.burners || []).map((b) => b.pubkey)
      ].filter(Boolean)
    );
  }

  _requireUnlocked() {
    if (!this.vault || !this.engine) {
      throw new Error("WALLET_LOCKED: Unlock or create a Celor QuantumGlow Vault first");
    }
  }

  /**
   * Dispatches any JSON-RPC 2.0 method call (`method`, `params`) deterministically.
   * @param {string} method
   * @param {object} [params={}]
   */
  async handleRpcMethod(method, params = {}) {
    switch (method) {
      // ---------------------------------------------------------------------
      // 1. VAULT LIFECYCLE & CONNECTION (`create`, `unlock`, `lock`, `connect`)
      // ---------------------------------------------------------------------
      case "wallet_createVault": {
        // V3 (N4): Replacing an unlocked vault requires re-authentication with the CURRENT passphrase, and
        // overwriting an existing vault file requires proving knowledge of that file's passphrase.
        if (this.vault) {
          if (
            typeof params.currentPassphrase !== "string" ||
            !(await this._verifyPassphraseRateLimited(params.currentPassphrase))
          ) {
            throw new Error(
              "VAULT_REPLACE_REAUTH_REQUIRED: Creating a new vault while one is unlocked requires the current vault passphrase (currentPassphrase)"
            );
          }
        }
        if (params.allowOverwrite && params.vaultFilePath) {
          let exists = false;
          try {
            exists = fs.existsSync(path.resolve(String(params.vaultFilePath)));
          } catch (_) {}
          if (exists) {
            const proven = await this._runSerializedUnlock(async () => {
              if (Date.now() < this.unlockLockoutUntilMs) {
                throw new Error("VAULT_UNLOCK_RATE_LIMITED: Too many failed passphrase attempts.");
              }
              try {
                const old = await VaultCryptoEngine.loadVaultAsync(
                  params.vaultFilePath,
                  params.existingVaultPassphrase
                );
                old.lockAndDestroy();
                this.failedUnlockAttempts = 0;
                return true;
              } catch (_) {
                this.failedUnlockAttempts += 1;
                if (this.failedUnlockAttempts >= this.maxFailedUnlockAttempts) {
                  this.unlockLockoutUntilMs = Date.now() + this.unlockLockoutDurationMs;
                }
                return false;
              }
            });
            if (!proven) {
              throw new Error(
                "VAULT_OVERWRITE_REAUTH_REQUIRED: Overwriting an existing vault file requires its passphrase (existingVaultPassphrase)"
              );
            }
          }
        }
        if (this.vault) this.vault.lockAndDestroy();
        if (this.engine) this.engine.destroy();

        // FIX #7: Async worker-pool PBKDF2 (never blocks Node.js event loop)
        this.vault = await VaultCryptoEngine.createNewVaultAsync(params.passphrase, {
          masterSeed32: params.masterSeedHex
            ? Buffer.from(params.masterSeedHex, "hex")
            : undefined,
          importedTelegramBotSecretKey: params.importedTelegramBotSecretKey,
          vaultFilePath: params.vaultFilePath,
          allowOverwrite: Boolean(params.allowOverwrite)
        });
        this.engine = new TrenchExecutionEngine(this.vault, this.options);
        this.failedUnlockAttempts = 0;
        this.unlockLockoutUntilMs = 0;
        this._resetStickySecurityTrackers();

        const summary = this.vault.getPublicVaultSummary();
        this.trustedAddresses.add(summary.quantumColdVault.pubkey);
        this.trustedAddresses.add(summary.primaryHotWallet.pubkey);
        this.trustedAddresses.add(summary.stealthBurnerPool.activeBurnerPubkey);

        return {
          status: "VAULT_CREATED_AND_UNLOCKED",
          summary
        };
      }

      case "wallet_unlockVault": {
        // B12 Fix: Serialize unlock attempts so concurrent bursts cannot race past maxFailedUnlockAttempts
        return this._runSerializedUnlock(async () => {
          if (Date.now() < this.unlockLockoutUntilMs) {
            const waitSec = Math.ceil((this.unlockLockoutUntilMs - Date.now()) / 1000);
            throw new Error(
              `VAULT_UNLOCK_RATE_LIMITED: Too many failed unlock attempts. Locked out for ${waitSec}s.`
            );
          }

          let unlockedVault;
          try {
            unlockedVault = await VaultCryptoEngine.loadVaultAsync(
              params.envelope || params.vaultFilePath,
              params.passphrase
            );
          } catch (err) {
            this.failedUnlockAttempts += 1;
            if (this.failedUnlockAttempts >= this.maxFailedUnlockAttempts) {
              this.unlockLockoutUntilMs = Date.now() + this.unlockLockoutDurationMs;
            }
            throw err;
          }

          // V3 (N4): Unlocking a DIFFERENT vault while one is active (vault substitution) needs the current passphrase.
          if (
            this.vault &&
            unlockedVault.axEngine.masterRootHex !== this.vault.axEngine.masterRootHex
          ) {
            let authorised = false;
            if (typeof params.currentPassphrase === "string") {
              authorised = await this._verifyPassphraseCounted(params.currentPassphrase);
            }
            if (!authorised) {
              unlockedVault.lockAndDestroy();
              throw new Error(
                "VAULT_SWITCH_REAUTH_REQUIRED: Switching to a different vault while one is unlocked requires the current vault passphrase (currentPassphrase)"
              );
            }
          }

          if (this.vault) this.vault.lockAndDestroy();
          if (this.engine) this.engine.destroy();

          this.failedUnlockAttempts = 0;
          this.unlockLockoutUntilMs = 0;
          this._resetStickySecurityTrackers();
          this.vault = unlockedVault;
          this.engine = new TrenchExecutionEngine(this.vault, this.options);
          const summary = this.vault.getPublicVaultSummary();
          this.trustedAddresses.add(summary.quantumColdVault.pubkey);
          this.trustedAddresses.add(summary.primaryHotWallet.pubkey);
          return {
            status: "VAULT_UNLOCKED",
            summary
          };
        });
      }

      case "wallet_lockVault": {
        this._resetStickySecurityTrackers();
        if (this.engine) {
          this.engine.destroy();
          this.engine = null;
        }
        if (this.vault) {
          this.vault.lockAndDestroy();
          this.vault = null;
        }
        return { status: "VAULT_LOCKED_MEMORY_ZEROIZED" };
      }

      case "wallet_connect": {
        this._requireUnlocked();
        const tier = params.tier || "HOT";
        if (tier !== "HOT" && tier !== "COLD" && tier !== "BURNER") {
          throw new Error(`INVALID_TIER: unsupported tier ${JSON.stringify(tier)}`);
        }
        if (tier === "BURNER" && params.burnerIndex !== undefined) this._assertValidBurnerIndex(params.burnerIndex);
        this.connectedTier = tier;
        const summary = this.vault.getPublicVaultSummary();
        let activePubkey = summary.primaryHotWallet.pubkey;
        if (tier === "COLD") {
          activePubkey = summary.quantumColdVault.pubkey;
        } else if (tier === "BURNER") {
          const idx =
            typeof params.burnerIndex === "number"
              ? params.burnerIndex
              : summary.stealthBurnerPool.activeBurnerIndex;
          this.connectedBurnerIndex = idx;
          activePubkey = summary.stealthBurnerPool.burners[idx]?.pubkey || activePubkey;
        }
        return {
          connected: true,
          activeTier: tier,
          publicKey: activePubkey,
          alpenglowSlot: this.engine.currentSlot,
          quantumShield: "QUANTUMGLOW_AX_XMSS_SHA256",
          summary
        };
      }

      // ---------------------------------------------------------------------
      // 2. SOLANA WALLET STANDARD SIGNING & TURBO-HIJACK EXECUTION
      // ---------------------------------------------------------------------
      case "wallet_signTransaction":
      case "wallet_signAndSendTransaction": {
        this._requireUnlocked();
        const requestedTier = params.tier || this.connectedTier;
        // B3 Fix (+V3): dApp signing endpoints may only use HOT / BURNER — never COLD or internal tiers!
        this._assertDappSigningTier(requestedTier, "transactions");
        const signBurnerIndex = params.burnerIndex ?? this.connectedBurnerIndex;
        if (requestedTier === "BURNER") this._assertValidBurnerIndex(signBurnerIndex);

        const rawTxBuf = Buffer.isBuffer(params.transactionBase64)
          ? params.transactionBase64
          : Buffer.from(params.transactionBase64, "base64");

        // V3 (N6): policy is resolved server-side; request params can only tighten it.
        const policy = params[INTERNAL_POLICY] || (await this._resolveSigningPolicy(params));
        const summary = this.vault.getPublicVaultSummary();
        const activeSignerPubkey =
          requestedTier === "BURNER"
            ? summary.stealthBurnerPool.burners[signBurnerIndex]?.pubkey
            : summary.primaryHotWallet.pubkey;

        // V3 Residual Fix (N17): Sticky ATA inventory & balance-floor ratchet
        const { effectiveUserTokenAtas, effectiveProtectedTokenAtas } =
          this._recordAndResolveStickyInventory(params, activeSignerPubkey, Boolean(policy.overrideOk));

        let effectiveCurrentWalletBalanceLamports = params.currentWalletBalanceLamports;
        if (
          effectiveCurrentWalletBalanceLamports !== undefined &&
          effectiveCurrentWalletBalanceLamports !== null
        ) {
          const callerBal = BigInt(effectiveCurrentWalletBalanceLamports);
          const knownFloor = this.knownWalletBalanceFloorLamports.get(activeSignerPubkey) || 0n;
          if (!policy.overrideOk && knownFloor > 0n && callerBal < knownFloor) {
            const underreportReason = `Blocked balance-floor under-reporting: supplied currentWalletBalanceLamports (${callerBal}) is below tracked wallet floor (${knownFloor}). Pass policyOverridePassphrase to lower.`;
            return {
              approved: false,
              status: "BLOCKED_BY_DRAINER_FIREWALL",
              ruleTriggered: "RULE_10_BALANCE_FLOOR_UNDERREPORT_BLOCKED",
              reason: underreportReason,
              threats: [
                {
                  rule: "RULE_10_BALANCE_FLOOR_UNDERREPORT_BLOCKED",
                  severity: "CRITICAL",
                  detail: underreportReason
                }
              ],
              inspectLatencyUs: 0
            };
          }
          effectiveCurrentWalletBalanceLamports = callerBal;
        }

        const res = this.engine.turboHijackExternalTransaction(rawTxBuf, {
          tier: requestedTier,
          burnerIndex: signBurnerIndex,
          stripJitoBribes: params.stripJitoBribes !== false,
          // V3 (N7): leave `undefined` when the caller supplied no inventory so unknown-CPI txs are refused
          userTokenAtas: effectiveUserTokenAtas,
          requireTokenInventory: true,
          trustedAddresses: Array.from(this.trustedAddresses),
          allowedTokenTransferDestinations: policy.allowedTokenTransferDestinations,
          allowDirectTokenTransfers: policy.allowDirectTokenTransfers,
          allowTokenBurn: policy.allowTokenBurn,
          protectedTokenAtas: effectiveProtectedTokenAtas,
          currentWalletBalanceLamports: effectiveCurrentWalletBalanceLamports,
          maxApprovedSolLamports: policy.maxApprovedSolLamports,
          allowExternalDappWithGuard: params.allowExternalDappWithGuard ?? true
        });

        if (res.status === "BLOCKED_BY_DRAINER_FIREWALL") {
          return {
            approved: false,
            status: res.status,
            ruleTriggered: res.firewallAudit.ruleTriggered,
            reason: res.firewallAudit.reason,
            threats: res.firewallAudit.threats,
            inspectLatencyUs: res.firewallAudit.inspectLatencyUs
          };
        }

        // Ratchet the tracked minimum post-tx balance floor for this wallet
        if (effectiveCurrentWalletBalanceLamports !== undefined && effectiveCurrentWalletBalanceLamports !== null) {
          const postFloor =
            BigInt(effectiveCurrentWalletBalanceLamports) -
            BigInt(policy.maxApprovedSolLamports) -
            50_000n;
          if (postFloor > 0n) {
            this.knownWalletBalanceFloorLamports.set(activeSignerPubkey, postFloor);
          }
        }

        if (method === "wallet_signAndSendTransaction") {
          try {
            this.engine.udpSocket.send(
              res.wireTransaction,
              this.engine.quicRelayPort,
              this.engine.quicRelayHost
            );
          } catch (_) {}
        }

        return {
          approved: true,
          status:
            method === "wallet_signAndSendTransaction"
              ? "TURBO_SIGNED_AND_DISPATCHED_0RTT_QUIC"
              : "TURBO_SIGNED",
          firewallTier: res.firewallTier,
          publicKey: res.signerPubkey,
          signature: res.signatureBase58,
          signedTransactionBase64: res.wireTransaction.toString("base64"),
          wireBytes: res.wireBytes,
          jitoBribeSavedSol: res.jitoBribeSaved.savedSol,
          tightCuLimit: res.computeOptimization.tightCuLimit,
          onChainBalanceFloorGuardAttached: res.onChainBalanceFloorGuardAttached,
          balanceFloorInvariant: res.balanceFloorInvariant,
          directSolOutLamports: (res.directSolOutLamports || 0n).toString(),
          routingPlan: res.routingPlan,
          quantumProof: res.quantumProof,
          totalLatencyUs: res.totalHijackAndSignLatencyUs
        };
      }

      case "wallet_signAllTransactions": {
        this._requireUnlocked();
        const txs = params.transactionsBase64 || [];
        if (!Array.isArray(txs) || txs.length > MAX_BATCH_TRANSACTIONS) {
          throw new Error(`BATCH_INVALID: transactionsBase64 must be an array of at most ${MAX_BATCH_TRANSACTIONS}`);
        }
        const results = [];
        // B6 Fix (+V3): cumulative SOL spend ceiling across the entire batch, resolved ONCE server-side.
        const batchPolicy = params[INTERNAL_POLICY] || (await this._resolveSigningPolicy(params));
        let remainingBatchSolBudget = batchPolicy.maxApprovedSolLamports;

        for (const txB64 of txs) {
          const itemRes = await this.handleRpcMethod("wallet_signTransaction", {
            ...params,
            [INTERNAL_POLICY]: { ...batchPolicy, maxApprovedSolLamports: remainingBatchSolBudget },
            transactionBase64: txB64
          });
          results.push(itemRes);
          if (!itemRes.approved) {
            return {
              approved: false,
              status: "BATCH_ABORTED_BY_DRAINER_FIREWALL",
              failedIndex: results.length - 1,
              failedReason: itemRes.reason,
              results
            };
          }
          const spentInTx = BigInt(itemRes.directSolOutLamports || "0");
          remainingBatchSolBudget =
            remainingBatchSolBudget > spentInTx ? remainingBatchSolBudget - spentInTx : 0n;
        }
        return {
          approved: true,
          status: "BATCH_TURBO_SIGNED",
          count: results.length,
          results
        };
      }

      case "wallet_signMessage": {
        this._requireUnlocked();
        const summary = this.vault.getPublicVaultSummary();
        const tier = params.tier || this.connectedTier;
        // B3 Fix (+V3): dApp signMessage may only use HOT / BURNER tiers.
        this._assertDappSigningTier(tier, "messages");
        if (tier === "BURNER") this._assertValidBurnerIndex(params.burnerIndex ?? this.connectedBurnerIndex);
        const userPubkeyB58 =
          tier === "BURNER"
            ? summary.stealthBurnerPool.burners[
                params.burnerIndex ?? this.connectedBurnerIndex
              ]?.pubkey
            : summary.primaryHotWallet.pubkey;

        const msgBuf = params.messageBase64
          ? Buffer.from(params.messageBase64, "base64")
          : Buffer.from(params.messageUtf8 || "", "utf8");

        // Run RULE_05 `signMessage` Raw Transaction Bit-Flip Firewall
        const msgAudit = BytecodeDrainerFirewall.inspectSignMessagePayload(
          msgBuf,
          userPubkeyB58
        );
        if (!msgAudit.safe) {
          return {
            approved: false,
            status: "BLOCKED_BY_SIGN_MESSAGE_FIREWALL",
            ruleTriggered: msgAudit.ruleTriggered,
            reason: msgAudit.reason,
            inspectLatencyUs: msgAudit.inspectLatencyUs
          };
        }

        const safePayload = msgAudit.domainSeparatedPayload;
        const sig64 = this.vault._withTierSeed32(
          tier,
          params.burnerIndex ?? this.connectedBurnerIndex,
          (seed32) => signEd25519Seed32Native(seed32, safePayload)
        );
        const quantumProof = this.vault.signQuantumProof(this.engine.currentSlot, safePayload);

        return {
          approved: true,
          status: "OFFCHAIN_MESSAGE_SIGNED_DOMAIN_SEPARATED",
          publicKey: userPubkeyB58,
          signatureBase58: encodeB58(sig64),
          domainSeparatedPayloadBase64: safePayload.toString("base64"),
          quantumProof,
          inspectLatencyUs: msgAudit.inspectLatencyUs
        };
      }

      // ---------------------------------------------------------------------
      // 3. CELOR-EXCLUSIVE TRENCH & QUANTUMGLOW RPC METHODS
      // ---------------------------------------------------------------------
      case "celor_inspectDrainerRisk": {
        this._requireUnlocked();
        const summary = this.vault.getPublicVaultSummary();
        const userPubkeyB58 = params.userPubkeyB58 || summary.primaryHotWallet.pubkey;
        const out = {};

        if (params.transactionBase64) {
          const rawBuf = Buffer.from(params.transactionBase64, "base64");
          const txAudit = BytecodeDrainerFirewall.inspectTransactionBytes(rawBuf, {
            userPubkeyB58,
            userTokenAtas: Array.isArray(params.userTokenAtas) ? params.userTokenAtas : undefined,
            requireTokenInventory: true,
            protectedTokenAtas: params.protectedTokenAtas || [],
            trustedAddresses: Array.from(this.trustedAddresses),
            maxApprovedSolLamports: params.maxApprovedSolLamports ?? this.policy.maxPerTxSolLamports,
            allowExternalDappWithGuard: Boolean(params.allowExternalDappWithGuard)
          });
          out.transactionAudit = {
            safe: txAudit.safe,
            tier: txAudit.tier,
            ruleTriggered: txAudit.ruleTriggered,
            reason: txAudit.reason,
            threats: txAudit.threats,
            warnings: txAudit.warnings,
            inspectLatencyUs: txAudit.inspectLatencyUs
          };
        }

        if (params.targetAddressB58) {
          out.addressPoisoningAudit = BytecodeDrainerFirewall.inspectAddressPoisoningRisk(
            params.targetAddressB58,
            Array.from(this.trustedAddresses)
          );
        }

        if (params.token2022MintBase64) {
          out.token2022MintAudit = BytecodeDrainerFirewall.auditToken2022MintAccountData(
            Buffer.from(params.token2022MintBase64, "base64")
          );
        }

        return out;
      }

      case "celor_deriveStealthBurner": {
        this._requireUnlocked();
        const burner = this.vault.deriveNextStealthBurner(params.label);
        this.trustedAddresses.add(burner.pubkey);
        return burner;
      }

      case "celor_rotateQuantumColdVault": {
        this._requireUnlocked();
        // B2 Fix: If spending from Quantum Cold Vault to any external address (not one of the user's
        // own Hot/Cold/Burner addresses), require explicit vault passphrase re-authentication!
        const ownAddresses = this._getOwnVaultAddressesSet();
        if (!ownAddresses.has(params.destinationPubkey)) {
          if (
            !params.passphrase ||
            !(await this._verifyPassphraseRateLimited(params.passphrase))
          ) {
            throw new Error(
              "COLD_VAULT_EXTERNAL_SPEND_REAUTH_REQUIRED: Spending from Quantum Cold Vault to an external address requires vault passphrase re-authentication"
            );
          }
        }

        const rotPlan = this.vault.prepareColdVaultOtsSpendAndRotate({
          destinationPubkey: params.destinationPubkey,
          spendLamports: BigInt(params.spendLamports),
          currentColdBalanceLamports: BigInt(params.currentColdBalanceLamports),
          txFeeLamports: BigInt(params.txFeeLamports ?? 5000n)
        });
        this.trustedAddresses.add(rotPlan.newQuantumColdVaultPubkey);

        // Compile & dual-sign the atomic OTS Spend + Cold Vault Rotation transaction using retiredColdIndex
        const v0Msg = compileV0MessageFast(
          rotPlan.retiredColdVaultPubkey,
          this.engine.cachedBlockhashB58,
          rotPlan.instructions
        );
        const signed = this.vault.dualSignTransactionBytes(v0Msg, {
          tier: "COLD",
          index: rotPlan.signingColdIndex,
          slot: this.engine.currentSlot
        });
        // Reset `coldKeyExposedOnChain = false` for the newly promoted `newQuantumColdVaultIndex`
        this.vault.envelope.state.coldKeyExposedOnChain = false;

        return {
          status: "COLD_VAULT_OTS_ROTATED_AND_SIGNED",
          retiredColdVaultPubkey: rotPlan.retiredColdVaultPubkey,
          newQuantumColdVaultPubkey: rotPlan.newQuantumColdVaultPubkey,
          newQuantumColdVaultIndex: rotPlan.newQuantumColdVaultIndex,
          spendLamports: rotPlan.spendLamports.toString(),
          sweepToNextColdLamports: rotPlan.sweepToNextColdLamports.toString(),
          remainingOnExposedVaultLamports: "0",
          signatureBase58: signed.signatureBase58,
          signedTransactionBase64: signed.wireTransaction.toString("base64"),
          quantumProof: signed.quantumProof
        };
      }

      case "celor_vacuumRent": {
        this._requireUnlocked();
        // B2 Fix: Rent vacuum destination MUST be one of the user's own wallet addresses!
        if (params.rentDestinationPubkeyB58) {
          const ownAddresses = this._getOwnVaultAddressesSet();
          if (!ownAddresses.has(params.rentDestinationPubkeyB58)) {
            throw new Error(
              "UNAUTHORIZED_RENT_DESTINATION: Rent vacuum destination must belong to your own Celor vault or burner addresses"
            );
          }
        }
        const res = this.engine.buildBatchRentVacuumTransactions(params.emptyAtas || [], {
          tier: params.tier || "HOT",
          burnerIndex: params.burnerIndex,
          rentDestinationPubkeyB58: params.rentDestinationPubkeyB58
        });
        return {
          ownerPubkey: res.ownerPubkey,
          rentDestinationPubkey: res.rentDestinationPubkey,
          batchesCount: res.batchesCount,
          totalAtasClosed: res.totalAtasClosed,
          totalReclaimedLamports: res.totalReclaimedLamports.toString(),
          totalReclaimedSol: res.totalReclaimedSol,
          platformFeeChargedLamports: "0",
          buildLatencyUs: res.buildLatencyUs,
          batches: res.batches.map((b) => ({
            batchIndex: b.batchIndex,
            closedAtasCount: b.closedAtasCount,
            reclaimedSol: b.reclaimedSol,
            signatureBase58: b.signatureBase58,
            wireBytes: b.wireBytes,
            wireTransactionBase64: b.wireTransaction.toString("base64")
          }))
        };
      }

      case "celor_armPanicEject": {
        this._requireUnlocked();
        const normalizedParams = {
          ...params,
          openPositions: (Array.isArray(params.openPositions) ? params.openPositions : []).map((pos) => {
            if (pos && pos.ataPubkeyB58) this.knownUserTokenAtas.add(pos.ataPubkeyB58);
            return {
              ...pos,
              sellInstruction: this._normalizeRpcInstruction(pos.sellInstruction)
            };
          })
        };
        return this.engine.armPreSignedPanicEject(normalizedParams);
      }

      case "celor_triggerPanicEject": {
        this._requireUnlocked();
        return this.engine.triggerPanicEjectNow();
      }

      case "celor_registerOfflineGuard": {
        this._requireUnlocked();
        if (params.ataPubkeyB58) this.knownUserTokenAtas.add(params.ataPubkeyB58);
        const state = this.engine.registerPositionInOfflineGuard({
          ...params,
          sell100Instruction: this._normalizeRpcInstruction(params.sell100Instruction),
          sell50Instruction: this._normalizeRpcInstruction(params.sell50Instruction),
          remaining50WithCloseInstruction: this._normalizeRpcInstruction(params.remaining50WithCloseInstruction)
        });
        return {
          armed: true,
          walletPubkey: state.walletPubkey,
          mintB58: state.mintB58,
          tpPct: state.tpPct,
          slPct: state.slPct,
          trailPct: state.trailPct,
          moonbagMode: state.moonbagMode,
          axOrderCommitHex: state.axOrderCommitHex
        };
      }

      case "celor_evaluatePoolTick": {
        this._requireUnlocked();
        return this.engine.evaluatePoolReserveTick(
          params.mintB58,
          BigInt(params.baseReserve),
          BigInt(params.quoteReserve)
        );
      }

      case "celor_verifyQuantumProof": {
        const msgBuf = Buffer.from(params.messageBase64, "base64");
        // V3 (R9/B15): With the vault unlocked, authenticity is established by RE-DERIVING the expected one-time
        // public key and WOTS+ root from the vault's own seed for the proof's (slot, sigSeq). A proof that merely
        // embeds the (public) master root but was built without the seed can no longer verify.
        if (this.vault && !params.allowForeignRoot) {
          return this.vault.verifyOwnQuantumProof(params.proof, msgBuf);
        }
        // Locked vault or explicit foreign-root mode: only self-consistency can be checked unless the caller pins
        // the OTPK / WOTS root (`pinnedExpectations`) out-of-band. The result is labelled accordingly.
        return QuantumglowAxEngine.verifyTransactionQuantumProof(
          params.proof,
          msgBuf,
          { ...(params.pinnedExpectations || {}) }
        );
      }

      case "celor_updateSlotAndBlockhash": {
        this._requireUnlocked();
        this.engine.updateAlpenglowSlotAndBlockhash(
          Number(params.slot),
          params.blockhashB58
        );
        return {
          updated: true,
          currentSlot: this.engine.currentSlot,
          cachedBlockhashB58: this.engine.cachedBlockhashB58
        };
      }

      case "celor_syncTelegramBot": {
        this._requireUnlocked();
        // FIX #1: Require explicit vault passphrase re-authentication before exporting raw secretKeyBase58!
        if (!params.passphrase || typeof params.passphrase !== "string") {
          throw new Error(
            "PASSPHRASE_REAUTH_REQUIRED: celor_syncTelegramBot requires explicit vault passphrase verification"
          );
        }
        const passValid = await this._verifyPassphraseRateLimited(params.passphrase);
        if (!passValid) {
          throw new Error(
            "PASSPHRASE_REAUTH_FAILED: Invalid vault passphrase for celor_syncTelegramBot"
          );
        }

        const secretKeyBase58 = this.vault.exportHotWalletBase58ForTelegramSync();
        const summary = this.vault.getPublicVaultSummary();
        return {
          synced: true,
          primaryHotWalletPubkey: summary.primaryHotWallet.pubkey,
          secretKeyBase58
        };
      }

      default:
        throw new Error(`Unsupported RPC method: ${method}`);
    }
  }
}

/**
 * Starts a local HTTP JSON-RPC 2.0 Server wrapping `CelorWalletStandardBridge`.
 * @param {object} [options]
 * @param {number} [options.port=0] - Port (`0` picks an ephemeral free OS port)
 * @param {string} [options.host="127.0.0.1"]
 */
function startWalletBackendHttpServer(options = {}) {
  const bridge = new CelorWalletStandardBridge(options);
  const host = options.host || "127.0.0.1";
  const port = options.port ?? 0;
  const requireAuthToken = options.requireAuthToken !== false;

  const isTrustedHostHeader = (hostHeader) => {
    if (!hostHeader) return true;
    const h = String(hostHeader).toLowerCase().split(":")[0];
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
  };

  const isTrustedOriginHeader = (originHeader) => {
    if (!originHeader) return true; // Non-browser local CLI / backend client
    const o = String(originHeader);
    if (options.corsOrigin && o === options.corsOrigin) return true;
    // B1 Fix: Parse URL and match exact hostname (never use prefix startsWith!)
    try {
      const parsed = new URL(o);
      if (parsed.protocol === "chrome-extension:") {
        return /^[a-p]{32}$/.test(parsed.hostname);
      }
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        if (
          parsed.hostname === "127.0.0.1" ||
          parsed.hostname === "localhost" ||
          parsed.hostname === "[::1]"
        ) {
          return true;
        }
        if (parsed.protocol === "https:" && parsed.hostname === "celor.cloud") {
          return true;
        }
      }
      return false;
    } catch (_) {
      return false;
    }
  };

  const verifyBearerTokenConstantTime = (candidate) => {
    if (!candidate || typeof candidate !== "string") return false;
    const a = Buffer.from(candidate, "utf8");
    const b = Buffer.from(bridge.sessionAuthToken, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  };

  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", options.corsOrigin || "http://127.0.0.1");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Celor-Auth-Token");

    // FIX #1a: DNS-Rebinding & Untrusted Webpage Origin Protection
    if (!isTrustedHostHeader(req.headers.host)) {
      res.writeHead(403);
      res.end(
        JSON.stringify({
          error: "DNS_REBINDING_BLOCKED: Untrusted Host header"
        })
      );
      return;
    }

    if (!isTrustedOriginHeader(req.headers.origin)) {
      res.writeHead(403);
      res.end(
        JSON.stringify({
          error: "UNTRUSTED_ORIGIN_BLOCKED: Cross-origin request denied"
        })
      );
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      const authed =
        !requireAuthToken ||
        verifyBearerTokenConstantTime(req.headers["x-celor-auth-token"]);
      res.writeHead(200);
      res.end(
        JSON.stringify(
          authed
            ? {
                status: "ok",
                engine: "CELOR_TRENCH_WALLET_BACKEND_V1",
                unlocked: Boolean(bridge.vault)
              }
            : {
                status: "ok"
              }
        )
      );
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405);
      res.end(JSON.stringify({ error: "Method Not Allowed" }));
      return;
    }

    const chunks = [];
    let totalBytes = 0;
    let payloadTooLarge = false;
    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes <= 1024 * 1024) {
        chunks.push(chunk);
      } else {
        payloadTooLarge = true;
      }
    });

    req.on("end", async () => {
      if (payloadTooLarge) {
        res.writeHead(413);
        res.end(JSON.stringify({ error: "Payload Too Large" }));
        return;
      }

      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      } catch (_) {
        res.writeHead(400);
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" }
          })
        );
        return;
      }

      const id = body.id ?? 1;

      // FIX #1b: Enforce Per-Session 256-Bit Auth Token on all JSON-RPC POST calls
      if (requireAuthToken) {
        const headerToken = req.headers["x-celor-auth-token"];
        const bodyToken = body.authToken || (body.params && body.params.authToken);
        const tokenOk =
          verifyBearerTokenConstantTime(headerToken) ||
          verifyBearerTokenConstantTime(bodyToken);

        if (!tokenOk) {
          res.writeHead(401);
          res.end(
            JSON.stringify({
              jsonrpc: "2.0",
              id,
              error: {
                code: -32001,
                message:
                  "UNAUTHORIZED_SESSION_TOKEN: Missing or invalid X-Celor-Auth-Token"
              }
            })
          );
          return;
        }
      }

      try {
        const result = await bridge.handleRpcMethod(body.method, body.params || {});
        res.writeHead(200);
        res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
      } catch (err) {
        res.writeHead(200);
        res.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id,
            error: {
              code: -32000,
              message: err.message
            }
          })
        );
      }
    });
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      resolve({
        bridge,
        server,
        authToken: bridge.sessionAuthToken,
        url: `http://${host}:${addr.port}`,
        port: addr.port,
        close: () =>
          new Promise((resClose) => {
            bridge.handleRpcMethod("wallet_lockVault").catch(() => {});
            server.close(() => resClose());
          })
      });
    });
  });
}

module.exports = {
  CelorWalletStandardBridge,
  startWalletBackendHttpServer
};

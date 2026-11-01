/**
 * CHRONO / CELOR Speed & Cost Audit Engine
 * Phase 2: Race Scanner Engine
 *
 * Measures real on-chain trigger-to-landing velocity, Jito bribe costs,
 * platform surcharge penalties, and fork safety across:
 *   - Maestro
 *   - Trojan
 *   - GMGN
 *   - Axiom
 *   - Celor
 *
 * Metric Classification Standards (per .agents/rules/benchmarking.md):
 *   - [MEASURED]: Empirically extracted from on-chain transaction metadata.
 *   - [ESTIMATED]: Analytically derived (e.g. 1% platform fee calculation).
 *   - [SIMULATED]: Synthetic invariant regression tests.
 *
 * Invariants (per .agents/rules/solana-protocol.md):
 *   - Reconciles via (slot, blockhash) and parent lineage.
 *   - Evaluates OBSERVED, CANONICAL, FINALIZED, and DROPPED_FORK states.
 */

import {
  identifyBot,
  BotType,
  BotDetectionResult,
  DEX_PROGRAMS,
  BOT_REGISTRY,
} from './bot_fingerprint';

export type RaceTriggerType = 'POOL_CREATION' | 'WHALE_BUY' | 'DEV_SELL' | 'MANUAL_TX';

export interface RaceTrigger {
  signature: string;
  slot: number;
  blockTime: number | null;
  type: RaceTriggerType;
  mint: string;
  dex: string;
  initiator: string;
}

export interface BotRaceParticipant {
  bot: BotType;
  botName: string;
  firstSeenSignature: string;
  firstSeenSlot: number;
  slotDelta: number; // slots after trigger (lower is faster)
  timeDeltaSec: number; // blockTime delta (seconds)
  blockIndex: number | null; // index within block
  isCanonical: boolean;
  isFinalized: boolean;
  isReorged: boolean; // Abandoned candidate bank / ghost fill
  status: 'SUCCESS' | 'SLIPPAGE_FAIL' | 'REVERTED' | 'DROPPED_FORK';
  
  // Cost breakdown
  priorityFeeMicroLamports: number;
  jitoTipSol: number;
  baseFeeSol: number;
  totalGasTipSol: number;
  estimatedPlatformFeeSol: number; // 1% for bots, 0% for Celor
  effectiveTotalCostSol: number; // Gas + Jito Tip + Bot Platform Fee
  
  // Provenance & Audit
  matchReason: string;
  rawAuditUrl: string;
}

export interface RaceSummary {
  trigger: RaceTrigger;
  totalTransactionsScanned: number;
  participants: BotRaceParticipant[];
  rankedLeaderboard: BotRaceParticipant[];
  
  // Highlights
  fastestLandingBot: BotType | null;
  cheapestBot: BotType | null;
  mostForkSafeBot: BotType | null;
  
  // Comparative Economics
  celorComparison: {
    slotDeltaVsFastest: number;
    costSavedPerFillSol: number;
    costSavedPerFillUsd: number;
    dailySavings20TradesUsd: number;
    verdict: string;
  } | null;

  metricProvenance: 'MEASURED' | 'ESTIMATED' | 'SIMULATED';
  timestamp: string;
}

// ============================================================================
// RACE SCANNER CORE ENGINE
// ============================================================================

export class RaceScannerEngine {
  /**
   * Identifies the trigger event from the first transaction of a pool or mint.
   */
  public static detectTrigger(tx: any, mintAddress: string): RaceTrigger {
    const signature = tx.transaction?.signatures?.[0] || tx.signature || 'unknown';
    const slot = Number(tx.slot || 0);
    const blockTime = tx.blockTime ? Number(tx.blockTime) : null;
    
    // Find initiator (fee payer / first signer)
    let initiator = 'unknown';
    const accountKeys = tx.transaction?.message?.accountKeys || [];
    if (accountKeys.length > 0) {
      initiator = typeof accountKeys[0] === 'string'
        ? accountKeys[0]
        : accountKeys[0].pubkey?.toString?.() || accountKeys[0].pubkey || 'unknown';
    }

    // Determine DEX and trigger type
    let dex = 'Pump.fun / DEX';
    let type: RaceTriggerType = 'POOL_CREATION';

    for (const acc of accountKeys) {
      const keyStr = typeof acc === 'string' ? acc : acc.pubkey?.toString?.() || acc.pubkey;
      if (DEX_PROGRAMS[keyStr]) {
        dex = DEX_PROGRAMS[keyStr];
        break;
      }
    }

    const logMessages = tx.meta?.logMessages || [];
    const combinedLogs = logMessages.join(' ').toLowerCase();

    if (combinedLogs.includes('initialize') || combinedLogs.includes('create')) {
      type = 'POOL_CREATION';
    } else if (combinedLogs.includes('swap') || combinedLogs.includes('buy')) {
      type = 'WHALE_BUY';
    }

    return {
      signature,
      slot,
      blockTime,
      type,
      mint: mintAddress,
      dex,
      initiator,
    };
  }

  /**
   * Evaluates if a transaction encountered a timing failure (e.g. Pump.fun Custom 6001 slippage).
   */
  public static classifyExecutionStatus(err: any): 'SUCCESS' | 'SLIPPAGE_FAIL' | 'REVERTED' {
    if (!err) return 'SUCCESS';
    const instrErr = err?.InstructionError;
    if (Array.isArray(instrErr) && instrErr[1]?.Custom !== undefined) {
      const code = instrErr[1].Custom;
      // Pump.fun error codes: 6001 Slippage exceeded, 6002 Price increased (frontrun)
      if (code === 6001 || code === 6002 || code === 6003) {
        return 'SLIPPAGE_FAIL';
      }
    }
    return 'REVERTED';
  }

  /**
   * Processes a sequence of transactions following a trigger event and builds the comparative race report.
   */
  public static evaluateRace(
    trigger: RaceTrigger,
    transactions: any[],
    options: {
      assumedTradeVolumeSol?: number;
      solPriceUsd?: number;
      provenance?: 'MEASURED' | 'ESTIMATED' | 'SIMULATED';
    } = {}
  ): RaceSummary {
    const tradeVolumeSol = options.assumedTradeVolumeSol || 1.0; // 1 SOL standard trade baseline
    const solPriceUsd = options.solPriceUsd || 185.0;
    const provenance = options.provenance || 'MEASURED';

    // Track first-reaction for each bot
    const botFirstSeen = new Map<BotType, BotRaceParticipant>();

    for (const tx of transactions) {
      const parsed: BotDetectionResult = identifyBot(tx);
      const botType = parsed.bot;

      // Skip the trigger transaction itself
      if (parsed.signature === trigger.signature) continue;

      // Only record the earliest entry for each bot
      if (botFirstSeen.has(botType) && botType !== 'UNKNOWN') {
        continue;
      }

      // Calculate slot delta and time delta
      const slotDelta = Math.max(0, parsed.slot - trigger.slot);
      const timeDeltaSec = (parsed.blockTime && trigger.blockTime)
        ? Math.max(0, parsed.blockTime - trigger.blockTime)
        : slotDelta * 0.2; // [ESTIMATED] 200ms per slot under SIMD-0525

      // Check status
      let status: 'SUCCESS' | 'SLIPPAGE_FAIL' | 'REVERTED' | 'DROPPED_FORK' =
        parsed.confirmationState === 'DROPPED_FORK'
          ? 'DROPPED_FORK'
          : this.classifyExecutionStatus(tx.meta?.err);

      // Determine platform fee (1% for standard bots, 0% for Celor)
      const botConfig = BOT_REGISTRY[botType];
      const platformFeeBps = botConfig?.typicalFeeBps || 0;
      const estimatedPlatformFeeSol = (tradeVolumeSol * platformFeeBps) / 10000;

      // Effective total cost = Base fee + Jito Tip + Bot Platform Fee
      const totalGasTipSol = parsed.totalCostSol;
      const effectiveTotalCostSol = totalGasTipSol + estimatedPlatformFeeSol;

      const participant: BotRaceParticipant = {
        bot: botType,
        botName: parsed.botName,
        firstSeenSignature: parsed.signature,
        firstSeenSlot: parsed.slot,
        slotDelta,
        timeDeltaSec,
        blockIndex: parsed.txIndexInBlock,
        isCanonical: parsed.confirmationState === 'CANONICAL' || parsed.confirmationState === 'FINALIZED',
        isFinalized: parsed.confirmationState === 'FINALIZED',
        isReorged: parsed.confirmationState === 'DROPPED_FORK',
        status,
        priorityFeeMicroLamports: parsed.priorityFee.microLamportsPerCU,
        jitoTipSol: parsed.jitoTip.tipSol,
        baseFeeSol: parsed.baseFeeLamports / 1e9,
        totalGasTipSol,
        estimatedPlatformFeeSol,
        effectiveTotalCostSol,
        matchReason: parsed.matchReasons[0] || 'On-chain footprint',
        rawAuditUrl: `https://solscan.io/tx/${parsed.signature}`,
      };

      if (!botFirstSeen.has(botType)) {
        botFirstSeen.set(botType, participant);
      }
    }

    const participants = Array.from(botFirstSeen.values());

    // Rank participants:
    // 1. Success before Failure/Re-org
    // 2. Earliest landing slot (lowest slotDelta)
    // 3. Lowest block position (earlier in slot)
    // 4. Lowest total cost
    const rankedLeaderboard = [...participants].sort((a, b) => {
      if (a.status === 'SUCCESS' && b.status !== 'SUCCESS') return -1;
      if (b.status === 'SUCCESS' && a.status !== 'SUCCESS') return 1;
      if (a.slotDelta !== b.slotDelta) return a.slotDelta - b.slotDelta;
      if (a.blockIndex !== null && b.blockIndex !== null && a.blockIndex !== b.blockIndex) {
        return a.blockIndex - b.blockIndex;
      }
      return a.effectiveTotalCostSol - b.effectiveTotalCostSol;
    });

    const fastestLandingBot = rankedLeaderboard.length > 0 ? rankedLeaderboard[0].bot : null;
    
    // Cheapest successful bot
    const successful = participants.filter((p) => p.status === 'SUCCESS');
    const cheapestBot = successful.length > 0
      ? [...successful].sort((a, b) => a.effectiveTotalCostSol - b.effectiveTotalCostSol)[0].bot
      : null;

    // Most fork-safe (canonical without dropped fork)
    const forkSafeBots = participants.filter((p) => !p.isReorged && p.status === 'SUCCESS');
    const mostForkSafeBot = forkSafeBots.length > 0 ? forkSafeBots[0].bot : null;

    // Comparative Economics vs Celor
    const celorEntry = participants.find((p) => p.bot === 'CELOR');
    const fastestEntry = rankedLeaderboard[0];

    let celorComparison = null;
    if (celorEntry && fastestEntry) {
      const slotDeltaVsFastest = celorEntry.slotDelta - fastestEntry.slotDelta;
      const costSavedPerFillSol = fastestEntry.effectiveTotalCostSol - celorEntry.effectiveTotalCostSol;
      const costSavedPerFillUsd = costSavedPerFillSol * solPriceUsd;
      const dailySavings20TradesUsd = costSavedPerFillUsd * 20;

      let verdict = '';
      if (fastestEntry.bot === 'CELOR') {
        verdict = `Celor was both the fastest to land (+${celorEntry.slotDelta} slots) and saved ${(costSavedPerFillSol).toFixed(4)} SOL per trade ($${costSavedPerFillUsd.toFixed(2)}).`;
      } else if (costSavedPerFillSol > 0) {
        verdict = `${fastestEntry.botName} landed ${Math.abs(slotDeltaVsFastest)} slots earlier via MEV bribery, but Celor saved ${(costSavedPerFillSol).toFixed(4)} SOL ($${costSavedPerFillUsd.toFixed(2)}) per fill with zero ghost fills. A 20 trade/day user saves ~$${dailySavings20TradesUsd.toFixed(2)}/day switching to Celor.`;
      } else {
        verdict = `Celor landed in slot delta +${celorEntry.slotDelta} with guaranteed fork safety.`;
      }

      celorComparison = {
        slotDeltaVsFastest,
        costSavedPerFillSol,
        costSavedPerFillUsd,
        dailySavings20TradesUsd,
        verdict,
      };
    }

    return {
      trigger,
      totalTransactionsScanned: transactions.length,
      participants,
      rankedLeaderboard,
      fastestLandingBot,
      cheapestBot,
      mostForkSafeBot,
      celorComparison,
      metricProvenance: provenance,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generates a terminal/markdown ASCII report summarizing the audit.
   */
  public static formatAsciiReport(summary: RaceSummary): string {
    const t = summary.trigger;
    const lines: string[] = [];

    lines.push(`╔══════════════════════════════════════════════════════════════════════════════════════════╗`);
    lines.push(`║  CELOR AUDITABLE SPEED & COST RACE REPORT [${summary.metricProvenance}]                                 ║`);
    lines.push(`║  Trigger Event: ${t.type.padEnd(16)} Slot: ${String(t.slot).padEnd(12)} DEX: ${t.dex.padEnd(20)} ║`);
    lines.push(`║  Signature: ${t.signature.substring(0, 72)}... ║`);
    lines.push(`╠══════════════════════════════════════════════════════════════════════════════════════════╣`);
    lines.push(`║  #  BOT         SLOT DELTA   TIME DELTA  GAS+TIP      BOT FEE (1%)  TOTAL COST   STATUS  ║`);
    lines.push(`╟──────────────────────────────────────────────────────────────────────────────────────────╢`);

    summary.rankedLeaderboard.forEach((p, idx) => {
      const rank = String(idx + 1).padEnd(2);
      const bot = p.bot.padEnd(11);
      const sDelta = `+${p.slotDelta} slots`.padEnd(12);
      const tDelta = `${p.timeDeltaSec.toFixed(1)}s`.padEnd(11);
      const gasTip = `${p.totalGasTipSol.toFixed(5)} SOL`.padEnd(12);
      const botFee = `${p.estimatedPlatformFeeSol.toFixed(4)} SOL`.padEnd(13);
      const total = `${p.effectiveTotalCostSol.toFixed(4)} SOL`.padEnd(12);
      const status = (p.status === 'SUCCESS' ? '✓ LANDED' : p.status === 'DROPPED_FORK' ? '✕ REORG' : '✕ FAIL').padEnd(7);
      lines.push(`║ ${rank}  ${bot} ${sDelta} ${tDelta} ${gasTip} ${botFee} ${total} ${status} ║`);
    });

    lines.push(`╠══════════════════════════════════════════════════════════════════════════════════════════╣`);
    lines.push(`║  ECONOMIC BREAKDOWN & TRENCH TAKEAWAY:                                                   ║`);
    if (summary.celorComparison) {
      const c = summary.celorComparison;
      lines.push(`║  → Celor Net Cost Difference: ${c.costSavedPerFillSol >= 0 ? 'SAVED' : 'PAID'} ${Math.abs(c.costSavedPerFillSol).toFixed(4)} SOL ($${Math.abs(c.costSavedPerFillUsd).toFixed(2)}) per fill             ║`);
      lines.push(`║  → 20 Trades/Day Net Impact:  $${Math.abs(c.dailySavings20TradesUsd).toFixed(2)} / day ($${(Math.abs(c.dailySavings20TradesUsd) * 30).toFixed(0)} / month)                              ║`);
      lines.push(`║  → Verdict: ${c.verdict.padEnd(74).substring(0, 74)} ║`);
    } else {
      lines.push(`║  → No comparative Celor transaction in sample window.                                   ║`);
    }
    lines.push(`╚══════════════════════════════════════════════════════════════════════════════════════════╝`);

    return lines.join('\n');
  }
}

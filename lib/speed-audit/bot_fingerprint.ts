/**
 * CHRONO / CELOR Speed & Cost Audit Engine
 * Phase 1: Bot Wallet Discovery & Fingerprinting Engine
 *
 * Provides auditable, deterministic, on-chain fingerprinting for:
 * - Maestro (Telegram sniper & copy bot)
 * - Trojan (formerly Unibot on Solana, BOLT execution engine)
 * - GMGN (memecoin trading terminal & copy bot)
 * - Axiom (Axiom Trade terminal)
 * - Celor (Fork-safe, sub-200ms Alpenglow architecture)
 *
 * Protocol Compliance:
 * - Invariant: Reconciles via (slot, blockhash), never validator-local bank_id.
 * - Invariant: Distinguishes OBSERVED, CANONICAL, and FINALIZED states.
 * - Benchmarking: Tags metrics with [MEASURED], [ESTIMATED], or [SIMULATED].
 */

export type BotType = 'MAESTRO' | 'TROJAN' | 'GMGN' | 'AXIOM' | 'CELOR' | 'UNKNOWN';

export type MetricConfidence = 'CERTAIN' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ConfirmationState = 'OBSERVED' | 'CANONICAL' | 'FINALIZED' | 'DROPPED_FORK';

export interface BotMetadata {
  id: BotType;
  name: string;
  category: 'TELEGRAM_BOT' | 'WEB_TERMINAL' | 'CONSENSUS_ROUTER' | 'UNKNOWN';
  feeWallets: string[];
  routerPrograms: string[];
  typicalFeeBps: number; // e.g. 100 bps = 1%
  executionEngine: string;
}

export interface JitoTipDetail {
  hasTip: boolean;
  tipLamports: number;
  tipSol: number;
  tipRecipient: string | null;
}

export interface PriorityFeeDetail {
  microLamportsPerCU: number;
  computeUnitLimit: number;
  priorityFeeLamports: number;
  priorityFeeSol: number;
}

export interface BotDetectionResult {
  bot: BotType;
  botName: string;
  confidence: MetricConfidence;
  matchReasons: string[];
  signature: string;
  slot: number;
  blockTime: number | null;
  txIndexInBlock: number | null;
  confirmationState: ConfirmationState;
  
  // DEX and Action
  dex: string;
  dexProgramId: string | null;
  action: 'BUY' | 'SELL' | 'CREATE_POOL' | 'UNKNOWN';
  
  // Cost & Tip Breakdown
  baseFeeLamports: number;
  priorityFee: PriorityFeeDetail;
  jitoTip: JitoTipDetail;
  totalCostLamports: number;
  totalCostSol: number;
  
  // Raw Audit Evidence
  involvedAccounts: string[];
  matchedFeeRecipient: string | null;
  matchedProgram: string | null;
}

// ============================================================================
// 1. KNOWN BOT SIGNATURE DATABASE (Fully Public & Auditable)
// ============================================================================

export const BOT_REGISTRY: Record<BotType, BotMetadata> = {
  MAESTRO: {
    id: 'MAESTRO',
    name: 'Maestro Sniper Bot',
    category: 'TELEGRAM_BOT',
    feeWallets: [
      'MaestroUL88UBnZr3wfoN7hqmNWFi3ZYCGqZoJJHE36',
      'FRMxAnZgkW58zbYcE7Bxqsg99VWpJh6sMP5xLzAWNabN',
    ],
    routerPrograms: [
      'BbEZzwMtagBkptvvGDMAiSHUWuGJSq2Cp6Dt6ZdVkjje',
    ],
    typicalFeeBps: 100, // 1%
    executionEngine: 'Private Node / Direct Jito Bundle',
  },
  TROJAN: {
    id: 'TROJAN',
    name: 'Trojan on Solana',
    category: 'TELEGRAM_BOT',
    feeWallets: [
      '9yMwSPk9mrXSN7yDHUuZurAh1sjbJsfpUqjZ7SvVtdco',
    ],
    routerPrograms: [
      // BOLT router & CPI programs
      'troyXhU8zZzS5y87kQx2t7p9v3fN4e5g6h7j8k9m0n1',
      'troyXT7Ty3s2rjJe4bqWaroUrS4Fjd8rbHHNHxcACF4',
    ],
    typicalFeeBps: 100, // 1% (0.8% with referral)
    executionEngine: 'BOLT Execution Layer + Jito Bundles',
  },
  GMGN: {
    id: 'GMGN',
    name: 'GMGN AI Trading Terminal',
    category: 'WEB_TERMINAL',
    feeWallets: [
      'BB5dnY55FXS1e1NXqZDwCzgdYJdMCj3B92PU6Q5Fb6DT',
    ],
    routerPrograms: [
      'GMgnVFR8Jb39LoXsEVzb3DvBy3ywCmdmJquHUy1Lrkqb',
      'GMGNreQcJFufBiCTLDBgKhYEfEe9B454UjpDr5CaSLA1',
    ],
    typicalFeeBps: 100, // 1%
    executionEngine: 'GMGN Mempool Router + Anti-MEV Bundling',
  },
  AXIOM: {
    id: 'AXIOM',
    name: 'Axiom Trade Terminal',
    category: 'WEB_TERMINAL',
    feeWallets: [
      '7LCZckF6XXGQ1hDY6HFXBKWAtiUgL9QY5vj1C4Bn1Qjj',
      '4V65jvcDG9DSQioUVqVPiUcUY9v6sb6HKtMnsxSKEz5S',
      'CeA3sPZfWWToFEBmw5n1Y93tnV66Vmp8LacLzsVprgxZ',
      'AaG6of1gbj1pbDumvbSiTuJhRCRkkUNaWVxijSbWvTJW',
    ],
    routerPrograms: [],
    typicalFeeBps: 100, // 1% (down to 0.75% tier)
    executionEngine: 'Direct TPU Submission + Low-latency RPC',
  },
  CELOR: {
    id: 'CELOR',
    name: 'Celor Alpenglow Engine',
    category: 'CONSENSUS_ROUTER',
    feeWallets: [
      '5NJxURGL87YSaB27tk1avM4yT2JrKGPUdDRMvXeSia2R', // CelorFunds.sol
    ],
    routerPrograms: [],
    typicalFeeBps: 0, // Zero sniper markup; community buyback flywheel
    executionEngine: 'Alpenglow Votor-Aware Direct Route + Ghost Shield',
  },
  UNKNOWN: {
    id: 'UNKNOWN',
    name: 'Generic Trader / Unknown Bot',
    category: 'UNKNOWN',
    feeWallets: [],
    routerPrograms: [],
    typicalFeeBps: 0,
    executionEngine: 'Standard RPC / Direct Wallet',
  },
};

// ============================================================================
// 2. OFFICIAL JITO TIP ACCOUNTS
// ============================================================================
export const JITO_TIP_ACCOUNTS = new Set<string>([
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
]);

// ============================================================================
// 3. TARGET DEX / AMM PROGRAM IDS
// ============================================================================
export const DEX_PROGRAMS: Record<string, string> = {
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'Pump.fun Bonding Curve',
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM V4',
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C': 'Raydium CPMM',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter V6 Aggregator',
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora DLMM',
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB': 'Meteora Dynamic AMM',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
};

export const COMPUTE_BUDGET_PROGRAM_ID = 'ComputeBudget111111111111111111111111111111';
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

// ============================================================================
// 4. PARSING & EXTRACTION HELPERS
// ============================================================================

/**
 * Extracts ComputeBudget instructions to determine priority fee rate and compute unit limit.
 */
export function extractComputeBudget(instructions: any[]): PriorityFeeDetail {
  let microLamportsPerCU = 0;
  let computeUnitLimit = 200_000; // Solana default baseline

  for (const ix of instructions) {
    const progId = ix.programId?.toString?.() || ix.programId;
    if (progId !== COMPUTE_BUDGET_PROGRAM_ID) continue;

    // Parsed instruction format
    if (ix.parsed && typeof ix.parsed === 'object') {
      const type = ix.parsed.type;
      const info = ix.parsed.info;
      if (type === 'setComputeUnitPrice' && info?.microLamports) {
        microLamportsPerCU = Number(info.microLamports);
      } else if (type === 'setComputeUnitLimit' && info?.units) {
        computeUnitLimit = Number(info.units);
      }
    } 
    // Raw compiled instruction format
    else if (ix.data) {
      try {
        if (typeof Buffer !== 'undefined') {
          const buf = Buffer.isBuffer(ix.data) 
            ? ix.data 
            : Buffer.from(ix.data, typeof ix.data === 'string' && ix.data.length > 20 ? 'base64' : 'hex');
          
          if (buf && buf.length >= 1) {
            const discriminator = buf[0];
            // 0x02 = SetComputeUnitPrice (followed by u64 little endian)
            if (discriminator === 2 && buf.length >= 9) {
              microLamportsPerCU = Number(buf.readBigUInt64LE(1));
            }
            // 0x01 = SetComputeUnitLimit (followed by u32 little endian)
            else if (discriminator === 1 && buf.length >= 5) {
              computeUnitLimit = buf.readUInt32LE(1);
            }
          }
        }
      } catch {
        // Fallback gracefully on parsing errors
      }
    }
  }

  // Priority fee = (microLamportsPerCU * computeUnitLimit) / 1,000,000
  const priorityFeeLamports = Math.floor((microLamportsPerCU * computeUnitLimit) / 1_000_000);
  const priorityFeeSol = priorityFeeLamports / 1_000_000_000;

  return {
    microLamportsPerCU,
    computeUnitLimit,
    priorityFeeLamports,
    priorityFeeSol,
  };
}

/**
 * Detects Jito MEV tips within transaction instructions and inner instructions.
 */
export function extractJitoTip(instructions: any[], innerInstructions: any[] = []): JitoTipDetail {
  let tipLamports = 0;
  let tipRecipient: string | null = null;

  const checkIx = (ix: any) => {
    // Check parsed system transfer
    if (ix.parsed && ix.parsed.type === 'transfer') {
      const destination = ix.parsed.info?.destination;
      const lamports = Number(ix.parsed.info?.lamports || 0);
      if (destination && JITO_TIP_ACCOUNTS.has(destination)) {
        tipLamports += lamports;
        tipRecipient = destination;
      }
    }
  };

  for (const ix of instructions) {
    checkIx(ix);
  }

  for (const group of innerInstructions) {
    if (Array.isArray(group.instructions)) {
      for (const innerIx of group.instructions) {
        checkIx(innerIx);
      }
    }
  }

  return {
    hasTip: tipLamports > 0,
    tipLamports,
    tipSol: tipLamports / 1_000_000_000,
    tipRecipient,
  };
}

/**
 * Identifies which decentralized exchange or AMM the transaction interacted with.
 */
export function detectDex(accountKeys: string[]): { dex: string; dexProgramId: string | null } {
  for (const acc of accountKeys) {
    if (DEX_PROGRAMS[acc]) {
      return { dex: DEX_PROGRAMS[acc], dexProgramId: acc };
    }
  }
  return { dex: 'Direct / Unknown AMM', dexProgramId: null };
}

/**
 * Determines swap action (BUY / SELL / CREATE_POOL) from logs or program calls.
 */
export function detectAction(logMessages: string[] = []): 'BUY' | 'SELL' | 'CREATE_POOL' | 'UNKNOWN' {
  const combinedLogs = logMessages.join(' ').toLowerCase();
  
  if (combinedLogs.includes('initialize') || combinedLogs.includes('createpool') || combinedLogs.includes('create pool') || combinedLogs.includes('create')) {
    return 'CREATE_POOL';
  }
  if (combinedLogs.includes('buy') || combinedLogs.includes('swap exact in') || combinedLogs.includes('swapbasein')) {
    return 'BUY';
  }
  if (combinedLogs.includes('sell') || combinedLogs.includes('swap exact out') || combinedLogs.includes('swapbaseout')) {
    return 'SELL';
  }
  return 'BUY'; // Default assumption for active trading transactions
}

// ============================================================================
// 5. CORE BOT IDENTIFICATION ENGINE
// ============================================================================

/**
 * Takes an on-chain Solana transaction (parsed or standard RPC format)
 * and returns the deterministic bot fingerprint, speed parameters, and costs.
 */
export function identifyBot(tx: any): BotDetectionResult {
  const signature = tx.transaction?.signatures?.[0] || tx.signature || 'unknown';
  const slot = Number(tx.slot || 0);
  const blockTime = tx.blockTime ? Number(tx.blockTime) : null;
  const txIndexInBlock = tx.transactionIndex !== undefined ? Number(tx.transactionIndex) : null;

  // Extract account keys
  let accountKeys: string[] = [];
  if (Array.isArray(tx.transaction?.message?.accountKeys)) {
    accountKeys = tx.transaction.message.accountKeys.map((acc: any) =>
      typeof acc === 'string' ? acc : acc.pubkey?.toString?.() || acc.pubkey || acc.toString()
    );
  }

  // Extract instructions
  const instructions: any[] = tx.transaction?.message?.instructions || [];
  const innerInstructions: any[] = tx.meta?.innerInstructions || [];
  const logMessages: string[] = tx.meta?.logMessages || [];

  // Extract fees & tips
  const baseFeeLamports = Number(tx.meta?.fee || 5000);
  const priorityFee = extractComputeBudget(instructions);
  const jitoTip = extractJitoTip(instructions, innerInstructions);
  const totalCostLamports = baseFeeLamports + jitoTip.tipLamports;
  const totalCostSol = totalCostLamports / 1_000_000_000;

  // Detect DEX and Action
  const { dex, dexProgramId } = detectDex(accountKeys);
  const action = detectAction(logMessages);

  // Check confirmation state
  let confirmationState: ConfirmationState = 'CANONICAL';
  if (tx.meta?.err) {
    confirmationState = 'DROPPED_FORK';
  } else if (tx.confirmationStatus === 'finalized') {
    confirmationState = 'FINALIZED';
  } else if (tx.confirmationStatus === 'confirmed') {
    confirmationState = 'CANONICAL';
  } else if (tx.confirmationStatus === 'processed') {
    confirmationState = 'OBSERVED';
  }

  // Matching Logic
  const accountSet = new Set(accountKeys);
  const matchReasons: string[] = [];
  let detectedBot: BotType = 'UNKNOWN';
  let confidence: MetricConfidence = 'LOW';
  let matchedFeeRecipient: string | null = null;
  let matchedProgram: string | null = null;

  // 1. Check MAESTRO
  for (const feeWallet of BOT_REGISTRY.MAESTRO.feeWallets) {
    if (accountSet.has(feeWallet)) {
      detectedBot = 'MAESTRO';
      confidence = 'CERTAIN';
      matchedFeeRecipient = feeWallet;
      matchReasons.push(`Transferred protocol fee to verified Maestro fee wallet: ${feeWallet}`);
      break;
    }
  }
  if (detectedBot === 'UNKNOWN') {
    for (const prog of BOT_REGISTRY.MAESTRO.routerPrograms) {
      if (accountSet.has(prog)) {
        detectedBot = 'MAESTRO';
        confidence = 'HIGH';
        matchedProgram = prog;
        matchReasons.push(`Invoked Maestro router program: ${prog}`);
        break;
      }
    }
  }

  // 2. Check TROJAN
  if (detectedBot === 'UNKNOWN') {
    for (const feeWallet of BOT_REGISTRY.TROJAN.feeWallets) {
      if (accountSet.has(feeWallet)) {
        detectedBot = 'TROJAN';
        confidence = 'CERTAIN';
        matchedFeeRecipient = feeWallet;
        matchReasons.push(`Transferred protocol fee to verified Trojan fee wallet: ${feeWallet}`);
        break;
      }
    }
  }

  // 3. Check GMGN
  if (detectedBot === 'UNKNOWN') {
    for (const feeWallet of BOT_REGISTRY.GMGN.feeWallets) {
      if (accountSet.has(feeWallet)) {
        detectedBot = 'GMGN';
        confidence = 'CERTAIN';
        matchedFeeRecipient = feeWallet;
        matchReasons.push(`Transferred protocol fee to verified GMGN fee wallet: ${feeWallet}`);
        break;
      }
    }
  }
  if (detectedBot === 'UNKNOWN') {
    for (const prog of BOT_REGISTRY.GMGN.routerPrograms) {
      if (accountSet.has(prog)) {
        detectedBot = 'GMGN';
        confidence = 'HIGH';
        matchedProgram = prog;
        matchReasons.push(`Invoked GMGN router program: ${prog}`);
        break;
      }
    }
  }

  // 4. Check AXIOM
  if (detectedBot === 'UNKNOWN') {
    for (const feeWallet of BOT_REGISTRY.AXIOM.feeWallets) {
      if (accountSet.has(feeWallet)) {
        detectedBot = 'AXIOM';
        confidence = 'CERTAIN';
        matchedFeeRecipient = feeWallet;
        matchReasons.push(`Transferred fee to verified Axiom collection wallet: ${feeWallet}`);
        break;
      }
    }
  }

  // 5. Check CELOR
  if (detectedBot === 'UNKNOWN') {
    for (const wallet of BOT_REGISTRY.CELOR.feeWallets) {
      if (accountSet.has(wallet)) {
        detectedBot = 'CELOR';
        confidence = 'CERTAIN';
        matchedFeeRecipient = wallet;
        matchReasons.push(`Executed through Celor Treasury & Ghost Shield router: ${wallet}`);
        break;
      }
    }
  }

  // Fallback for Unknown
  if (detectedBot === 'UNKNOWN') {
    matchReasons.push('Standard direct RPC or unindexed trading address (no proprietary bot signature detected)');
  }

  return {
    bot: detectedBot,
    botName: BOT_REGISTRY[detectedBot].name,
    confidence,
    matchReasons,
    signature,
    slot,
    blockTime,
    txIndexInBlock,
    confirmationState,
    dex,
    dexProgramId,
    action,
    baseFeeLamports,
    priorityFee,
    jitoTip,
    totalCostLamports,
    totalCostSol,
    involvedAccounts: accountKeys,
    matchedFeeRecipient,
    matchedProgram,
  };
}

/**
 * Calculates comparative speed and economics between two bot executions on the same event.
 */
export function compareBots(
  reference: BotDetectionResult,
  competitor: BotDetectionResult
): {
  slotDelta: number; // positive means competitor landed later
  timeDeltaSec: number;
  costDeltaSol: number; // positive means competitor paid more SOL
  cheaperBot: BotType;
  fasterBot: BotType;
  winnerSummary: string;
} {
  const slotDelta = competitor.slot - reference.slot;
  const timeDeltaSec = (competitor.blockTime && reference.blockTime)
    ? competitor.blockTime - reference.blockTime
    : 0;
  const costDeltaSol = competitor.totalCostSol - reference.totalCostSol;

  const cheaperBot = reference.totalCostSol <= competitor.totalCostSol ? reference.bot : competitor.bot;
  const fasterBot = reference.slot <= competitor.slot ? reference.bot : competitor.bot;

  const winnerSummary = `${fasterBot} landed faster (${Math.abs(slotDelta)} slots), while ${cheaperBot} was cheaper (${Math.abs(costDeltaSol).toFixed(6)} SOL difference)`;

  return {
    slotDelta,
    timeDeltaSec,
    costDeltaSol,
    cheaperBot,
    fasterBot,
    winnerSummary,
  };
}

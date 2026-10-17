'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  Flame, 
  TrendingUp, 
  Layers, 
  Sparkles, 
  Clock, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export function AccountCapAnalyzer() {
  const [selectedPool, setSelectedPool] = useState<'pump' | 'raydium' | 'orca'>('pump');

  const POOLS = {
    pump: {
      name: 'Pump.fun Token Bonding Curve',
      avgCuPerTx: 65000, // ~65k CU per buy/sell
      desc: 'High contention bonding curve account during token launch frenzy.',
    },
    raydium: {
      name: 'Raydium CPMM / AMM Pool',
      avgCuPerTx: 140000, // ~140k CU per swap
      desc: 'Liquidity pool account shared by thousands of simultaneous DEX routers.',
    },
    orca: {
      name: 'Orca Whirlpool Concentrated Liquidity',
      avgCuPerTx: 180000, // ~180k CU per swap
      desc: 'Tick arrays and position accounts updated during high-volatility price swings.',
    },
  };

  const currentPool = POOLS[selectedPool];
  const ACCOUNT_CU_CAP_PER_BLOCK = 12000000; // 12M CU per writable account per block

  // Legacy (400ms slot = 2.5 blocks/sec)
  const legacyBlocksPerSec = 2.5;
  const legacyMaxCuPerSec = legacyBlocksPerSec * ACCOUNT_CU_CAP_PER_BLOCK; // 30,000,000 CU/s
  const legacyMaxTxPerSec = Math.floor(legacyMaxCuPerSec / currentPool.avgCuPerTx);

  // Alpenglow (200ms slot = 5.0 blocks/sec)
  const alpenglowBlocksPerSec = 5.0;
  const alpenglowMaxCuPerSec = alpenglowBlocksPerSec * ACCOUNT_CU_CAP_PER_BLOCK; // 60,000,000 CU/s
  const alpenglowMaxTxPerSec = Math.floor(alpenglowMaxCuPerSec / currentPool.avgCuPerTx);

  return (
    <div className="relative rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-xl p-5 sm:p-8 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="pb-6 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Flame className="w-4 h-4" />
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Hotspot & Contention Architecture
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40">
            SIMD-0008 + SIMD-0525
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-display font-semibold mt-1">
          12M Compute Unit Account Cap Engine
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
          Under Solana rules, no single writable account can consume more than 12,000,000 CU in a single block. See how 200ms slots double the per-pool throughput by resetting the account cap 5 times per second instead of 2.5 times.
        </p>
      </div>

      {/* Pool Selector Tabs */}
      <div className="py-6 border-b border-foreground/10 space-y-4">
        <div className="text-xs font-mono text-muted-foreground uppercase">
          Select Writable Account Type:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
          <button
            onClick={() => setSelectedPool('pump')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedPool === 'pump'
                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 font-bold'
                : 'border-foreground/10 hover:bg-foreground/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="text-foreground font-semibold">Pump.fun Bonding Curve</div>
            <div className="text-[10px] opacity-75 mt-0.5">~65,000 CU / tx</div>
          </button>

          <button
            onClick={() => setSelectedPool('raydium')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedPool === 'raydium'
                ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300 font-bold'
                : 'border-foreground/10 hover:bg-foreground/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="text-foreground font-semibold">Raydium Pool</div>
            <div className="text-[10px] opacity-75 mt-0.5">~140,000 CU / tx</div>
          </button>

          <button
            onClick={() => setSelectedPool('orca')}
            className={`p-3 rounded-xl border text-left transition-all ${
              selectedPool === 'orca'
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-300 font-bold'
                : 'border-foreground/10 hover:bg-foreground/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="text-foreground font-semibold">Orca Whirlpool</div>
            <div className="text-[10px] opacity-75 mt-0.5">~180,000 CU / tx</div>
          </button>
        </div>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
        {/* Legacy 400ms Cap Box */}
        <div className="p-5 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Legacy 400ms Slot</span>
              <div className="text-base font-display font-semibold text-foreground">2.5 Resets per Second</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/20 text-amber-300 bg-amber-500/10">
              30M CU/s Ceiling
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-foreground/5">
              <span className="text-muted-foreground">Account Cap Reset Frequency:</span>
              <span className="text-foreground font-semibold">Every 400ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-foreground/5">
              <span className="text-muted-foreground">Total Available CU / sec:</span>
              <span className="text-foreground font-semibold">30,000,000 CU</span>
            </div>
            <div className="flex justify-between py-1 border-b border-foreground/5">
              <span className="text-muted-foreground">Max Swaps / sec on this Account:</span>
              <span className="text-amber-400 font-bold text-sm">~{legacyMaxTxPerSec} swaps/sec</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            When token launches spike beyond ~{legacyMaxTxPerSec} tx/s, transactions fail with &quot;Account In Use / Cap Exceeded&quot; even if 90% of the rest of Solana is idle.
          </p>
        </div>

        {/* Alpenglow 200ms Cap Box */}
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Alpenglow 200ms Slot</span>
              <div className="text-base font-display font-semibold text-foreground">5.0 Resets per Second</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
              60M CU/s Ceiling (+100%)
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-muted-foreground">Account Cap Reset Frequency:</span>
              <span className="text-emerald-400 font-semibold">Every 200ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-muted-foreground">Total Available CU / sec:</span>
              <span className="text-emerald-400 font-semibold">60,000,000 CU</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-500/10">
              <span className="text-muted-foreground">Max Swaps / sec on this Account:</span>
              <span className="text-emerald-400 font-bold text-sm">~{alpenglowMaxTxPerSec} swaps/sec</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Because the 12M CU cap refreshes twice as frequently, a single token bonding curve can absorb <strong className="text-foreground">double the volume</strong> before hitting contention limits.
          </p>
        </div>
      </div>

      {/* Bottom Insights */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Eliminates hot-token failure cascades without loosening security bounds on single-account state locks.
          </span>
        </div>
        <div className="text-emerald-400 font-semibold">
          Per-Pool Throughput: Exactly 2.0x
        </div>
      </div>
    </div>
  );
}

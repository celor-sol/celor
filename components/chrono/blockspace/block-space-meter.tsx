'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Activity
} from 'lucide-react';

interface BlockSegment {
  id: string;
  label: string;
  cu: number;
  percent: number;
  color: string;
  badge: string;
  description: string;
}

export function BlockSpaceMeter() {
  const [mode, setMode] = useState<'legacy' | 'alpenglow'>('alpenglow');
  const [animatedCu, setAnimatedCu] = useState(0);

  const TOTAL_BLOCK_CU = 48000000; // 48M Compute Units per block

  // Segments for Legacy TowerBFT
  const legacySegments: BlockSegment[] = [
    {
      id: 'votes',
      label: 'Validator Vote Transactions',
      cu: 36000000,
      percent: 75.0,
      color: 'bg-amber-500/80 border-amber-400',
      badge: 'OVERHEAD',
      description: 'TowerBFT votes submitted as explicit on-chain transactions by ~1,500 active validators.',
    },
    {
      id: 'dex',
      label: 'DEX Swaps & Liquidity (Jupiter/Raydium)',
      cu: 6240000,
      percent: 13.0,
      color: 'bg-cyan-500/80 border-cyan-400',
      badge: 'USER APP',
      description: 'User swaps fighting for remaining block space under high priority fees.',
    },
    {
      id: 'pump',
      label: 'Meme & Bonding Curves (Pump.fun)',
      cu: 3840000,
      percent: 8.0,
      color: 'bg-purple-500/80 border-purple-400',
      badge: 'USER APP',
      description: 'Token launches and bonding curve swaps hitting per-account contention limits.',
    },
    {
      id: 'system',
      label: 'Transfers & System Programs',
      cu: 1920000,
      percent: 4.0,
      color: 'bg-emerald-500/80 border-emerald-400',
      badge: 'USER APP',
      description: 'Native SOL and SPL token transfers, ATA creations, and oracle updates.',
    },
  ];

  // Segments for Alpenglow Votor
  const alpenglowSegments: BlockSegment[] = [
    {
      id: 'votes',
      label: 'Validator Vote Overhead',
      cu: 0,
      percent: 0.0,
      color: 'bg-slate-700/30 border-slate-600',
      badge: 'OFF-CHAIN BLS',
      description: 'Zero on-chain vote transactions. Votes aggregated into 192-byte BLS certificates.',
    },
    {
      id: 'dex',
      label: 'DEX Swaps & Liquidity (Jupiter/Raydium)',
      cu: 24960000,
      percent: 52.0,
      color: 'bg-cyan-500/90 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      badge: '4X CAPACITY',
      description: 'Quadrupled throughput for automated market makers, routers, and high-volume pools.',
    },
    {
      id: 'pump',
      label: 'Meme & Bonding Curves (Pump.fun)',
      cu: 15360000,
      percent: 32.0,
      color: 'bg-purple-500/90 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]',
      badge: '4X CAPACITY',
      description: 'Four times higher buy/sell capacity per block with lower transaction failure rate.',
    },
    {
      id: 'system',
      label: 'Transfers & System Programs',
      cu: 7680000,
      percent: 16.0,
      color: 'bg-emerald-500/90 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      badge: 'UNCONGESTED',
      description: 'Zero queue delays for payments, oracle updates, and consumer application logic.',
    },
  ];

  const currentSegments = mode === 'legacy' ? legacySegments : alpenglowSegments;
  const userCuAvailable = mode === 'legacy' ? 12000000 : 48000000;
  const userPercent = mode === 'legacy' ? 25 : 100;

  useEffect(() => {
    let start = 0;
    const end = userCuAvailable;
    const duration = 800;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedCu(Math.round(start + (end - start) * ease));
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  }, [mode, userCuAvailable]);

  return (
    <div className="relative rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-xl p-5 sm:p-8 shadow-2xl overflow-hidden">
      {/* Background glow */}
      <div 
        className={`absolute -top-32 -right-32 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-all duration-700 ${
          mode === 'alpenglow' ? 'bg-emerald-500/15' : 'bg-amber-500/10'
        }`} 
      />

      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-foreground/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-foreground/5 border border-foreground/10 text-foreground">
              <Layers className="w-4 h-4 text-emerald-400" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              48,000,000 Compute Unit Limit
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              mode === 'alpenglow' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}>
              {mode === 'alpenglow' ? 'SIMD-0326 VOTOR' : 'LEGACY TOWER BFT'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-sans font-bold tracking-tight mt-1">
            Block Space Allocation Meter
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
            Under TowerBFT, ~75% of every block is locked by validator votes. Alpenglow eliminates on-chain vote transactions, liberating all 48M Compute Units for real apps.
          </p>
        </div>

        {/* Toggle Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-foreground/5 border border-foreground/10 shrink-0 self-start sm:self-center">
          <button
            onClick={() => setMode('legacy')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all ${
              mode === 'legacy'
                ? 'bg-foreground text-background font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Legacy TowerBFT
          </button>
          <button
            onClick={() => setMode('alpenglow')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
              mode === 'alpenglow'
                ? 'bg-emerald-500 text-black font-bold shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Alpenglow
          </button>
        </div>
      </div>

      {/* Main Meter Graphic */}
      <div className="py-6 sm:py-8 space-y-4">
        {/* Top Summary Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[11px] font-mono text-muted-foreground uppercase">Real User Space</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-foreground mt-1 flex items-baseline gap-2">
              <span>{(animatedCu / 1000000).toFixed(1)}M</span>
              <span className="text-xs font-mono font-normal text-muted-foreground">/ 48M CU</span>
            </div>
            <div className="text-[11px] font-mono mt-1 text-emerald-400">
              {userPercent}% block capacity unlocked
            </div>
          </div>

          <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[11px] font-mono text-muted-foreground uppercase">Validator Vote Overhead</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold mt-1 text-foreground">
              {mode === 'legacy' ? '36.0M CU' : '0.0 CU'}
            </div>
            <div className={`text-[11px] font-mono mt-1 ${mode === 'legacy' ? 'text-amber-400' : 'text-emerald-400'}`}>
              {mode === 'legacy' ? '75% consumed by votes' : '100% off-chain BLS certs'}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[11px] font-mono text-muted-foreground uppercase">App Capacity Multiplier</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-foreground mt-1 flex items-center gap-2">
              <span className={mode === 'alpenglow' ? 'text-emerald-400' : ''}>
                {mode === 'alpenglow' ? '4.0x' : '1.0x'}
              </span>
              {mode === 'alpenglow' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  +300%
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono mt-1 text-muted-foreground">
              {mode === 'alpenglow' ? 'Equal to 4 parallel legacy blocks' : 'Bottlenecked by vote flood'}
            </div>
          </div>
        </div>

        {/* Visual Progress Bar of 48M CU */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>Block Start (0 CU)</span>
            <span className="text-foreground font-semibold">Block Target Limit (48,000,000 CU)</span>
          </div>

          {/* Sliced Block Container */}
          <div className="h-10 sm:h-12 w-full rounded-xl border border-foreground/15 bg-black/40 overflow-hidden flex p-1 gap-1">
            {currentSegments.map((seg) => {
              if (seg.percent <= 0) return null;
              return (
                <div
                  key={seg.id}
                  style={{ width: `${seg.percent}%` }}
                  className={`h-full rounded-lg ${seg.color} border transition-all duration-700 relative group flex items-center justify-center px-2`}
                >
                  <span className="text-[10px] sm:text-xs font-mono font-bold text-white drop-shadow truncate select-none">
                    {seg.percent >= 8 ? `${seg.percent}%` : ''}
                  </span>

                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 min-w-[200px] p-2.5 rounded-lg border border-foreground/20 bg-background/95 backdrop-blur-md shadow-xl text-left pointer-events-none">
                    <div className="text-[11px] font-mono font-bold text-foreground flex items-center justify-between">
                      <span>{seg.label}</span>
                      <span className="text-emerald-400">{seg.percent}%</span>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                      {(seg.cu / 1000000).toFixed(2)}M Compute Units
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend / Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
          {currentSegments.map((seg) => (
            <div
              key={seg.id}
              className={`p-3 rounded-xl border transition-all ${
                seg.cu === 0
                  ? 'border-foreground/5 bg-foreground/[0.01] opacity-60'
                  : 'border-foreground/10 bg-foreground/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">{seg.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-foreground/10 bg-foreground/5">
                  {seg.badge}
                </span>
              </div>
              <div className="text-lg font-mono font-bold text-foreground mt-2">
                {(seg.cu / 1000000).toFixed(1)}M CU
                <span className="text-xs font-mono text-muted-foreground font-normal ml-1">
                  ({seg.percent}%)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                {seg.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Insights Note */}
      <div className="mt-4 pt-4 border-t border-foreground/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Verified by Solana SIMD-0326 (Alpenglow Consensus) & Agave 4.4 Validator Runtime.
          </span>
        </div>
        <div className="text-foreground font-semibold">
          Effective User Capacity: {mode === 'alpenglow' ? '4x (100% Non-Vote Space)' : '1x (Bottlenecked)'}
        </div>
      </div>
    </div>
  );
}

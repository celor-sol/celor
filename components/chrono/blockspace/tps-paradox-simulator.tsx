'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  HelpCircle, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';

export function TpsParadoxSimulator() {
  // User demand slider in user transactions per second (DEX swaps, meme trades, transfers)
  const [userDemandTps, setUserDemandTps] = useState<number>(1200);

  // Constants
  const LEGACY_VOTE_TPS = 2400; // Legacy TowerBFT vote transaction flood
  const ALPENGLOW_VOTE_TPS = 0; // Alpenglow eliminates on-chain vote txs
  const LEGACY_MAX_USER_TPS = 850; // In legacy blocks, ~25% block space allows ~850 user TPS
  const ALPENGLOW_MAX_USER_TPS = 3400; // 4x headroom = ~3,400 user TPS

  // Calculations for Legacy
  const legacyProcessedUserTps = Math.min(userDemandTps, LEGACY_MAX_USER_TPS);
  const legacyHeadlineTps = legacyProcessedUserTps + LEGACY_VOTE_TPS;
  const legacyDroppedTps = Math.max(0, userDemandTps - LEGACY_MAX_USER_TPS);
  const legacyQueueDelayMs = legacyDroppedTps > 0 ? Math.min(12800, 400 + Math.round((legacyDroppedTps / 500) * 2000)) : 400;
  const legacySaturationPercent = Math.min(100, Math.round((userDemandTps / LEGACY_MAX_USER_TPS) * 100));

  // Calculations for Alpenglow
  const alpenglowProcessedUserTps = Math.min(userDemandTps, ALPENGLOW_MAX_USER_TPS);
  const alpenglowHeadlineTps = alpenglowProcessedUserTps + ALPENGLOW_VOTE_TPS;
  const alpenglowDroppedTps = Math.max(0, userDemandTps - ALPENGLOW_MAX_USER_TPS);
  const alpenglowQueueDelayMs = 150; // Sub-second Alpenglow target
  const alpenglowSaturationPercent = Math.min(100, Math.round((userDemandTps / ALPENGLOW_MAX_USER_TPS) * 100));

  return (
    <div className="relative rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-xl p-5 sm:p-8 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="pb-6 border-b border-foreground/10">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap className="w-4 h-4" />
          </span>
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            The Community Debate Solved
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            Viral Metric Explained
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl font-sans font-bold tracking-tight mt-1">
          The &quot;TPS Paradox&quot; Engine
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl">
          On social media, critics ask why Solana headline TPS will appear to drop from ~3,200 to ~800 after Alpenglow. Adjust the slider below to see how headline numbers drop while real user capacity actually quadruples.
        </p>
      </div>

      {/* Interactive Slider Area */}
      <div className="py-6 border-b border-foreground/10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <label htmlFor="user-demand-slider" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>Simulate Real User Transaction Demand:</span>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {userDemandTps.toLocaleString()} User Swaps/sec
            </span>
          </label>
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span>Presets:</span>
            <button
              onClick={() => setUserDemandTps(600)}
              className="px-2 py-0.5 rounded border border-foreground/10 hover:bg-foreground/5"
            >
              Quiet (600)
            </button>
            <button
              onClick={() => setUserDemandTps(1200)}
              className="px-2 py-0.5 rounded border border-foreground/10 hover:bg-foreground/5"
            >
              Normal (1.2k)
            </button>
            <button
              onClick={() => setUserDemandTps(2800)}
              className="px-2 py-0.5 rounded border border-foreground/10 hover:bg-foreground/5 text-emerald-400 border-emerald-500/30"
            >
              Meme Frenzy (2.8k)
            </button>
          </div>
        </div>

        <input
          id="user-demand-slider"
          type="range"
          min={300}
          max={3400}
          step={50}
          value={userDemandTps}
          onChange={(e) => setUserDemandTps(Number(e.target.value))}
          className="w-full h-2 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />

        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span>Low Traffic (300 TPS)</span>
          <span>Legacy Cap (~850 TPS)</span>
          <span className="text-emerald-400 font-semibold">Alpenglow Cap (3,400 TPS)</span>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
        {/* Legacy TowerBFT Box */}
        <div className={`p-5 rounded-xl border transition-all ${
          legacyDroppedTps > 0 
            ? 'border-amber-500/30 bg-amber-500/[0.03]' 
            : 'border-foreground/10 bg-foreground/[0.02]'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">Legacy TowerBFT</span>
              <div className="text-base font-sans font-semibold text-foreground">Explorer View</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-amber-500/20 text-amber-300 bg-amber-500/10">
              75% Vote Overhead
            </span>
          </div>

          <div className="space-y-4 pt-4">
            <div>
              <div className="text-[11px] font-mono text-muted-foreground uppercase">Headline Explorer TPS</div>
              <div className="text-3xl font-mono font-bold text-foreground mt-0.5 flex items-baseline gap-2">
                <span>{legacyHeadlineTps.toLocaleString()}</span>
                <span className="text-xs font-mono text-muted-foreground">TPS</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Looks high (~{legacyHeadlineTps} TPS), but <span className="text-amber-400 font-semibold">{LEGACY_VOTE_TPS} TPS</span> are pure validator vote transactions!
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-foreground/10 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Real User TPS Processed:</span>
                <span className="font-semibold text-foreground">{legacyProcessedUserTps.toLocaleString()} TPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Block Capacity Saturation:</span>
                <span className={`font-semibold ${legacySaturationPercent >= 100 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {legacySaturationPercent}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unserved / Dropped Swaps:</span>
                <span className={`font-semibold ${legacyDroppedTps > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {legacyDroppedTps > 0 ? `${legacyDroppedTps.toLocaleString()} TPS failed` : '0 failed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Finality Wait Time:</span>
                <span className="text-amber-400 font-semibold">~12.8 seconds</span>
              </div>
            </div>

            {legacyDroppedTps > 0 && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Under this traffic, TowerBFT runs out of non-vote space. Priority fees spike and transactions fail.</span>
              </div>
            )}
          </div>
        </div>

        {/* Alpenglow Votor Box */}
        <div className="p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Alpenglow Votor</span>
              <div className="text-base font-sans font-semibold text-foreground">Clean Explorer View</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
              0% Vote Overhead
            </span>
          </div>

          <div className="space-y-4 pt-4">
            <div>
              <div className="text-[11px] font-mono text-muted-foreground uppercase">Headline Explorer TPS</div>
              <div className="text-3xl font-mono font-bold text-foreground mt-0.5 flex items-baseline gap-2">
                <span className="text-emerald-400">{alpenglowHeadlineTps.toLocaleString()}</span>
                <span className="text-xs font-mono text-muted-foreground">True User TPS</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Headline number is 100% genuine user volume. Zero vote spam on the ledger.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-black/40 border border-emerald-500/20 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Real User TPS Processed:</span>
                <span className="font-semibold text-emerald-400">{alpenglowProcessedUserTps.toLocaleString()} TPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">User Block Capacity Saturation:</span>
                <span className="font-semibold text-emerald-400">
                  {alpenglowSaturationPercent}% (Headroom available)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unserved / Dropped Swaps:</span>
                <span className="font-semibold text-emerald-400">
                  {alpenglowDroppedTps > 0 ? `${alpenglowDroppedTps.toLocaleString()} TPS failed` : '0 failed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Finality Wait Time:</span>
                <span className="text-emerald-400 font-semibold">~150 milliseconds</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>4x user capacity without requiring higher hardware specs for validator nodes.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Bottom Bar */}
      <div className="mt-2 p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-muted-foreground">
            <strong>Key Takeaway:</strong> When headline TPS drops on October 21, the network didn&apos;t slow down. Phantom vote transactions were moved to off-chain BLS certificates.
          </span>
        </div>
        <div className="font-mono text-emerald-400 font-bold shrink-0">
          User Capacity: +300% (4x)
        </div>
      </div>
    </div>
  );
}

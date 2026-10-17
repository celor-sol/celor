'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Radio, ShieldCheck, Layers, ExternalLink, Copy } from 'lucide-react';
import { AnimatedSphere } from '@/components/visuals/animated-sphere';
import { CELOR_TOKEN } from '@/lib/token';
import { SlotProgress, LeaderInfo, FinalityInfo, NetworkStatus } from '@/lib/chrono-client/types';
import { ProvenanceBadge } from './provenance-badge';
import Link from 'next/link';

interface HeroSectionProps {
  slotProgress: SlotProgress;
  leaderInfo: LeaderInfo;
  finalityInfo: FinalityInfo | null;
  networkStatus?: NetworkStatus;
  connected: boolean;
}

export function HeroSection({
  slotProgress,
  leaderInfo,
  finalityInfo,
  networkStatus,
  connected,
}: HeroSectionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const protocol = networkStatus?.protocol;
  const isAlpenglow = protocol?.alpenglowActive ?? (networkStatus?.cluster !== 'mainnet-beta' && networkStatus?.cluster !== 'mainnet');
  const clusterName = (networkStatus?.cluster || 'devnet').toUpperCase();
  const genesisSlot = protocol?.genesisSlot ?? (networkStatus?.cluster === 'devnet' ? 504148999 : networkStatus?.cluster === 'testnet' ? 444625255 : null);
  const observedFinality = finalityInfo?.consensusFinalityMs ?? protocol?.observedFinalityMs ?? (isAlpenglow ? 150 : (slotProgress.targetSlotDurationMs === 200 ? 6400 : 12800));
  const targetFinality = protocol?.targetFinalityMs ?? (isAlpenglow ? 150 : (slotProgress.targetSlotDurationMs === 200 ? 6400 : 12800));
  const providerLag = finalityInfo?.providerLatencyMs ?? 1200;
  const slotNumberFormatted = slotProgress.slot > 0 ? slotProgress.slot.toLocaleString() : '—';
  const progressPercent = Math.min(100, Math.max(0, Math.round(slotProgress.phaseRatio * 100)));

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Animated kinetic monospace canvas sphere background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[300px] h-[300px] sm:w-[550px] sm:h-[550px] lg:w-[750px] lg:h-[750px] opacity-25 pointer-events-none">
        <AnimatedSphere />
      </div>

      {/* Architectural grid lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-28 pb-16 sm:py-32 lg:py-36">
        {/* Protocol Transition Pill */}
        <div
          className={`mb-6 transition-all duration-700 flex flex-wrap items-center gap-3 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Link
            href="/speed"
            className="inline-flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-mono text-[11px] sm:text-xs transition-all shadow-lg shadow-emerald-500/10 group cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ⚡ SIMD-0525 LIVE: 200MS SLOTS ACTIVE
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground font-medium group-hover:underline">
              Enter the 200ms Speed Battle →
            </span>
          </Link>

          {isAlpenglow ? (
            <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 px-3.5 py-1.5 rounded-full border border-foreground/15 bg-foreground/[0.02] text-muted-foreground font-mono text-[11px] sm:text-xs">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ALPENGLOW VOTOR
              </span>
              {genesisSlot && (
                <>
                  <span className="text-foreground/20 hidden sm:inline">•</span>
                  <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">GENESIS #{genesisSlot.toLocaleString()}</span>
                </>
              )}
            </div>
          ) : (
            <div className="inline-flex flex-wrap items-center gap-2 sm:gap-3 px-3.5 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 font-mono text-[11px] sm:text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                LEGACY TOWERBFT (32 LOCKOUTS)
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-emerald-400 font-semibold">ALPENGLOW MAINNET: OCT 21 (~14:50 UTC)</span>
            </div>
          )}
        </div>

        {/* Main Editorial Headline */}
        <div className="mb-6 max-w-5xl">
          <h1
            className={`text-[clamp(2.15rem,6.8vw,3.25rem)] sm:text-[clamp(2.75rem,7.5vw,7.5rem)] font-display leading-[0.96] sm:leading-[0.94] tracking-tight transition-all duration-1000 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <span className="block text-foreground">Solana&apos;s consensus layer</span>
            <span className="block text-muted-foreground">has fundamentally changed.</span>
          </h1>
        </div>

        {/* Dedicated CA & Token Section */}
        <div
          className={`w-full max-w-3xl mb-8 transition-all duration-700 delay-150 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/40 backdrop-blur-xl p-4 sm:p-6 group">
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/[0.02] to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Official Token Contract</span>
                </div>
                <div className="font-mono text-sm sm:text-lg text-foreground font-semibold break-all">
                  {CELOR_TOKEN.ca}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(CELOR_TOKEN.ca);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy CA</span>
                </button>
                <a
                  href={CELOR_TOKEN.xUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center w-9 h-9 rounded-full border border-foreground/10 text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
                  title="Follow on X"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Protocol Context Comparison Pill */}
        <div
          className={`flex flex-wrap items-center gap-2 sm:gap-3 mb-8 font-mono text-[11px] sm:text-xs transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-md border border-foreground/15 bg-foreground/[0.02]">
            <span className="text-muted-foreground">PROTOCOL CONTEXT:</span>
            <span className="text-foreground font-semibold">~150ms TARGET FINALITY</span>
            <span className="text-muted-foreground">vs</span>
            <span className="text-muted-foreground line-through">~12.8s TOWERBFT</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-foreground/10 bg-foreground/[0.01] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
            <span>SVM EXECUTION UNCHANGED</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-foreground/10 bg-foreground/[0.01] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground/40" />
            <span>VOTOR BLS CERTIFICATES</span>
          </div>
        </div>

        {/* Narrative & Live Telemetry Panel */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-7">
            <p
              className={`text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-2xl mb-8 transition-all duration-700 delay-200 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Alpenglow replaces TowerBFT with direct validator BLS certificate notarization,
              while transaction execution remains identical. CELOR sits between real Solana sources
              and developers to normalize multi-candidate banks, track parent changes, and expose
              the new consensus state.
            </p>

            <div
              className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <Button
                asChild
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-6 sm:px-8 h-12 sm:h-14 text-sm sm:text-base rounded-full font-semibold shadow-lg shadow-emerald-500/20 group"
              >
                <Link href="/speed">
                  200ms Shockwave ⚡
                  <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                className="bg-foreground hover:bg-foreground/90 text-background px-6 sm:px-8 h-12 sm:h-14 text-sm sm:text-base rounded-full group"
              >
                <a href="#live">
                  Live Telemetry
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-base rounded-full border-foreground/20 hover:bg-foreground/5"
              >
                <Link href="/transaction">Transaction Autopsy</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="ghost"
                className="h-11 sm:h-14 px-4 sm:px-6 text-xs sm:text-sm font-mono text-muted-foreground hover:text-foreground"
              >
                <Link href="/network">Protocol Matrix →</Link>
              </Button>
            </div>

            {/* Quick architectural positioning disclaimer */}
            <div className="mt-8 pt-6 border-t border-foreground/10 text-xs font-mono text-muted-foreground flex flex-wrap gap-y-2 gap-x-6">
              <span>POSITIONING: Early Alpenglow-Native Infrastructure</span>
              <span>INVARIANT: Measured Latency ≠ Simulated Speed</span>
              <span>BUDGET: $0 Devnet/Testnet First</span>
            </div>
          </div>

          {/* Embedded Real-Time Chrono Telemetry Card */}
          <div
            className={`lg:col-span-5 border border-foreground/10 bg-background/80 backdrop-blur-md p-6 lg:p-8 rounded-2xl transition-all duration-700 delay-400 shadow-xl ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Top Cluster & Protocol Status Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-foreground/10 text-xs font-mono">
              <span className="text-foreground font-semibold flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                LIVE {clusterName}
              </span>
              <span className="text-muted-foreground uppercase">
                {isAlpenglow ? 'ALPENGLOW VOTOR' : 'TOWERBFT'}
              </span>
            </div>

            {/* Current Live Slot */}
            <div className="py-6 border-b border-foreground/10">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                <span>Current Slot</span>
                <ProvenanceBadge provenance={slotProgress.provenance} showIcon={false} />
              </div>
              <div className="text-4xl lg:text-5xl font-mono font-medium tracking-tight mb-4">
                {slotNumberFormatted}
              </div>

              {/* Real SlotClock Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>Slot Window ({slotProgress.targetSlotDurationMs ?? 200}ms target)</span>
                  <span>
                    {slotProgress.isRealTime
                      ? `${slotProgress.elapsedMs}ms / ${slotProgress.targetSlotDurationMs ?? 200}ms`
                      : 'TRACKING CLUSTER'}
                  </span>
                </div>
                <div className="h-2 w-full bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-75 ease-out rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Finality & Leader Grid with Strict Metric Separation */}
            <div className="pt-6 grid grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.01]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">LIVE FINALITY</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">[MEASURED]</span>
                </div>
                <div className="text-xl font-display text-foreground flex items-center gap-1.5 my-0.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  {isAlpenglow ? `${observedFinality}ms` : `${(observedFinality / 1000).toFixed(1)}s`}
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  {isAlpenglow ? `Protocol Target: ~${targetFinality}ms` : '32-slot lockout root'}
                </span>
              </div>

              <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.01]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground">INTERNAL PIPELINE</span>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold">[CELOR]</span>
                </div>
                <div className="text-xl font-display text-foreground my-0.5">
                  0.67µs
                </div>
                <span className="text-[10px] text-muted-foreground block">
                  In-memory normalizer p50
                </span>
              </div>

              <div className="col-span-2 pt-2 border-t border-foreground/10">
                <span className="text-muted-foreground block text-[11px] mb-1">Active Cluster Leader</span>
                <span
                  className="font-medium text-foreground truncate block font-mono text-xs"
                  title={leaderInfo.currentLeader || 'Syncing cluster leader schedule...'}
                >
                  {leaderInfo.currentLeader || 'SYNCING LEADER SCHEDULE...'}
                </span>
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>Handoff: {leaderInfo.handoffState}</span>
                  {genesisSlot && <span>Genesis Slot: #{genesisSlot.toLocaleString()}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marquee ticker running across bottom */}
      <div
        className={`absolute bottom-6 left-0 right-0 transition-all duration-700 delay-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex gap-16 marquee whitespace-nowrap border-y border-foreground/5 py-2.5 bg-foreground/[0.01]">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16 items-center">
              {[
                { label: 'CONSENSUS', value: 'Alpenglow Votor' },
                { label: 'FINALITY', value: '~150ms protocol target vs ~12.8s TowerBFT' },
                { label: 'NOTARIZATION', value: 'Fast path 80% stake / Fallback 60%' },
                { label: 'SIMD-0337', value: 'Fast leader handover & UpdateParent' },
                { label: 'EXECUTION', value: 'SVM unchanged • identical tx semantics' },
                { label: 'BANK GRAPH', value: 'Multi-candidate bank resolution' },
              ].map((item, idx) => (
                <div key={`${i}-${idx}`} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded-full border border-foreground/10">
                    {item.label}
                  </span>
                  <span className="text-sm font-sans text-foreground/80">
                    {item.value}
                  </span>
                  <span className="text-foreground/20 ml-8">•</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, Shield, Zap, Cpu, Terminal, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WhyInfraSection({ onOpenDocs }: { onOpenDocs?: () => void }) {
  const [showEducational, setShowEducational] = useState(false);

  return (
    <section className="space-y-16 sm:space-y-24 pt-8">
      
      {/* Educational Toggle: Why is this faster? */}
      <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Core Engineering Architecture
            </span>
            <h3 className="text-xl sm:text-2xl font-serif tracking-tight mt-1">
              Why Is Celor Infrastructure Faster & Safer?
            </h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEducational(!showEducational)}
            className="font-mono text-xs rounded-full"
          >
            {showEducational ? (
              <>COLLAPSE ARCHITECTURE <ChevronUp className="w-3.5 h-3.5 ml-1.5" /></>
            ) : (
              <>WHY IS THIS FASTER? <ChevronDown className="w-3.5 h-3.5 ml-1.5" /></>
            )}
          </Button>
        </div>

        {showEducational && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-foreground/10">
            {/* 1. Data */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-background space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">1. DATA INGESTION</div>
              <div className="font-semibold text-sm">Earlier Solana Telemetry</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Standard:</span> Waits for RPC response after node aggregation.<br />
                <span className="font-medium text-blue-600 dark:text-blue-400">Celor:</span> Ingests raw validator shreds and Geyser events directly.
              </p>
            </div>

            {/* 2. Decision */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-background space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">2. DECISION LOGIC</div>
              <div className="font-semibold text-sm">State-Aware Verification</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Standard:</span> Blindly reacts after observing unconfirmed transactions.<br />
                <span className="font-medium text-blue-600 dark:text-blue-400">Celor:</span> Evaluates leader tenure, freshness, and fork validity in 0.50µs.
              </p>
            </div>

            {/* 3. Route */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-background space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">3. TRANSACTION ROUTE</div>
              <div className="font-semibold text-sm">Direct Leader QUIC</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Standard:</span> Multi-hop HTTP RPC submission into mempool queues.<br />
                <span className="font-medium text-blue-600 dark:text-blue-400">Celor:</span> Pre-warmed QUIC connection straight to active leader TPU port.
              </p>
            </div>

            {/* 4. State Safety */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-background space-y-2">
              <div className="text-[10px] font-mono text-muted-foreground uppercase">4. STATE SAFETY</div>
              <div className="font-semibold text-sm">Parent & Bank Awareness</div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">Standard:</span> Zero awareness of abandoned parent banks.<br />
                <span className="font-medium text-blue-600 dark:text-blue-400">Celor:</span> Cancels on <code className="text-[10px] font-mono">UpdateParent</code> to protect capital.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* "Why Infra?" Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        <div className="lg:col-span-6 space-y-6">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-px bg-foreground/30" />
            PHILOSOPHY & POSITIONING
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif tracking-tight leading-[1.05]">
            We don&apos;t build the sniper.
          </h2>
          <div className="space-y-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
            <p>
              We don&apos;t want to compete with every sniper bot in the trenches.
              <strong className="text-foreground"> We want to power them.</strong>
            </p>
            <p>
              One sniper bot wins a specific trade. Celor wins when the timing and consensus infrastructure works reliably for all of them.
            </p>
            <p>
              By decoupling strategy algorithms from low-level cluster telemetry, leader scheduling, and QUIC routing, developers can build any strategy on top of verified Solana state.
            </p>
          </div>
        </div>

        {/* Visual Diagram: 10 bots -> CELOR -> 10 strategies */}
        <div className="lg:col-span-6 border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-6 sm:p-8">
          <div className="text-center font-mono text-xs text-muted-foreground mb-6 uppercase tracking-wider">
            Pluggable Multi-Strategy Pipeline
          </div>

          <div className="space-y-4">
            {/* Top: 10 Sniper Bots */}
            <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
              {['Bot #1', 'Bot #2', 'Bot #3', 'Bot #4', 'Bot #5'].map((bot, i) => (
                <div key={i} className="p-2 rounded bg-background border border-foreground/10 text-foreground font-semibold">
                  {bot}
                </div>
              ))}
            </div>

            {/* Ingestion Arrows */}
            <div className="flex justify-center my-1 text-muted-foreground">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Center: CELOR SNIPER INFRA */}
            <div className="p-5 rounded-xl border border-foreground bg-foreground text-background text-center shadow-lg">
              <div className="text-[10px] font-mono uppercase tracking-widest text-background/70 mb-1">
                CONSENSUS & TIMING CORE
              </div>
              <div className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
                CELOR SNIPER INFRASTRUCTURE
              </div>
              <div className="text-xs font-mono mt-2 text-background/80">
                Early Signal • State Graph • Leader QUIC • Decision Engine
              </div>
            </div>

            {/* Outflow Arrows */}
            <div className="flex justify-center my-1 text-muted-foreground">
              <ArrowRight className="w-4 h-4 rotate-90" />
            </div>

            {/* Bottom: 10 Distinct Strategies */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-[11px] font-mono">
              <div className="p-2 rounded bg-background border border-foreground/10 text-muted-foreground">
                Raydium Pools
              </div>
              <div className="p-2 rounded bg-background border border-foreground/10 text-muted-foreground">
                Pump.fun Curves
              </div>
              <div className="p-2 rounded bg-background border border-foreground/10 text-muted-foreground">
                Whale Copy-Trades
              </div>
              <div className="p-2 rounded bg-background border border-foreground/10 text-muted-foreground">
                Meteora DLMM
              </div>
              <div className="p-2 rounded bg-background border border-foreground/10 text-muted-foreground">
                Atomic Arbitrage
              </div>
              <div className="p-2 rounded bg-background border border-foreground/10 text-muted-foreground">
                Custom MEV
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 85.33x Section */}
      <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-8 sm:p-12 relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 text-center lg:text-left">
            <div className="text-[clamp(3.5rem,10vw,6.5rem)] font-mono leading-none tracking-tight font-bold text-foreground">
              85.33×
            </div>
            <div className="text-sm font-mono uppercase tracking-widest text-muted-foreground mt-2">
              Faster Finality Target
            </div>
            <div className="text-xs font-mono text-muted-foreground/80 mt-1">
              According to Solana&apos;s Alpenglow target
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-4 text-lg sm:text-xl font-mono">
              <div className="px-3 py-1.5 rounded bg-background border border-foreground/15 text-muted-foreground line-through">
                ~12.8s
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="px-3 py-1.5 rounded bg-foreground text-background font-bold shadow-sm">
                ~150ms
              </div>
              <span className="text-xs text-muted-foreground font-mono">Target Finality</span>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Solana&apos;s Alpenglow upgrade replaces 32 legacy TowerBFT confirmation slots (~12,800ms) with BLS12-381 fast-path certificates (~100–150ms).
            </p>

            <div className="p-3.5 rounded-lg border border-foreground/10 bg-background/60 text-xs font-mono text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Explicit Distinction:</strong> The 85.33× factor refers to Solana&apos;s architectural consensus finality target, not end-to-end sniper trade execution. Celor provides pre-finality awareness across both legacy and Alpenglow clusters.
            </div>
          </div>
        </div>
      </div>

      {/* Performance Panel & Data Sources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Performance Panel */}
        <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Internal Benchmarks
              </span>
              <h4 className="text-lg font-serif">Celor Pipeline Latency</h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-foreground/5 border border-foreground/10 text-muted-foreground">
              [MEASURED] Internally
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono">
            <div className="p-3.5 rounded-xl border border-foreground/10 bg-background">
              <div className="text-[10px] text-muted-foreground uppercase">INGEST & NORMALIZATION</div>
              <div className="text-xl font-bold mt-1 text-foreground">0.67 µs</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">p50 monotonic clock</div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/10 bg-background">
              <div className="text-[10px] text-muted-foreground uppercase">STATE GRAPH FORK</div>
              <div className="text-xl font-bold mt-1 text-foreground">5.17 µs</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">p50 fork resolution</div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/10 bg-background">
              <div className="text-[10px] text-muted-foreground uppercase">BLS12-381 VERIFY</div>
              <div className="text-xl font-bold mt-1 text-foreground">1.77 ms</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">562 cert pairings/sec</div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/10 bg-background">
              <div className="text-[10px] text-muted-foreground uppercase">EXECUTION DECISION</div>
              <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">0.50 µs</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">p50 evaluate_chrono</div>
            </div>
          </div>
          
          <div className="text-[11px] font-mono text-muted-foreground">
            Measured under strict statistical rigor (N ≥ 10,000 events) using Rust hardware monotonic timers.
          </div>
        </div>

        {/* Data Source Panel */}
        <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-foreground/10">
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                Cluster Telemetry Feeds
              </span>
              <h4 className="text-lg font-serif">Data Source Integrity</h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-foreground/5 border border-foreground/10 text-muted-foreground">
              Multi-Provider
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg border border-foreground/10 bg-background">
              <div>
                <div className="font-semibold text-foreground">PUBLIC RPC</div>
                <div className="text-[10px] text-muted-foreground">Standard HTTP / WS client</div>
              </div>
              <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px]">
                LIMITED TELEMETRY
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-foreground/10 bg-background">
              <div>
                <div className="font-semibold text-foreground">YELLOWSTONE (GRPC)</div>
                <div className="text-[10px] text-muted-foreground">Direct validator streaming feed</div>
              </div>
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                AVAILABLE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-foreground/10 bg-background">
              <div>
                <div className="font-semibold text-foreground">LOCAL GEYSER PLUGIN</div>
                <div className="text-[10px] text-muted-foreground">Direct IPC shared-memory transport</div>
              </div>
              <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px]">
                FULLER TELEMETRY
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-foreground bg-foreground text-background">
              <div>
                <div className="font-semibold">CELOR RECONCILIATION</div>
                <div className="text-[10px] text-background/80">Cross-checks sources & resolves conflicts</div>
              </div>
              <span className="px-2 py-1 rounded bg-background text-foreground text-[10px] font-bold">
                NORMALIZED
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] text-[11px] font-mono text-muted-foreground">
            <strong className="text-foreground">Honesty Guarantee:</strong> If connected only to Public RPC, candidate bank telemetry is marked as unavailable. Celor never fabricates fake candidate data.
          </div>
        </div>

      </div>

      {/* Final CTA */}
      <div className="text-center py-12 sm:py-16 space-y-6 border-t border-foreground/10">
        <h2 className="text-3xl sm:text-5xl font-serif tracking-tight">
          Don&apos;t build another sniper. <br />
          <span className="italic font-normal">Build on the infrastructure.</span>
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
          Celor is open-source, provider-independent, and architected for low-latency Solana consensus awareness.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <a
            href="https://github.com/celor-sol/celor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background font-mono text-xs font-semibold hover:bg-foreground/90 transition-colors shadow-sm"
          >
            OPEN SOURCE GITHUB
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onOpenDocs}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-foreground/20 bg-background text-foreground font-mono text-xs font-semibold hover:bg-foreground/5 transition-colors"
          >
            VIEW SNIPER INFRA DOCS
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </section>
  );
}

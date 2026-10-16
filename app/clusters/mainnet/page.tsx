'use client';

import Link from 'next/link';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import { useChrono } from '@/hooks/useChrono';
import {
  Activity,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  Terminal,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { useState } from 'react';

export default function MainnetClusterPage() {
  const { networkStatus, switchCluster } = useChrono();
  const [copied, setCopied] = useState(false);

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-24">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
          <Link href="/clusters" className="hover:text-foreground transition-colors">Clusters</Link>
          <span>/</span>
          <span className="text-foreground">Mainnet-Beta</span>
          <span>/</span>
          <span className="text-blue-400 font-bold">TOWER_BFT BASELINE</span>
        </div>

        {/* Hero Title */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 sm:pb-8 border-b border-foreground/10 mb-8 sm:mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[11px] sm:text-xs font-mono text-blue-400 font-semibold mb-3 sm:mb-4">
              <span>CANONICAL BASELINE • TOWERBFT 32 LOCKOUTS</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-medium tracking-tight mb-3">
              Solana Mainnet-Beta
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl font-sans leading-relaxed">
              Solana production cluster operating under the canonical TowerBFT consensus model (~6.4s finality root at 200ms target; historically ~12.8s at 400ms).
              CELOR monitors Mainnet-Beta as an empirical control baseline to prove comparative latency improvements under Alpenglow.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto">
            <Button
              onClick={() => switchCluster('mainnet-beta')}
              variant="default"
              size="sm"
              className="rounded-full text-xs font-mono gap-2 h-10 sm:h-9"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Connect Mainnet Baseline</span>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-mono border-foreground/20 hover:bg-foreground/5 gap-2 h-10 sm:h-9"
            >
              <Link href="/benchmarks">
                <span>A/B Comparison</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 sm:mb-12 font-mono">
          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[11px] text-muted-foreground uppercase">Consensus Model</div>
            <div className="text-xl sm:text-2xl font-bold mt-2 text-foreground">TowerBFT</div>
            <div className="text-[11px] text-muted-foreground mt-2">
              PoH-coupled progressive lockouts
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[11px] text-muted-foreground uppercase">Root Finality Latency</div>
            <div className="text-2xl sm:text-3xl font-bold mt-2 text-foreground">~6.4 s</div>
            <div className="text-[11px] text-muted-foreground mt-2">
              32 slots × 200ms target (SIMD-0525)
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[11px] text-muted-foreground uppercase">Alpenglow Status</div>
            <div className="text-lg sm:text-xl font-bold mt-2 text-amber-500">PENDING VOTE</div>
            <div className="text-[11px] text-muted-foreground mt-2">
              Devnet/Testnet testing active
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[11px] text-muted-foreground uppercase">Safety Guard</div>
            <div className="text-lg sm:text-xl font-bold mt-2 text-emerald-500">READ-ONLY</div>
            <div className="text-[11px] text-muted-foreground mt-2">
              Simulation preflight protected
            </div>
          </div>
        </div>

        {/* Specification */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
          <div className="lg:col-span-2 p-4 sm:p-8 rounded-2xl border border-foreground/10 bg-foreground/[0.01]">
            <h2 className="text-base sm:text-lg font-display font-medium mb-4">Baseline Comparison Profile</h2>
            <div className="divide-y divide-foreground/5 font-mono text-xs">
              <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-muted-foreground">Consensus Finality Mechanism:</span>
                <span className="font-bold text-foreground">TowerBFT Progressive Lockout (32 Lockouts)</span>
              </div>
              <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-muted-foreground">Validator Voting:</span>
                <span className="text-foreground">On-Chain Vote Transactions</span>
              </div>
              <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-muted-foreground">Candidate Banks per Slot:</span>
                <span className="text-muted-foreground">Single Canonical Bank (Linear)</span>
              </div>
              <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-muted-foreground">Public RPC Endpoint:</span>
                <span className="text-foreground truncate">https://api.mainnet-beta.solana.com</span>
              </div>
              <div className="py-2.5 sm:py-3 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-muted-foreground">Public WebSocket Endpoint:</span>
                <span className="text-foreground truncate">wss://api.mainnet-beta.solana.com</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  CLI Command
                </span>
                <button
                  onClick={() => copyCommand('cargo run --bin celor -- serve --cluster mainnet-beta --port 8900')}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-3 bg-foreground/[0.04] border border-foreground/10 rounded-xl text-xs font-mono overflow-x-auto text-foreground">
                <code>cargo run --bin celor -- serve --cluster mainnet-beta --port 8900</code>
              </pre>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl border border-amber-500/20 bg-amber-500/[0.02] text-xs text-muted-foreground font-sans leading-relaxed">
              <div className="flex items-center gap-2 text-amber-500 font-mono font-medium mb-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Mainnet Safety Guard Invariant</span>
              </div>
              CELOR enforces a strict read-only execution guard on Mainnet-Beta to prevent accidental automated transaction submission.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-4 pt-6 border-t border-foreground/10">
          <Button asChild variant="outline" className="font-mono text-xs rounded-xl border-foreground/20 h-10 sm:h-9">
            <Link href="/network">Compare Old vs New Consensus</Link>
          </Button>
          <Button asChild variant="outline" className="font-mono text-xs rounded-xl border-foreground/20 h-10 sm:h-9">
            <Link href="/clusters">All Clusters</Link>
          </Button>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

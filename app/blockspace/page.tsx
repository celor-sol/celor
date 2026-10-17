'use client';

import { useState } from 'react';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { BlockSpaceMeter } from '@/components/chrono/blockspace/block-space-meter';
import { TpsParadoxSimulator } from '@/components/chrono/blockspace/tps-paradox-simulator';
import { BamMicroAuctionVisualizer } from '@/components/chrono/blockspace/bam-micro-auction-visualizer';
import { AccountCapAnalyzer } from '@/components/chrono/blockspace/account-cap-analyzer';
import { useChrono } from '@/hooks/useChrono';
import { Button } from '@/components/ui/button';
import { CELOR_TOKEN } from '@/lib/token';
import { 
  Zap, 
  Layers, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink,
  Activity,
  Gauge
} from 'lucide-react';
import Link from 'next/link';

export default function BlockSpacePage() {
  const {
    slotProgress,
    leaderInfo,
    networkStatus,
    switchCluster,
  } = useChrono();

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(CELOR_TOKEN.ca);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAlpenglow = networkStatus?.protocol?.alpenglowActive ?? (networkStatus?.cluster !== 'mainnet-beta' && networkStatus?.cluster !== 'mainnet');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-20 space-y-12 sm:space-y-16">
        {/* Hero Section */}
        <div className="relative pt-6 sm:pt-10 text-center space-y-4 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SOLANA ALPENGLOW CONSENSUS UPGRADE</span>
            <span className="text-muted-foreground">•</span>
            <span className="font-bold">OCTOBER 21, 2026</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-display font-bold tracking-tight text-foreground">
            The 75% Block Space Reclaim
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Why Solana&apos;s headline TPS will drop on October 21 while true network capacity quadruples. Explore the elimination of on-chain vote transactions, 48M Compute Unit liberation, and 25ms BAM micro-auctions.
          </p>

          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left font-mono">
            <div className="p-3.5 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
              <div className="text-[10px] uppercase text-muted-foreground">Vote Tx Elimination</div>
              <div className="text-xl sm:text-2xl font-bold font-display text-emerald-400 mt-1">-75%</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Off-chain BLS certs</div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
              <div className="text-[10px] uppercase text-muted-foreground">User App Capacity</div>
              <div className="text-xl sm:text-2xl font-bold font-display text-foreground mt-1">4.0x (+300%)</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">48M non-vote CU</div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
              <div className="text-[10px] uppercase text-muted-foreground">BAM Micro-Auctions</div>
              <div className="text-xl sm:text-2xl font-bold font-display text-cyan-400 mt-1">25ms</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">8 ticks per 200ms slot</div>
            </div>

            <div className="p-3.5 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
              <div className="text-[10px] uppercase text-muted-foreground">Single Pool Cap</div>
              <div className="text-xl sm:text-2xl font-bold font-display text-purple-400 mt-1">2.0x Double</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">60M CU/s limit</div>
            </div>
          </div>
        </div>

        {/* Section 1: The 48M Compute Unit Block Space Meter */}
        <section id="block-meter" className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-bold">
              1. Block Space Allocation & 48M Compute Units
            </h2>
            <span className="text-xs font-mono text-muted-foreground">SIMD-0326</span>
          </div>
          <BlockSpaceMeter />
        </section>

        {/* Section 2: The Viral "TPS Paradox" Engine */}
        <section id="tps-paradox" className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-bold">
              2. The Social Media &quot;TPS Paradox&quot; Engine
            </h2>
            <span className="text-xs font-mono text-muted-foreground">Explorers vs Reality</span>
          </div>
          <TpsParadoxSimulator />
        </section>

        {/* Section 3: Jito BAM 25ms Micro-Auction Visualizer */}
        <section id="bam-auctions" className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-bold">
              3. Jito BAM 25ms Micro-Auction Engine
            </h2>
            <span className="text-xs font-mono text-muted-foreground">Sub-Slot MEV</span>
          </div>
          <BamMicroAuctionVisualizer />
        </section>

        {/* Section 4: Hotspot Account Cap Analyzer */}
        <section id="account-caps" className="scroll-mt-24 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-bold">
              4. 12M CU Account Contention Limit
            </h2>
            <span className="text-xs font-mono text-muted-foreground">DEX & Meme Pools</span>
          </div>
          <AccountCapAnalyzer />
        </section>

        {/* Technical Architecture Specs & Links */}
        <section className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-foreground/10">
            <div>
              <h3 className="text-lg font-display font-semibold">Verified Solana Protocol Specifications</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every calculation and mechanism on this page is derived strictly from published Solana Foundation SIMDs.
              </p>
            </div>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="rounded-full border-foreground/15 text-xs font-mono"
            >
              <Link href="/protocol">
                Full Protocol Specs
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="p-4 rounded-xl border border-foreground/10 bg-background/50 space-y-2">
              <div className="text-emerald-400 font-bold">SIMD-0326: Alpenglow Votor</div>
              <p className="text-[11px] text-muted-foreground font-sans">
                Replaces TowerBFT on-chain voting transactions with aggregate BLS12-381 certificates, slashing finality to ~150ms and clearing 75% of block space.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background/50 space-y-2">
              <div className="text-cyan-400 font-bold">SIMD-0525: 200ms Slots</div>
              <p className="text-[11px] text-muted-foreground font-sans">
                Compresses Solana slot timing from 400ms down to 200ms, doubling per-second block production and doubling per-pool account caps.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background/50 space-y-2">
              <div className="text-purple-400 font-bold">Jito BAM v1.2: Micro-Auctions</div>
              <p className="text-[11px] text-muted-foreground font-sans">
                Divides 200ms block assembly into eight 25ms discrete batch auctions, eliminating toxic sandwich MEV within sub-second trading windows.
              </p>
            </div>
          </div>
        </section>

        {/* Community & Token Callout */}
        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
              BUILD WITH CELOR
            </span>
            <h3 className="text-xl sm:text-2xl font-display font-bold">
              Sub-Second Consensus & Block Space Infrastructure
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Celor tracks live Alpenglow telemetry across Devnet, Testnet, and Mainnet. Access zero-overhead RPC streams and sniper engine bindings.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
            <Button
              asChild
              className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90 rounded-full font-mono text-xs px-5 h-9"
            >
              <Link href="/sniper">
                Open Sniper Engine
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full sm:w-auto rounded-full font-mono text-xs border-foreground/20 px-4 h-9"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Copied CA
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  {CELOR_TOKEN.shortCa}
                </>
              )}
            </Button>
          </div>
        </section>
      </main>

      <FooterSection />
    </div>
  );
}

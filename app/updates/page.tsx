'use client';

import Link from 'next/link';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import { useChrono } from '@/hooks/useChrono';
import {
  History,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';

interface UpdateMilestone {
  date: string;
  category: 'PROTOCOL TRANSITION' | 'CELOR RELEASE' | 'VALIDATOR MILESTONE';
  title: string;
  summary: string;
  details: string[];
  status: 'LIVE' | 'FEATURE-GATED' | 'COMPLETED';
}

const MILESTONES: UpdateMilestone[] = [
  {
    date: 'OCTOBER 21, 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'Epoch 1064 Alpenglow Mainnet Cutover: Agave 4.3.0 & Off-Chain Votor Protocol (~14:50 UTC)',
    summary:
      'Solana Foundation and Anza locked the Mainnet-Beta Alpenglow cutover for Epoch 1064 (Wednesday, October 21, ~14:50 UTC), requiring Agave 4.3.0 validator clients.',
    details: [
      'Votor protocol moves validator voting off-chain into aggregated BLS12-381 certificates, slashing finality to ~150ms.',
      'Public explorer TPS metric shift: on-chain vote transaction spam eliminated, leaving 100% of block capacity for real user transactions.',
      'Increased Byzantine fault tolerance: operates securely with up to 40% offline or malicious stake via Fast Path (80%) and Fallback Path (60%).',
      'CELOR Epoch 1064 Test Bench deployed live with interactive transaction flight simulator, fault-tolerance stress lab, and Agave 4.3.0 validator qualification checks.',
    ],
    status: 'LIVE',
  },
  {
    date: 'OCTOBER 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'SIMD-0525: 200ms Slot-Time Reduction Live Across Solana Clusters',
    summary:
      'Solana Mainnet-Beta, Devnet, and Testnet have activated SIMD-0525, cutting canonical slot durations from 400ms down to a 200ms target.',
    details: [
      'Nominal 4-slot leader tenure reduced to ~800ms (previously ~1,600ms).',
      'Dynamic blockhash expiry aligned to 150 slots (~30s nominal target window; empirical verification required).',
      'CELOR Dynamic Slot Clock, Sniper timing horizons, and QUIC prewarming thresholds fully updated for 200ms cadence.',
      'TowerBFT root finality on Mainnet-Beta compressed to ~6.4s (32 slots × 200ms); Alpenglow BLS notarization remains decoupled.',
    ],
    status: 'LIVE',
  },
  {
    date: 'OCTOBER 2026',
    category: 'CELOR RELEASE',
    title: 'Real-Time Abandoned Transaction Alerts & SIMD-0337 Forensic Watcher',
    summary:
      'Engineered sub-millisecond detection and instant dark-mode alert dispatch for transactions dropped by Alpenglow parent-switch candidate invalidation.',
    details: [
      'Zero-dependency alert engine monitors candidate bank lifecycles and UpdateParent markers.',
      'Prevents phantom transactions by distinguishing observed uncommitted state from canonical roots.',
      'Instant 1-click forensic autopsy deep-linking with full 9-stage consensus trace.',
      'Integrated live presets on homepage and /transaction for immediate cluster verification.',
    ],
    status: 'LIVE',
  },
  {
    date: 'OCTOBER 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'Solana Devnet Alpenglow Votor Activation Certified',
    summary:
      'Solana Devnet officially certified running Alpenglow Votor consensus with aggregate BLS12-381 certificate notarization.',
    details: [
      'Upgrade Genesis Slot recorded at #504,148,999.',
      'Live observed consensus finality confirmed at ~231ms vs ~150ms protocol target.',
      'Legacy TowerBFT 32-lockout finality superseded by direct validator BLS certificate notarization.',
      'SVM transaction execution, program bytecodes, and fee structures confirmed 100% invariant/identical.',
    ],
    status: 'LIVE',
  },
  {
    date: 'OCTOBER 2026',
    category: 'CELOR RELEASE',
    title: 'CELOR Phase 7 Conformance & Master Directives Certified',
    summary:
      '100% upstream protocol conformance achieved across Agave validator internals, BankGraph tracking, and QUIC execution routing.',
    details: [
      'Empirical N ≥ 10,000 latency benchmark suite validated with monotonic hardware timers (Instant::now).',
      'Decoupled physical latency domains: isolated consensus finality from provider WebSocket transport lag.',
      'Completed zero-allocation BankGraph tracking with instant UpdateParent parent invalidation.',
      'Deployed live public dashboard to Cloudflare Pages with zero commercial vendor lock-in.',
    ],
    status: 'COMPLETED',
  },
  {
    date: 'OCTOBER 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'Solana Testnet Alpenglow Staging Rollout',
    summary:
      'Solana Testnet upgraded to Alpenglow consensus at Genesis Slot #444,625,255 for validator release qualification.',
    details: [
      'Active validator operators testing fallback path notarization at 60% stake threshold.',
      'Turbine block propagation evaluated under multi-candidate bank streaming topologies.',
    ],
    status: 'LIVE',
  },
  {
    date: 'SEPTEMBER 2026',
    category: 'VALIDATOR MILESTONE',
    title: 'Agave 4.4 Multi-Candidate Bank & UpdateParent Hooks Merged',
    summary:
      'Anza Agave client branch integrates SIMD-0326 multi-bank generation and SIMD-0337 fast leader handover markers.',
    details: [
      'agave-validator client includes validator-local bank_id arena allocation.',
      'Block footer serializer attaches BLS12-381 aggregate certificates to sealed block trailers.',
    ],
    status: 'FEATURE-GATED',
  },
  {
    date: 'AUGUST 2026',
    category: 'CELOR RELEASE',
    title: 'CELOR Phase 6 Full-Fidelity Geyser Telemetry Plugin Released',
    summary:
      'Released the open-source Celor Geyser Plugin enabling Level 4 validator-side telemetry on local nodes.',
    details: [
      'Ingests direct memory-mapped candidate bank lifecycle events via Unix Domain Sockets.',
      'Captures pre-execution deshred streams before transaction processing begins.',
      'High-precision nanosecond producer timestamps extracted from block footers.',
    ],
    status: 'COMPLETED',
  },
];

export default function UpdatesPage() {
  const { networkStatus, switchCluster } = useChrono();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground selection:text-background">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-16 sm:pb-24">
        {/* Header */}
        <div className="pb-6 sm:pb-8 border-b border-foreground/10 mb-8 sm:mb-12">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">
            <span>CELOR</span>
            <span>/</span>
            <span className="text-foreground">Protocol Transition Updates & Changelog</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-medium tracking-tight mb-4">
            Alpenglow Transition Timeline
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl font-sans leading-relaxed">
            Chronological engineering record of the Solana consensus transition from legacy TowerBFT to Alpenglow Votor,
            along with CELOR low-level infrastructure releases.
          </p>
        </div>

        {/* Featured Latest Release Showcase */}
        <section className="mb-12 sm:mb-16 rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.05] via-amber-500/[0.02] to-transparent p-5 sm:p-8 lg:p-10 shadow-xl shadow-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase">
                FEATURED SHIP • OCTOBER 2026
              </span>
            </div>
            <span className="text-[10px] sm:text-xs font-mono px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-semibold">
              LIVE IN PRODUCTION
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-medium tracking-tight text-foreground">
                Real-Time Abandoned Transaction Alerts
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
                Under Alpenglow, 1 slot can generate multiple candidate banks. When an incoming leader executes a
                fast handover (SIMD-0337), uncommitted candidate banks are instantly invalidated. Celor now fires
                real-time alerts the microsecond your transaction is dropped.
              </p>

              <div className="space-y-2.5 pt-2 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span><strong>Zero Silent Reorgs:</strong> Instant feedback instead of waiting on timeouts.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span><strong>SIMD-0337 Telemetry:</strong> Shows dropped bank ID, canonical state, and event slot.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span><strong>1-Click Autopsy:</strong> Deep-links directly to full 9-stage consensus trace.</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-sans font-medium text-xs sm:text-sm h-11 px-5 rounded-full">
                  <Link href="/transaction?signature=simd0337-reorg-abandoned-tx-8xLz9Q">
                    <span>⚡ Test Live Abandoned TX in Autopsy</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-foreground/20 font-sans text-xs sm:text-sm h-11 px-5 rounded-full">
                  <Link href="/transaction">
                    Explore Forensics Page
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: User Showcase Image Preview */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 bg-black/80 shadow-2xl group">
                <img
                  src="/images/abandoned-tx-alert-preview.jpg"
                  alt="Celor Abandoned Transaction Alert UI Preview"
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Live Notification Toast UI
                  </span>
                  <span className="text-zinc-500">Preview Artifact</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Stream */}
        <div className="relative border-l border-foreground/10 pl-5 sm:pl-10 space-y-8 sm:space-y-12 mb-12 sm:mb-16 ml-2 sm:ml-4">
          {MILESTONES.map((m, idx) => (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[27px] sm:-left-[47px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-foreground group-hover:scale-125 transition-transform" />

              <div className="p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-foreground/10 bg-foreground/[0.015] hover:border-foreground/20 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-foreground/10 text-foreground font-semibold text-[11px] sm:text-xs">
                      {m.category}
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">•</span>
                    <span className="text-muted-foreground flex items-center gap-1 text-[11px] sm:text-xs">
                      <Calendar className="w-3 h-3" />
                      {m.date}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                      m.status === 'LIVE'
                        ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                        : m.status === 'COMPLETED'
                        ? 'border-blue-500/30 text-blue-400 bg-blue-500/10'
                        : 'border-amber-500/30 text-amber-500 bg-amber-500/10'
                    }`}
                  >
                    {m.status}
                  </span>
                </div>

                <h3 className="text-lg sm:text-2xl font-display font-medium text-foreground mb-2">
                  {m.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed mb-4">
                  {m.summary}
                </p>

                <ul className="space-y-1.5 font-mono text-[11px] sm:text-xs text-muted-foreground border-t border-foreground/5 pt-3 sm:pt-4">
                  {m.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-display font-medium">Explore Protocol Specifications</div>
            <div className="text-xs text-muted-foreground font-sans">
              Read complete technical breakdowns of SIMD-0326, SIMD-0337, and SIMD-0525.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button asChild variant="default" size="sm" className="font-mono text-xs rounded-xl h-10 sm:h-9">
              <Link href="/protocol">Read SIMD Specifications</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="font-mono text-xs rounded-xl border-foreground/20 h-10 sm:h-9">
              <Link href="/clusters">View Cluster Status</Link>
            </Button>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

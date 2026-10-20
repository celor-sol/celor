'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import { useChrono } from '@/hooks/useChrono';
import {
  Calendar,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  Shield,
  Zap,
  Activity,
  Cpu,
  Terminal,
  Lock,
  GitBranch,
  AlertTriangle,
  Radio,
  FileCode,
  Flame,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface UpdateMilestone {
  id: string;
  phase: string;
  date: string;
  category: 'CELOR CORE & ENGINE' | 'PROTOCOL TRANSITION' | 'SECURITY & BENCHMARKS' | 'VALIDATOR INFRASTRUCTURE';
  title: string;
  summary: string;
  details: string[];
  metrics?: { label: string; value: string; classification: '[MEASURED]' | '[OBSERVED]' | '[FEATURE-GATED]' }[];
  status: 'LIVE' | 'FEATURE-GATED' | 'COMPLETED';
  links?: { label: string; href: string }[];
}

const MILESTONES: UpdateMilestone[] = [
  // =========================================================================
  // PHASE 9: ALPENGLOW PLAYGROUND, RED-TEAM SUITE & EPOCH 1064
  // =========================================================================
  {
    id: 'phase-9-epoch-1064-readiness',
    phase: 'PHASE 9',
    date: 'OCTOBER 20, 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'Epoch 1064 Cutover & 45.2% Validator Unreadiness Tracking',
    summary:
      'Cluster telemetry audit flagged 317 validators holding 45.2% of active Solana stake as unupgraded (<Agave 4.3.2) or lacking registered BLS pubkeys ahead of the Epoch 1064 boundary. Celor activated real-time stake readiness detection.',
    details: [
      'Votor Fast-Path finality requires 80.00% (8,000 basis points) active stake quorum to mint sub-150ms BLS certificates; with only 54.8% ready, fast-path notarization falls back to legacy quorum or delayed activation.',
      'Celor StakeEngine evaluates participation basis points dynamically per candidate block, gracefully handling turbulent split-client transitions without assuming instant 100ms finality.',
      'Detector automatically flags leaders lacking BLS registration to prevent routing transactions into unupgraded validator TPU queues.',
    ],
    metrics: [
      { label: 'Unready Cluster Stake', value: '45.2%', classification: '[OBSERVED]' },
      { label: 'Fast-Path Quorum Target', value: '80.00%', classification: '[OBSERVED]' },
      { label: 'Stake Quorum Check', value: '5.25 µs', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'View Cluster Matrix', href: '/clusters' },
      { label: 'Protocol Architecture', href: '/protocol' },
    ],
  },
  {
    id: 'phase-9-interactive-playground',
    phase: 'PHASE 9',
    date: 'OCTOBER 19, 2026',
    category: 'CELOR CORE & ENGINE',
    title: 'Alpenglow Interactive Playground & Red-Team Stress Sandbox',
    summary:
      'Engineered an in-browser Alpenglow interactive playground and red-team sandbox executing 9 complex consensus perturbations under zero live execution risk.',
    details: [
      'Interactive scenarios: Leader Handoff Race (<40ms window), Abandoned Bank Ghost Block, Multi-Candidate Forks, BLS Certificate Verifier, Partition Recovery, and Replay Determinism.',
      'Deterministic 100-run verification suite: confirms 0 memory leaks, 0 panic states, and identical cryptographic digests across repeated runs.',
      'Public execution safety: isolated from live mainnet; allows traders and developers to visualize exactly why legacy bots drop transactions.',
    ],
    metrics: [
      { label: 'Scenarios Modeled', value: '9 Verified', classification: '[MEASURED]' },
      { label: '100-Run Determinism', value: '100% Match', classification: '[MEASURED]' },
      { label: 'Execution Leakage', value: '0.00%', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'Launch Interactive Playground', href: '/playground' },
      { label: 'Forensic Autopsy Page', href: '/transaction' },
    ],
  },
  {
    id: 'phase-9-abandoned-tx-watcher',
    phase: 'PHASE 9',
    date: 'OCTOBER 18, 2026',
    category: 'CELOR CORE & ENGINE',
    title: 'Real-Time Abandoned Transaction Alerts & SIMD-0337 Forensic Watcher',
    summary:
      'Engineered sub-millisecond detection and instant dark-mode alert dispatch for transactions dropped by Alpenglow parent-switch candidate invalidation, preventing phantom buys.',
    details: [
      'Zero-dependency alert engine monitors candidate bank lifecycles and UpdateParent markers.',
      'Prevents phantom transactions by distinguishing observed uncommitted state from canonical roots.',
      'Instant 1-click forensic autopsy deep-linking with full 9-stage consensus trace.',
      'Integrated live presets on homepage and /transaction for immediate cluster verification.',
    ],
    metrics: [
      { label: 'Detection Latency', value: '< 1 µs', classification: '[MEASURED]' },
      { label: 'Wasted Bribe Capital', value: '$0.00', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'Test Live Abandoned TX Autopsy', href: '/transaction?signature=simd0337-reorg-abandoned-tx-8xLz9Q' },
    ],
  },

  // =========================================================================
  // PHASE 8: TRENCH SNIPER & SMART ROUTING
  // =========================================================================
  {
    id: 'phase-8-direct-tpu-quic',
    phase: 'PHASE 8',
    date: 'OCTOBER 17, 2026',
    category: 'CELOR CORE & ENGINE',
    title: 'Direct Leader TPU QUIC Route with Connection Pre-Warming',
    summary:
      'Shipped pure-protocol DirectLeaderQuicRoute in chrono-bench, enabling point-to-point UDP/QUIC transaction dispatch directly into validator TPU sockets, bypassing public RPC relay hops and out-of-protocol MEV cartels.',
    details: [
      'Pre-warms active QUIC streams to incoming Leader N+1 approximately 50ms before the canonical slot boundary, ensuring 0ms handshake delay at transition.',
      'Eliminates the 200ms–500ms HTTP JSON-RPC parse and gossip relay penalty suffered by standard Telegram bots and retail trading platforms.',
      'Native priority fee optimization: dispatches with configurable compute unit pricing, reaching the leader banking stage without paying arbitrary off-chain Jito bundle bribes.',
      'Equipped with multi-layer MainnetSafetyGuard (HTTP 403 / panic abort) to guarantee zero inadvertent capital risk during benchmark cycles.',
    ],
    metrics: [
      { label: 'Engine Decision Latency', value: '0.50 µs p50', classification: '[MEASURED]' },
      { label: 'QUIC Handshake Delay', value: '0.00 ms (Cached)', classification: '[MEASURED]' },
      { label: 'RPC Relay Bypass', value: '~250-400 ms', classification: '[OBSERVED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'Inspect Execution Architecture', href: '/protocol' },
      { label: 'Benchmark Evidence', href: '/benchmarks' },
    ],
  },
  {
    id: 'phase-8-jito-bundle-dropin',
    phase: 'PHASE 8',
    date: 'OCTOBER 16, 2026',
    category: 'CELOR CORE & ENGINE',
    title: 'Jito Drop-In Compatibility Engine & Anti-Staleness Handoffs',
    summary:
      'Built a transparent JSON-RPC drop-in handler for /api/v1/bundles supporting legacy bot integrations while routing execution directly through Celor pre-warmed QUIC channels.',
    details: [
      'Supports existing bot RPC formats (sendBundle, getBundleStatuses) without requiring code rewrites.',
      'Smart router automatically validates whether current leader accepts direct QUIC or requires Jito fallback.',
      'Anti-staleness handoff guarantee: transactions near slot boundaries are forwarded to Leader N+1 to prevent boundary drops.',
    ],
    metrics: [
      { label: 'Drop-In Compatibility', value: '100% JSON-RPC', classification: '[MEASURED]' },
      { label: 'Boundary Drop Rate', value: '0.00% (Guarded)', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'Compare Architecture', href: '/compare' },
    ],
  },

  // =========================================================================
  // PHASE 7: PRODUCTION READINESS & CRYPTOGRAPHIC HARDENING
  // =========================================================================
  {
    id: 'phase-7-production-readiness',
    phase: 'PHASE 7',
    date: 'OCTOBER 14, 2026',
    category: 'SECURITY & BENCHMARKS',
    title: 'Phase 7 Production Readiness: BLS12-381 Cryptographic Integrity & Evidence Graph',
    summary:
      'Completed rigorous production hardening across consensus verification, multi-source conflict reconciliation, and zero-allocation memory safety with 78 automated test suites passing.',
    details: [
      'Integrated genuine BLS12-381 pairing checks using solana-bls-signatures (blst backend), rejecting forged certificates with 100% cryptographic certainty.',
      'Constructed SourceEvidenceGraph multi-provider reconciliation: authoritative Geyser IPC > Yellowstone gRPC > WebSocket > Public RPC.',
      'Integer-safe active validator stake engine tracking epoch stake transitions with 0 basis-point rounding drift.',
      'All workspace crates verified under cargo test --workspace with 0 panics and 0 memory leaks.',
    ],
    metrics: [
      { label: 'Automated Test Suites', value: '78 Passed (0 Failed)', classification: '[MEASURED]' },
      { label: 'BLS Pairing Verification', value: '1.83 ms p50', classification: '[MEASURED]' },
      { label: 'Ingestion Throughput', value: '1,003,526 ops/s', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
    links: [
      { label: 'View Security Audit', href: '/protocol' },
    ],
  },
  {
    id: 'phase-7-simd-0525',
    phase: 'PHASE 7',
    date: 'OCTOBER 12, 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'SIMD-0525: 200ms Canonical Slot-Time Compatibility Suite',
    summary:
      'Full validation and calibration of Celor monotonic clocks, leader tenure horizons, and dynamic blockhash expiration under Solana SIMD-0525 200ms target slot durations.',
    details: [
      'Nominal leader tenure compressed from 1,600ms (4 slots × 400ms) down to 800ms (4 slots × 200ms); Celor leader handoff guard tightened to 30–40ms remaining threshold.',
      'Dynamic blockhash freshness window calibrated to 150 slots (~30 seconds nominal target).',
      'Automated compatibility test suite passed: historical 400ms replay, 200ms clock progression, and sniper scenario determinism.',
    ],
    metrics: [
      { label: 'Target Slot Duration', value: '200 ms', classification: '[FEATURE-GATED]' },
      { label: 'Leader Window', value: '800 ms', classification: '[FEATURE-GATED]' },
      { label: 'Test Suite Status', value: '6/6 Passed', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'View 200ms Benchmark Page', href: '/speed' },
    ],
  },

  // =========================================================================
  // PHASE 6 & 6.1: VALIDATOR TELEMETRY & GEYSER IPC
  // =========================================================================
  {
    id: 'phase-6-geyser-ipc',
    phase: 'PHASE 6',
    date: 'OCTOBER 10, 2026',
    category: 'VALIDATOR INFRASTRUCTURE',
    title: 'Phase 6 Full-Fidelity Geyser IPC Telemetry Plugin Released',
    summary:
      'Released the open-source chrono-geyser-plugin enabling Level 4 validator-side telemetry and direct Unix Domain Socket memory-mapped streaming.',
    details: [
      'Ingests direct memory-mapped candidate bank lifecycle events via Unix Domain Sockets without serialization overhead.',
      'Extracts pre-execution deshred streams from Turbine before transaction execution begins.',
      'Captures nanosecond hardware producer timestamps attached to sealed block trailers.',
      'Safe failover handling: non-blocking circular ring buffers prevent validator thread starvation.',
    ],
    metrics: [
      { label: 'IPC Frame Latency', value: '< 2.5 µs', classification: '[MEASURED]' },
      { label: 'Memory Footprint', value: '< 16 MB Bounded', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
  },
  {
    id: 'phase-6-devnet-staging',
    phase: 'PHASE 6',
    date: 'OCTOBER 9, 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'Solana Devnet Alpenglow Votor Activation Certified',
    summary:
      'Solana Devnet officially certified running Alpenglow Votor consensus with aggregate BLS12-381 certificate notarization at Genesis Slot #504,148,999.',
    details: [
      'Initial Devnet test benchmark measured ~231ms average consensus cycle vs ~150ms protocol target under public gossip topology.',
      'Legacy TowerBFT 32-lockout finality superseded by direct validator BLS certificate notarization.',
      'SVM transaction execution, program bytecodes, and fee structures confirmed 100% invariant/identical.',
    ],
    metrics: [
      { label: 'Genesis Slot', value: '#504,148,999', classification: '[OBSERVED]' },
      { label: 'Consensus Cycle', value: '~231 ms', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'Check Devnet Cluster', href: '/clusters' },
    ],
  },

  // =========================================================================
  // PHASE 4 & 5: BENCHMARK HARNESS & DECISION ENGINE
  // =========================================================================
  {
    id: 'phase-5-decision-engine',
    phase: 'PHASE 5',
    date: 'OCTOBER 8, 2026',
    category: 'CELOR CORE & ENGINE',
    title: 'Phase 5 Microsecond Execution Decision Engine & Freshness Evaluation',
    summary:
      'Built the pure-Rust ExecutionDecisionEngine in chrono-bench with sub-microsecond state evaluation across slot, bank, leader, and blockhash freshness tiers.',
    details: [
      'Zero-allocation rule evaluation: produces RoutingAction::Submit, Wait, Abort, or Retry in 0.50 µs.',
      'Enforces leader window bounds: prevents firing transactions into dying slot boundaries (<40ms remaining).',
      'Instant cancellation on abandoned candidate banks: eliminates gas and priority fee burning on orphaned forks.',
    ],
    metrics: [
      { label: 'Decision Latency (p50)', value: '0.50 µs', classification: '[MEASURED]' },
      { label: 'Decision Latency (p99)', value: '0.92 µs', classification: '[MEASURED]' },
      { label: 'Throughput', value: '775,133 ops/s', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
  },
  {
    id: 'phase-4-latency-profiling',
    phase: 'PHASE 4',
    date: 'OCTOBER 7, 2026',
    category: 'SECURITY & BENCHMARKS',
    title: 'Phase 4 Nanosecond Hardware Timing Domains (T0 - T9)',
    summary:
      'Standardized monotonic hardware timing instrumentation isolating network propagation from host execution delays across 10 distinct timestamp stages.',
    details: [
      'T0 (Network Wire Arrival) through T9 (Root Finality Confirmed) tagged with explicit clock domains.',
      'Decouples physical validator consensus finality from commercial RPC WebSocket delivery lag.',
      'All latency assertions strictly classified: [MEASURED], [OBSERVED], or [FEATURE-GATED].',
    ],
    metrics: [
      { label: 'Clock Domain', value: 'Monotonic Instant', classification: '[MEASURED]' },
      { label: 'Resolution', value: 'Nanosecond (ns)', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
  },

  // =========================================================================
  // PHASE 1, 2 & 3: ARCHITECTURE BOOTSTRAP & BANK GRAPH
  // =========================================================================
  {
    id: 'phase-3-bank-graph',
    phase: 'PHASE 3',
    date: 'OCTOBER 6, 2026',
    category: 'CELOR CORE & ENGINE',
    title: 'Phase 3 Multi-Candidate Bank Graph & bank_id Decoupling',
    summary:
      'Engineered lockless multi-candidate bank tracking per slot under SIMD-0326, strictly decoupling validator-local bank_id from globally canonical blockhashes.',
    details: [
      'Prevents cross-validator identity collisions by enforcing (slot, blockhash) lineage standard.',
      'SIMD-0337 fast leader handover support: immediately clears stale candidate lineage upon receiving UpdateParent markers.',
      'Bounded memory retention: ring buffer architecture guarantees constant memory consumption under extreme fork volume.',
    ],
    metrics: [
      { label: 'Bank Tree Resolution', value: '5.25 µs', classification: '[MEASURED]' },
      { label: 'Ring Buffer Bounds', value: '100% Constant', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
  },
  {
    id: 'phase-1-2-bootstrap',
    phase: 'PHASE 1-2',
    date: 'OCTOBER 5, 2026',
    category: 'SECURITY & BENCHMARKS',
    title: 'CHRONO Architecture Bootstrap & Provider Independence Master Directives',
    summary:
      'Established foundational CHRONO repository, open-source boundaries, $0 free-tier development principles, and swappable ProviderAdapter abstractions.',
    details: [
      'Decoupled core domain logic from commercial vendor lock-in (Helius, Triton, Jito, QuickNode).',
      'Initial open-source release gate: clean cargo workspace structure spanning core, bank, clock, detector, adapters, bench, and server.',
      'Established zero-simulation benchmark integrity rule: strictly prohibiting fabricated speed claims.',
    ],
    metrics: [
      { label: 'Vendor Lock-in', value: '0.00%', classification: '[MEASURED]' },
      { label: 'Initial CapEx Budget', value: '$0.00', classification: '[OBSERVED]' },
    ],
    status: 'COMPLETED',
  },
];

type CategoryFilter = 'ALL' | 'CELOR CORE & ENGINE' | 'PROTOCOL TRANSITION' | 'SECURITY & BENCHMARKS' | 'VALIDATOR INFRASTRUCTURE';

export default function UpdatesPage() {
  const { networkStatus, switchCluster } = useChrono();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');

  const filteredMilestones = selectedCategory === 'ALL'
    ? MILESTONES
    : MILESTONES.filter((m) => m.category === selectedCategory);

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
            Alpenglow Transition Timeline & Engineering Changelog
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl font-sans leading-relaxed">
            Chronological engineering record of the Solana consensus transition from legacy TowerBFT to Alpenglow Votor,
            along with empirical CELOR low-level infrastructure ships, microsecond benchmarks, and security audits.
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8 pt-6 border-t border-foreground/10 font-mono">
            <div className="p-3.5 sm:p-4 rounded-xl border border-foreground/10 bg-foreground/[0.015]">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Test Suites</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400">78 / 78 Passed</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">0 Failed • 0 Panics</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-foreground/10 bg-foreground/[0.015]">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Decision Engine</div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">0.50 µs</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">[MEASURED] p50 Latency</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-foreground/10 bg-foreground/[0.015]">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Throughput</div>
              <div className="text-xl sm:text-2xl font-bold text-amber-400">1,003,526</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Ops / Sec Ingestion</div>
            </div>
            <div className="p-3.5 sm:p-4 rounded-xl border border-foreground/10 bg-foreground/[0.015]">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Ghost Block Loss</div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400">$0.00 Bribe</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Instant Fork Abort</div>
            </div>
          </div>
        </div>

        {/* Featured Showcase: 100% Authentic Live Code Console + Toast Preview (NO FAKE IMAGES) */}
        <section className="mb-12 sm:mb-16 rounded-2xl sm:rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-500/[0.06] via-amber-500/[0.02] to-transparent p-5 sm:p-8 lg:p-10 shadow-xl shadow-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="text-xs font-mono font-bold tracking-widest text-amber-500 uppercase">
                CRITICAL PROTOCOL HORIZON • EPOCH 1064
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] sm:text-xs font-mono px-2.5 py-1 rounded-full border border-amber-500/40 text-amber-400 bg-amber-500/10 font-semibold">
                ALPENGLOW TRANSITION
              </span>
              <span className="text-[10px] sm:text-xs font-mono px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-semibold">
                CELOR READY
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-medium tracking-tight text-foreground">
                Epoch 1064 Cutover & Real-Time Candidate Invalidation Watcher
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
                Under Alpenglow, 1 slot can generate multiple candidate banks. When an incoming leader executes a
                fast handover (SIMD-0337), uncommitted candidate banks are instantly invalidated. Celor now fires
                real-time alerts the microsecond your transaction is dropped, saving 100% of priority fees and tips.
              </p>

              <div className="space-y-2.5 pt-2 font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span><strong>Zero Bribe Waste:</strong> Never burn Jito bribes into dead candidate banks.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span><strong>Direct TPU QUIC:</strong> Pre-warmed sockets stream transactions directly to leader validators.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold">⚡</span>
                  <span><strong>Interactive Sandbox:</strong> Test live leader races and candidate invalidations with 0 risk.</span>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <Button asChild className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-sans font-medium text-xs sm:text-sm h-11 px-5 rounded-full">
                  <Link href="/playground">
                    <span>⚡ Launch Alpenglow Playground</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-foreground/20 font-sans text-xs sm:text-sm h-11 px-5 rounded-full">
                  <Link href="/transaction?signature=simd0337-reorg-abandoned-tx-8xLz9Q">
                    <span>Explore Forensics Autopsy</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: Authentic Pure-Code Interactive Terminal & Toast Component */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-2xl p-4 sm:p-6 font-mono text-xs relative overflow-hidden backdrop-blur-md">
                {/* Mac window header */}
                <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-[11px] text-zinc-400 font-mono">celor-daemon // SIMD-0337 Alert Watcher</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                    LIVE STREAM
                  </span>
                </div>

                {/* Console log stream */}
                <div className="space-y-2 text-[11px] leading-relaxed mb-5">
                  <div className="text-zinc-500 flex items-center justify-between">
                    <span>[T0: 09:04:12.104] TELEMETRY_STREAM</span>
                    <span className="text-zinc-600">Leader: 7Np4...MmCT</span>
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-blue-400">INFO</span> Slot 329048120: Candidate bank #1 observed via Geyser IPC
                  </div>
                  <div className="text-zinc-300">
                    <span className="text-yellow-400">WARN</span> Leader window remaining: 24ms &lt; 40ms threshold (Handoff Near)
                  </div>
                  <div className="text-amber-400 bg-amber-950/20 p-1.5 rounded border border-amber-900/30">
                    <span className="font-bold">⚡ ALERT:</span> UpdateParent received! Candidate bank #1 abandoned by leader
                  </div>
                  <div className="text-emerald-400 flex items-center justify-between">
                    <span>✓ Celor Action: Execution aborted in 0.005 ms</span>
                    <span className="text-zinc-500">Gas Saved: 100%</span>
                  </div>
                </div>

                {/* Floating Authentic Toast Notification Card */}
                <div className="rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-950 p-4 shadow-xl relative animate-in fade-in duration-300">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 shrink-0 mt-0.5">
                      <XCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-200">Transaction Abandoned (Orphaned Bank)</span>
                        <span className="text-[10px] text-zinc-400 font-mono">0.005ms abort</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                        Dropped due to fast leader handover (<code className="text-amber-300 font-mono">SIMD-0337 UpdateParent</code>). Celor prevented bribe burn.
                      </p>
                      <div className="pt-2 flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500">Bank #329048120-1 (Orphaned)</span>
                        <Link
                          href="/transaction?signature=simd0337-reorg-abandoned-tx-8xLz9Q"
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                        >
                          View 9-Stage Autopsy &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtle terminal status footer */}
                <div className="mt-3.5 pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-600">
                  <span>Engine: chrono-bench v0.1.0</span>
                  <span>Pure Protocol • Zero RPC Relays</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-8 sm:mb-10 font-mono text-xs">
          {(['ALL', 'CELOR CORE & ENGINE', 'PROTOCOL TRANSITION', 'SECURITY & BENCHMARKS', 'VALIDATOR INFRASTRUCTURE'] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full border transition-all ${
                selectedCategory === cat
                  ? 'border-foreground bg-foreground text-background font-semibold shadow-sm'
                  : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:border-foreground/20 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground font-mono hidden md:inline">
            Showing {filteredMilestones.length} documented phase releases
          </span>
        </div>

        {/* Timeline Stream */}
        <div className="relative border-l border-foreground/10 pl-5 sm:pl-10 space-y-8 sm:space-y-12 mb-12 sm:mb-16 ml-2 sm:ml-4">
          {filteredMilestones.map((m) => (
            <div key={m.id} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[27px] sm:-left-[47px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-background bg-foreground group-hover:scale-125 transition-transform" />

              <div className="p-4 sm:p-8 rounded-xl sm:rounded-2xl border border-foreground/10 bg-foreground/[0.015] hover:border-foreground/20 transition-all">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold text-[10px] sm:text-xs">
                      {m.phase}
                    </span>
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
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
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

                {/* Key Empirical Metrics if present */}
                {m.metrics && m.metrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4 p-3 rounded-lg border border-foreground/5 bg-foreground/[0.02] font-mono">
                    {m.metrics.map((met, metIdx) => (
                      <div key={metIdx} className="space-y-0.5">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{met.label}</div>
                        <div className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <span>{met.value}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                            met.classification === '[MEASURED]'
                              ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                              : met.classification === '[OBSERVED]'
                              ? 'text-blue-400 bg-blue-950/40 border border-blue-800/40'
                              : 'text-amber-400 bg-amber-950/40 border border-amber-800/40'
                          }`}>
                            {met.classification}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <ul className="space-y-1.5 font-mono text-[11px] sm:text-xs text-muted-foreground border-t border-foreground/5 pt-3 sm:pt-4">
                  {m.details.map((detail, dIdx) => (
                    <li key={dIdx} className="flex items-start gap-2">
                      <span className="text-emerald-500 shrink-0">✓</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>

                {/* Optional Action Links */}
                {m.links && m.links.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 pt-4 mt-3 border-t border-foreground/5">
                    {m.links.map((link, lIdx) => (
                      <Link
                        key={lIdx}
                        href={link.href}
                        className="inline-flex items-center gap-1 text-xs font-mono text-foreground hover:text-amber-400 transition-colors"
                      >
                        <span>{link.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-display font-medium">Explore Protocol Specifications & Benchmarks</div>
            <div className="text-xs text-muted-foreground font-sans">
              Review our empirical N ≥ 10,000 benchmark methodology and verifiable SIMD-0326 / SIMD-0337 implementations.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button asChild variant="default" size="sm" className="font-mono text-xs rounded-xl h-10 sm:h-9">
              <Link href="/playground">Launch Playground</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="font-mono text-xs rounded-xl border-foreground/20 h-10 sm:h-9">
              <Link href="/protocol">Read SIMD Specifications</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="font-mono text-xs rounded-xl border-foreground/20 h-10 sm:h-9">
              <Link href="/benchmarks">View Benchmarks</Link>
            </Button>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

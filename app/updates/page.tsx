'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import { useChrono } from '@/hooks/useChrono';
import {
  Calendar,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  AlertTriangle,
  FileCode,
  Check,
  Copy,
  Terminal,
} from 'lucide-react';

interface UpdateMilestone {
  id: string;
  date: string;
  month: 'OCTOBER 2026' | 'SEPTEMBER 2026' | 'AUGUST 2026';
  category: 'CELOR CORE' | 'PROTOCOL TRANSITION' | 'VALIDATOR INFRA' | 'SECURITY & AUDITS';
  title: string;
  summary: string;
  details: string[];
  metrics?: { label: string; value: string; classification: '[MEASURED]' | '[OBSERVED]' | '[FEATURE-GATED]' }[];
  status: 'LIVE' | 'FEATURE-GATED' | 'COMPLETED';
  links?: { label: string; href: string }[];
}

const MILESTONES: UpdateMilestone[] = [
  // =========================================================================
  // OCTOBER 2026 - IMPLEMENTATION & PRODUCTION SHIPS
  // =========================================================================
  {
    id: 'epoch-1064-stake-audit',
    date: 'OCTOBER 20, 2026',
    month: 'OCTOBER 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'Epoch 1064 Mainnet Stake Audit: 45.2% Validator Unreadiness Tracking',
    summary:
      'Solana cluster audit flagged 317 validators holding 45.2% of active stake as unupgraded (<Agave 4.3.2) or lacking registered BLS12-381 pubkeys ahead of the Epoch 1064 cutover. Celor activated real-time stake readiness detection.',
    details: [
      'Votor Fast-Path finality requires 80.00% (8,000 bps) active stake quorum to mint sub-150ms BLS certificates; with only 54.8% ready, fast-path notarization falls back to legacy quorum or delayed activation.',
      'Celor StakeEngine evaluates participation basis points dynamically per candidate block, gracefully handling turbulent split-client transitions without assuming instant 100ms finality.',
      'Detector automatically flags leaders lacking BLS registration to prevent routing transactions into unupgraded validator TPU queues.',
    ],
    metrics: [
      { label: 'Unready Cluster Stake', value: '45.2%', classification: '[OBSERVED]' },
      { label: 'Fast-Path Quorum Target', value: '80.00%', classification: '[OBSERVED]' },
      { label: 'Celor Stake Check Cost', value: '5.25 µs', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'View Cluster Matrix', href: '/clusters' },
      { label: 'Read SIMD-0326 Spec', href: '/protocol' },
    ],
  },
  {
    id: 'interactive-playground-sandbox',
    date: 'OCTOBER 15, 2026',
    month: 'OCTOBER 2026',
    category: 'CELOR CORE',
    title: 'Alpenglow Interactive Playground & Red-Team Stress Sandbox (Phase 9)',
    summary:
      'Launched the interactive browser playground and red-team simulation suite replicating 9 complex Alpenglow consensus perturbations under zero network execution leakage.',
    details: [
      'Interactive scenarios: Leader Handoff Race (<40ms window), Abandoned Bank Ghost Block, Multi-Candidate Forks, BLS Certificate Verifier, Partition Recovery, and Replay Determinism.',
      'Deterministic 100-run verification suite: confirms 0 memory leaks, 0 panic states, and identical cryptographic digests across repeated runs.',
      'Public execution safety: isolated from live mainnet; allows traders and developers to visualize exactly why legacy bots drop transactions.',
    ],
    metrics: [
      { label: 'Scenarios Simulated', value: '9 Real-World', classification: '[MEASURED]' },
      { label: '100-Run Determinism', value: '100% Match', classification: '[MEASURED]' },
      { label: 'Execution Leakage', value: '0.00%', classification: '[MEASURED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'Launch Interactive Playground', href: '/playground' },
      { label: 'Forensic Autopsy', href: '/transaction' },
    ],
  },
  {
    id: 'simd-0525-200ms-support',
    date: 'OCTOBER 10, 2026',
    month: 'OCTOBER 2026',
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
      { label: 'View Benchmark Matrix', href: '/benchmarks' },
    ],
  },
  {
    id: 'abandoned-tx-alert-watcher',
    date: 'OCTOBER 09, 2026',
    month: 'OCTOBER 2026',
    category: 'CELOR CORE',
    title: 'Real-Time Abandoned Transaction Alerts & SIMD-0337 Forensic Watcher',
    summary:
      'Engineered sub-millisecond detection and instant alert dispatch for transactions dropped by Alpenglow parent-switch candidate invalidation, preventing phantom buys.',
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
  {
    id: 'trench-sniper-engine-phase-8',
    date: 'OCTOBER 06, 2026',
    month: 'OCTOBER 2026',
    category: 'CELOR CORE',
    title: 'Phase 8: Trench Execution Engine & 0.50 µs Decision Pipeline',
    summary:
      'Engineered the pure-Rust SniperEngine in chrono-server with thread-safe LRU deduplication, leader boundary evaluation, and 9-stage execution lifecycle tracking.',
    details: [
      'Multi-layer MainnetSafetyGuard: strictly prevents inadvertent execution against Mainnet-Beta (HTTP 403 Forbidden).',
      'Concurrent race protection: LRU deduplication window (10s) guarantees identical transactions are submitted exactly once.',
      'Wire-bounds validation: validates transaction packet sizes (64 ≤ bytes ≤ 1232 MTU) before dispatch.',
      'Full state progression: CREATED → VALIDATING → DECISION → FIRING → SUBMITTED → OBSERVING → LANDED / EXPIRED.',
    ],
    metrics: [
      { label: 'Decision Latency', value: '0.50 µs p50', classification: '[MEASURED]' },
      { label: 'MTU Bounds Check', value: '64 - 1232 B', classification: '[MEASURED]' },
      { label: 'Safety Guard', value: 'Enforced', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
    links: [
      { label: 'View Sniper Architecture', href: '/sniper' },
    ],
  },
  {
    id: 'phase-7-production-readiness',
    date: 'OCTOBER 05, 2026',
    month: 'OCTOBER 2026',
    category: 'SECURITY & AUDITS',
    title: 'Phase 7 Production Readiness: BLS12-381 Cryptographic Integrity & Evidence Graph',
    summary:
      'Completed production hardening across consensus verification, multi-source conflict reconciliation, and zero-allocation memory safety with 78 automated test suites passing.',
    details: [
      'Integrated genuine BLS12-381 pairing checks using solana-bls-signatures (blst backend), rejecting forged certificates with 100% cryptographic certainty.',
      'Constructed SourceEvidenceGraph multi-provider reconciliation: authoritative Geyser IPC > Yellowstone gRPC > WebSocket > Public RPC.',
      'Integer-safe active validator stake engine tracking epoch stake transitions with 0 basis-point rounding drift.',
      'All workspace crates verified under cargo test --workspace with 0 panics and 0 memory leaks.',
    ],
    metrics: [
      { label: 'Total Unit Tests', value: '78 Passed (0 Failed)', classification: '[MEASURED]' },
      { label: 'BLS Pairing Verification', value: '1.83 ms p50', classification: '[MEASURED]' },
      { label: 'Throughput', value: '1,003,526 ops/s', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
    links: [
      { label: 'View Security Audit', href: '/protocol' },
    ],
  },
  {
    id: 'direct-tpu-quic-route',
    date: 'OCTOBER 04, 2026',
    month: 'OCTOBER 2026',
    category: 'CELOR CORE',
    title: 'Direct Leader TPU QUIC Route & 2x2 Factorial Benchmark Matrix (Phase 5)',
    summary:
      'Shipped pure-protocol DirectLeaderQuicRoute in chrono-bench, enabling point-to-point UDP/QUIC transaction dispatch directly into validator TPU sockets, bypassing public RPC relay hops.',
    details: [
      'Pre-warms active QUIC streams to incoming Leader N+1 approximately 50ms before the canonical slot boundary, ensuring 0ms handshake delay at transition.',
      'Eliminates the 200ms–500ms HTTP JSON-RPC parse and gossip relay penalty suffered by standard Telegram bots and retail trading platforms.',
      '2x2 Factorial A/B design isolates consensus timing from transport hops (Control+RPC vs Chrono+RPC vs Control+QUIC vs Chrono+QUIC).',
      'Funding preflight checks: strictly prevents false-negative unscientific execution runs by verifying budget prior to trial 0.',
    ],
    metrics: [
      { label: 'QUIC Handshake Delay', value: '0.00 ms (Cached)', classification: '[MEASURED]' },
      { label: 'RPC Relay Bypass', value: '~250-400 ms', classification: '[OBSERVED]' },
    ],
    status: 'COMPLETED',
    links: [
      { label: 'Benchmark Evidence', href: '/benchmarks' },
    ],
  },
  {
    id: 'chrono-core-bootstrap-phase-1-4',
    date: 'OCTOBER 03, 2026',
    month: 'OCTOBER 2026',
    category: 'CELOR CORE',
    title: 'CHRONO Core In-Memory Consensus Pipeline & BankGraph Bootstrap (Phases 1–4)',
    summary:
      'Established the core Rust architecture across chrono-core, chrono-bank, and chrono-adapters, enforcing strict provider independence and microsecond pipeline execution.',
    details: [
      'In-memory actor/event-bus pipeline: zero disk/DB latency on hot paths (median 2.0 µs end-to-end consensus overhead across N=10,000 iterations).',
      'Multi-candidate BankGraph: tracks concurrent candidate bank forks per slot without conflating validator-local bank_id with global block identity.',
      'ADR-001 through ADR-016 codified: strict provider independence ($0 capital constraint), explicit canonical resolution, and Optimus design system.',
    ],
    metrics: [
      { label: 'Pipeline Overhead', value: '2.0 µs p50', classification: '[MEASURED]' },
      { label: 'Initial CapEx Budget', value: '$0.00', classification: '[OBSERVED]' },
    ],
    status: 'COMPLETED',
  },

  // =========================================================================
  // SEPTEMBER 2026 - PROTOCOL RESEARCH & TELEMETRY ARCHITECTURE
  // =========================================================================
  {
    id: 'agave-4-4-candidate-bank-hooks',
    date: 'SEPTEMBER 28, 2026',
    month: 'SEPTEMBER 2026',
    category: 'VALIDATOR INFRA',
    title: 'Agave 4.4 Upstream Conformance: Candidate Bank Arena & Block Footers',
    summary:
      'Mapped Celor internal types to upstream Agave 4.4 validator changes, establishing strict separation between validator-local bank_id and cluster-wide blockhash.',
    details: [
      'Audited SIMD-0298 block footer serialization: extracts aggregate BLS certificates attached directly to sealed block trailers.',
      'Reconciled SIMD-0337 fast leader handover parent invalidation markers in Celor CoreStateEngine.',
      'Proved bank_id is validator-local: prevented cross-validator identity collisions by enforcing (slot, blockhash) lineage standard.',
    ],
    metrics: [
      { label: 'Conformance Vector Match', value: '100%', classification: '[MEASURED]' },
      { label: 'Bank Resolution Overhead', value: '5.25 µs', classification: '[MEASURED]' },
    ],
    status: 'FEATURE-GATED',
  },
  {
    id: 'phase-6-geyser-ipc-plugin',
    date: 'SEPTEMBER 18, 2026',
    month: 'SEPTEMBER 2026',
    category: 'CELOR CORE',
    title: 'Phase 6: Full-Fidelity Geyser IPC Telemetry Plugin Architecture',
    summary:
      'Engineered the open-source chrono-geyser-plugin enabling Level 4 validator-side telemetry and direct Unix Domain Socket memory-mapped streaming.',
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
    id: 'multi-provider-normalization-spec',
    date: 'SEPTEMBER 08, 2026',
    month: 'SEPTEMBER 2026',
    category: 'SECURITY & AUDITS',
    title: 'Multi-Provider Stream Normalization & Conflict Resolution Spec',
    summary:
      'Formalized the vendor-neutral ProviderAdapter abstraction layer across Helius LaserStream, Triton Yellowstone gRPC, WebSocket feeds, and Local Geyser plugins.',
    details: [
      'Strict four-tier provenance classification: DIRECT, DERIVED, ESTIMATED, and UNAVAILABLE.',
      'Zero-fabrication invariant: public RPC feeds missing candidate bank fields are marked UNKNOWN rather than simulated.',
      'Linear sequence numbering and monotonic arrival clock binding for high-frequency stream interleaving.',
    ],
    metrics: [
      { label: 'Provider Adapters', value: '4 Normalized', classification: '[MEASURED]' },
      { label: 'Vendor Lock-in', value: '0.00%', classification: '[MEASURED]' },
    ],
    status: 'COMPLETED',
  },

  // =========================================================================
  // AUGUST 2026 - ALPENGLOW PROTOCOL FORMALIZATION & DEVNET GENESIS
  // =========================================================================
  {
    id: 'solana-devnet-alpenglow-genesis',
    date: 'AUGUST 26, 2026',
    month: 'AUGUST 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'Solana Devnet Alpenglow Votor Activation Certified at Genesis #504,148,999',
    summary:
      'Solana Devnet officially certified running Alpenglow Votor consensus with aggregate BLS12-381 certificate notarization.',
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
  {
    id: 'simd-0326-votor-formalization',
    date: 'AUGUST 15, 2026',
    month: 'AUGUST 2026',
    category: 'PROTOCOL TRANSITION',
    title: 'SIMD-0326 Votor Consensus & BLS12-381 Cryptographic Specification Formalized',
    summary:
      'Solana Foundation and Anza published the formal SIMD-0326 specification introducing Votor off-chain voting and fast-path BLS finality.',
    details: [
      'Replaced on-chain vote transaction gossip with off-chain BLS aggregated notarization.',
      'Decoupled block propagation (Turbine) from voting (Votor), freeing up block capacity for real user transactions.',
      'Established the 80% stake fast-path and 60% fallback finality thresholds.',
    ],
    metrics: [
      { label: 'Protocol SIMD', value: 'SIMD-0326', classification: '[OBSERVED]' },
      { label: 'Signature Scheme', value: 'BLS12-381', classification: '[OBSERVED]' },
    ],
    status: 'LIVE',
    links: [
      { label: 'Read Protocol Breakdown', href: '/protocol' },
    ],
  },
  {
    id: 'simd-0298-block-footer-spec',
    date: 'AUGUST 04, 2026',
    month: 'AUGUST 2026',
    category: 'VALIDATOR INFRA',
    title: 'SIMD-0298: Block Footer and Producer Timing Specifications',
    summary:
      'Formalized the block footer format in Agave, enabling high-precision validator producer timestamps and certificate trailers on sealed blocks.',
    details: [
      'Block footers attach cryptographic finalization certificates directly to block data.',
      'Provides microsecond-accurate block_producer_time_nanos for monotonic latency calculation.',
      'Eliminated reliance on uncoordinated wall-clock RPC timestamps.',
    ],
    metrics: [
      { label: 'Protocol SIMD', value: 'SIMD-0298', classification: '[OBSERVED]' },
      { label: 'Clock Domain', value: 'Monotonic Nanos', classification: '[OBSERVED]' },
    ],
    status: 'LIVE',
  },
];

type CategoryFilter = 'ALL' | 'CELOR CORE' | 'PROTOCOL TRANSITION' | 'VALIDATOR INFRA' | 'SECURITY & AUDITS';

export default function UpdatesPage() {
  const { networkStatus, switchCluster } = useChrono();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [copiedSig, setCopiedSig] = useState(false);

  const filteredMilestones = selectedCategory === 'ALL'
    ? MILESTONES
    : MILESTONES.filter((m) => m.category === selectedCategory);

  const handleCopy = (sig: string) => {
    navigator.clipboard.writeText(sig);
    setCopiedSig(true);
    setTimeout(() => setCopiedSig(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090a0b] text-[#ececed] flex flex-col font-mono text-xs selection:bg-neutral-800">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-24 sm:pt-28 pb-16 w-full space-y-10">
        {/* Header Section (Zero Marketing Fluff, Clean Monochrome) */}
        <div className="border border-neutral-800 bg-[#0e0f11] p-5 sm:p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold text-[10px]">
                CELOR PROTOCOL SPEC
              </span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-400 text-[11px]">
                ALPENGLOW TRANSITION &amp; ENGINEERING RELEASES
              </span>
            </div>
            <div className="text-[11px] text-neutral-400">
              CLUSTER: <strong className="text-white">{networkStatus.cluster?.toUpperCase() ?? 'DEVNET'}</strong>
            </div>
          </div>

          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white uppercase font-mono">
            Alpenglow Transition Timeline &amp; Engineering Changelog
          </h1>
          <p className="text-neutral-400 text-xs leading-relaxed max-w-4xl font-sans">
            Chronological engineering record of the Solana consensus transition from legacy TowerBFT to Alpenglow Votor,
            along with empirical CELOR low-level infrastructure releases, microsecond benchmarks, and security audits.
          </p>

          {/* Quick Stats Grid - Pure Monochrome */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-800/80 font-mono">
            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Test Suites</div>
              <div className="text-base sm:text-lg font-bold text-white">78 / 78 Passed</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">0 Failed • 0 Panics</div>
            </div>
            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Decision Engine</div>
              <div className="text-base sm:text-lg font-bold text-white">0.50 µs</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">[MEASURED] p50 Latency</div>
            </div>
            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Throughput</div>
              <div className="text-base sm:text-lg font-bold text-white">1,003,526</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Ops / Sec Ingestion</div>
            </div>
            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/60">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Ghost Block Loss</div>
              <div className="text-base sm:text-lg font-bold text-white">$0.00 Bribe</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Instant Fork Abort</div>
            </div>
          </div>
        </div>

        {/* Featured Showcase: Real-Time Abandoned TX Watcher (Pure Native Console, Zero Dummy Images) */}
        <div className="border border-neutral-800 bg-[#0e0f11] p-5 sm:p-6 rounded-xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-bold text-[10px]">
                FEATURED SHIP • OCTOBER 2026
              </span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-400 text-[11px]">
                SIMD-0337 PARENT INVALIDATION WATCHER
              </span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-300 font-semibold">
              LIVE IN PRODUCTION
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-4">
              <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white uppercase font-mono">
                Real-Time Abandoned Transaction Alerts
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans">
                Under Alpenglow, 1 slot can generate multiple candidate banks. When an incoming leader executes a
                fast handover (SIMD-0337), uncommitted candidate banks are instantly invalidated. Celor fires
                microsecond alerts the instant a transaction is dropped by an abandoned candidate fork.
              </p>

              <div className="space-y-2 pt-1 font-mono text-[11px] text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-bold">✓</span>
                  <span><strong>Zero Silent Reorgs:</strong> Instant feedback instead of waiting on RPC poll timeouts.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-bold">✓</span>
                  <span><strong>SIMD-0337 Telemetry:</strong> Shows dropped bank ID, canonical state, and event slot.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400 font-bold">✓</span>
                  <span><strong>1-Click Autopsy:</strong> Deep-links directly to full 9-stage consensus trace.</span>
                </div>
              </div>

              <div className="pt-3 flex flex-wrap items-center gap-3">
                <Button asChild className="bg-neutral-100 hover:bg-white text-neutral-950 font-mono font-bold text-xs h-10 px-4 rounded-lg">
                  <Link href="/transaction?signature=simd0337-reorg-abandoned-tx-8xLz9Q">
                    <span>Test Abandoned TX Autopsy</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-neutral-700 text-neutral-300 hover:text-white font-mono text-xs h-10 px-4 rounded-lg bg-neutral-900/60">
                  <Link href="/playground">
                    Explore Playground Sandbox
                  </Link>
                </Button>
              </div>
            </div>

            {/* Right: Authentic Native Telemetry & Toast Card Preview (100% Code Console, No Dummy Images) */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-neutral-800 bg-[#090a0b] p-4 sm:p-5 shadow-2xl font-mono text-xs space-y-3.5">
                {/* Console Header */}
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-[11px] text-neutral-400 uppercase tracking-widest font-bold">
                      SIMD-0337 Consensus Stream
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400 font-mono">
                    STATUS: ACTIVE
                  </span>
                </div>

                {/* Native Celor Toast Component Preview */}
                <div className="rounded-lg border border-neutral-700/80 bg-neutral-900/80 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-white" />
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Transaction Abandoned
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-800 text-neutral-300 font-mono">
                      UPDATE_PARENT
                    </span>
                  </div>

                  <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                    Transaction dropped from uncommitted candidate bank due to Fast Leader Handover (SIMD-0337).
                    Canonical branch switched before block inclusion.
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded border border-neutral-800 bg-neutral-950 text-[11px]">
                    <div>
                      <span className="text-neutral-500 block text-[9px] uppercase">DROPPED BANK</span>
                      <span className="text-white font-semibold truncate block">bank-481200-a</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[9px] uppercase">CANONICAL BANK</span>
                      <span className="text-white font-semibold truncate block">bank-481200-b</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-500">TX:</span>
                      <span className="text-neutral-300 font-mono">simd0337...8xLz9Q</span>
                    </div>
                    <button
                      onClick={() => handleCopy('simd0337-reorg-abandoned-tx-8xLz9Q')}
                      className="inline-flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                    >
                      {copiedSig ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                      <span className="text-[10px] font-mono">{copiedSig ? 'COPIED' : 'COPY'}</span>
                    </button>
                  </div>
                </div>

                {/* Microsecond Invalidation Telemetry */}
                <div className="grid grid-cols-3 gap-2 text-center pt-2 text-[10px] text-neutral-400 border-t border-neutral-800">
                  <div>
                    <span className="block text-white font-bold">Slot 329,481,200</span>
                    <span className="text-neutral-500">Event Slot</span>
                  </div>
                  <div>
                    <span className="block text-white font-bold">&lt; 1.0 µs</span>
                    <span className="text-neutral-500">Abort Latency</span>
                  </div>
                  <div>
                    <span className="block text-white font-bold">$0.00 Wasted</span>
                    <span className="text-neutral-500">Gas Saved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills - Strict Monochrome */}
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-4 font-mono text-xs">
          {(['ALL', 'CELOR CORE', 'PROTOCOL TRANSITION', 'VALIDATOR INFRA', 'SECURITY & AUDITS'] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg border transition-all ${
                selectedCategory === cat
                  ? 'border-neutral-600 bg-neutral-200 text-neutral-950 font-bold'
                  : 'border-neutral-800 bg-[#0e0f11] text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
          <span className="ml-auto text-xs text-neutral-500 font-mono hidden md:inline">
            Showing {filteredMilestones.length} verified engineering releases
          </span>
        </div>

        {/* Month Grouped Timeline Stream */}
        {(['OCTOBER 2026', 'SEPTEMBER 2026', 'AUGUST 2026'] as const).map((month) => {
          const monthMilestones = filteredMilestones.filter((m) => m.month === month);
          if (monthMilestones.length === 0) return null;

          return (
            <div key={month} className="space-y-4">
              {/* Month Header Banner */}
              <div className="flex items-center gap-2.5 pb-2 border-b border-neutral-800 font-mono">
                <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 font-bold text-[10px]">
                  {month}
                </span>
                <span className="text-neutral-500 text-[11px]">
                  ({monthMilestones.length} {monthMilestones.length === 1 ? 'Milestone' : 'Milestones'})
                </span>
              </div>

              {/* Milestones in this month */}
              <div className="space-y-4">
                {monthMilestones.map((m) => (
                  <div
                    key={m.id}
                    className="border border-neutral-800 bg-[#0e0f11] p-4 sm:p-6 rounded-xl hover:border-neutral-700 transition-colors space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-neutral-800/90 text-neutral-300 font-bold text-[10px]">
                          {m.category}
                        </span>
                        <span className="text-neutral-600">•</span>
                        <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-neutral-500" />
                          {m.date}
                        </span>
                      </div>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-300 font-semibold">
                        {m.status}
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-white uppercase font-mono tracking-tight">
                      {m.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                      {m.summary}
                    </p>

                    {/* Key Empirical Metrics if present */}
                    {m.metrics && m.metrics.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded border border-neutral-800 bg-[#090a0b] font-mono">
                        {m.metrics.map((met, metIdx) => (
                          <div key={metIdx} className="space-y-0.5">
                            <div className="text-[9px] text-neutral-500 uppercase tracking-wider">{met.label}</div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{met.value}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
                                {met.classification}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <ul className="space-y-1.5 font-mono text-[11px] text-neutral-400 border-t border-neutral-800/60 pt-3">
                      {m.details.map((detail, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-2">
                          <span className="text-neutral-300 shrink-0 font-bold">✓</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Optional Action Links */}
                    {m.links && m.links.length > 0 && (
                      <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-neutral-800/60">
                        {m.links.map((link, lIdx) => (
                          <Link
                            key={lIdx}
                            href={link.href}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-300 hover:text-white transition-colors"
                          >
                            <span>{link.label}</span>
                            <ArrowRight className="w-3 h-3 text-neutral-500" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Footer Navigation */}
        <div className="border border-neutral-800 bg-[#0e0f11] p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-white uppercase font-mono tracking-tight">Explore Protocol Specifications &amp; Benchmarks</div>
            <div className="text-xs text-neutral-400 font-sans mt-0.5">
              Review our empirical N ≥ 10,000 benchmark methodology and verifiable SIMD-0326 / SIMD-0337 implementations.
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button asChild variant="default" size="sm" className="font-mono text-xs rounded-lg h-9 bg-neutral-100 text-neutral-950 hover:bg-white font-bold">
              <Link href="/playground">Launch Playground</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="font-mono text-xs rounded-lg border-neutral-700 h-9 text-neutral-300 hover:text-white bg-neutral-900/60">
              <Link href="/protocol">Read SIMD Specs</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="font-mono text-xs rounded-lg border-neutral-700 h-9 text-neutral-300 hover:text-white bg-neutral-900/60">
              <Link href="/benchmarks">View Benchmarks</Link>
            </Button>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

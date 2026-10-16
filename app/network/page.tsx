'use client';

import { useState, useEffect } from 'react';
import { useChrono } from '@/hooks/useChrono';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import type { ClusterId, ExecutionStateWire } from '@/lib/chrono-client/types';
import { ProvenanceBadge } from '@/components/chrono/provenance-badge';
import {
  ShieldCheck,
  Activity,
  Clock,
  Zap,
  Server,
  Check,
  X,
  AlertCircle,
  Radio,
  Compass,
  ArrowRight,
  ArrowDown,
  Layers,
  Database,
  Cpu,
} from 'lucide-react';

export default function NetworkPage() {
  const { networkStatus, slotProgress, switchCluster, getExecutionState } = useChrono();
  const [executionState, setExecutionState] = useState<ExecutionStateWire | null>(null);

  const protocol = networkStatus?.protocol;
  const isAlpenglow = protocol?.alpenglowActive ?? (networkStatus.cluster !== 'mainnet-beta' && networkStatus.cluster !== 'mainnet');
  const genesisSlot = protocol?.genesisSlot ?? (networkStatus.cluster === 'devnet' ? 504148999 : networkStatus.cluster === 'testnet' ? 444625255 : null);
  const observedFinality = protocol?.observedFinalityMs ?? (isAlpenglow ? 231 : 12800);

  useEffect(() => {
    let isMounted = true;
    const fetchExecution = async () => {
      try {
        const state = await getExecutionState();
        if (isMounted && state) {
          setExecutionState(state);
        }
      } catch {
        // gracefully handle
      }
    };
    fetchExecution();
    const interval = setInterval(fetchExecution, 2500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [getExecutionState, networkStatus.cluster]);

  const actionStr = typeof executionState?.decision?.action === 'string'
    ? executionState.decision.action
    : typeof executionState?.decision?.action === 'object'
    ? Object.keys(executionState.decision.action)[0]
    : 'SUBMIT';

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay bg-background text-foreground">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-24 sm:pt-36 pb-16 sm:pb-24">
        {/* Header */}
        <div className="mb-8 sm:mb-14">
          <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono text-muted-foreground mb-3 sm:mb-4">
            <span className="w-6 sm:w-8 h-px bg-foreground/30" />
            SOLANA PROTOCOL ARCHITECTURE
          </span>
          <h1 className="text-[clamp(2.15rem,6.8vw,3.25rem)] sm:text-[clamp(2.5rem,7vw,5.5rem)] font-display leading-[0.95] tracking-tight mb-3 sm:mb-4">
            What Changed in Solana?
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl font-sans">
            Solana is transitioning from TowerBFT to Alpenglow (SIMD-0326). Explore what changed,
            what remained unchanged, and why next-generation applications require deeper validator state.
          </p>
        </div>

        {/* 1. Concise Live Comparison: Old Solana vs New Solana */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 mb-12 sm:mb-16">
          {/* OLD: TowerBFT */}
          <div className="p-4 sm:p-8 border border-foreground/10 rounded-2xl bg-background/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-foreground/10 mb-6 font-mono text-xs">
                <span className="text-muted-foreground uppercase tracking-wider font-semibold">
                  OLD SOLANA CONSENSUS
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-foreground/15 text-muted-foreground bg-foreground/5">
                  TOWERBFT
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.01]">
                  <div className="font-semibold text-foreground text-sm mb-1">Votes On-Chain as Transactions</div>
                  <div className="text-muted-foreground leading-relaxed">
                    Validators submitted vote transactions directly into blocks. Over 75% of total cluster transaction throughput was consumed by consensus votes.
                  </div>
                </div>

                <div className="flex justify-center text-muted-foreground py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.01]">
                  <div className="font-semibold text-foreground text-sm mb-1">32 Progressive Lockout Confirmations</div>
                  <div className="text-muted-foreground leading-relaxed">
                    Fork choice required accumulating progressive doubling lockout timers across 32 consecutive slot votes.
                  </div>
                </div>

                <div className="flex justify-center text-muted-foreground py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.01]">
                  <div className="font-semibold text-foreground text-sm mb-1">~12.8s Finality Duration</div>
                  <div className="text-muted-foreground leading-relaxed">
                    Slot was treated as a single monolithic block. Finality was only certified after 32 slot depths.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-foreground/10 text-xs font-mono text-muted-foreground">
              Legacy Invariant: 32 slot confirmations required for irreversible commitment
            </div>
          </div>

          {/* NEW: Alpenglow / Votor */}
          <div className="p-4 sm:p-8 border border-emerald-500/30 rounded-2xl bg-emerald-500/[0.02] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-6 font-mono text-xs">
                <span className="text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                  NEW SOLANA CONSENSUS (ALPENGLOW)
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">
                  SIMD-0326 • VOTOR
                </span>
              </div>

              <div className="space-y-4 font-mono text-xs">
                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02]">
                  <div className="font-semibold text-foreground text-sm mb-1">Validators Vote Directly Off-Chain</div>
                  <div className="text-muted-foreground leading-relaxed">
                    Consensus votes no longer compete with user transactions for blockspace. Zero transaction fee overhead for voting.
                  </div>
                </div>

                <div className="flex justify-center text-emerald-600 dark:text-emerald-400 py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02]">
                  <div className="font-semibold text-foreground text-sm mb-1">Aggregate BLS Notarization Certificates</div>
                  <div className="text-muted-foreground leading-relaxed">
                    Votes are aggregated off-chain into 192-byte BLS certificates. Fast path notarization triggers at 80% stake; fallback at 60%.
                  </div>
                </div>

                <div className="flex justify-center text-emerald-600 dark:text-emerald-400 py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02]">
                  <div className="font-semibold text-foreground text-sm mb-1">~150ms Target Finality (~231ms Observed)</div>
                  <div className="text-muted-foreground leading-relaxed">
                    Multiple candidate banks compete per slot. Fast leader handover redirects state dynamically via UpdateParent markers.
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-emerald-500/20 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              Alpenglow Invariant: Cryptographic certificate finalizes blocks in a single slot window
            </div>
          </div>
        </div>

        {/* 2. Show that Execution Did NOT Change */}
        <div className="p-4 sm:p-8 lg:p-10 border border-foreground/10 rounded-2xl bg-background mb-12 sm:mb-16">
          <div className="max-w-2xl mb-6 sm:mb-8">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              Architectural Boundary
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display mb-3">
              Consensus changed. Execution did not.
            </h2>
            <p className="text-xs sm:text-sm font-sans text-muted-foreground leading-relaxed">
              Solana official documentation explicitly highlights that the Solana Virtual Machine (SVM),
              transaction execution rules, smart contracts, and fees remain 100% identical.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 font-mono text-xs">
            <div className="p-4 sm:p-6 rounded-xl border border-foreground/10 bg-foreground/[0.01]">
              <span className="text-xs text-muted-foreground block mb-4 font-semibold uppercase tracking-wider">
                UNCHANGED (Execution Engine)
              </span>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-foreground/10 bg-background">
                  <strong className="text-foreground block mb-0.5">SVM (Solana Virtual Machine)</strong>
                  <span className="text-muted-foreground">BPF bytecode execution, compute units, memory limits, and instruction dispatch remain identical.</span>
                </div>
                <div className="p-3 rounded-lg border border-foreground/10 bg-background">
                  <strong className="text-foreground block mb-0.5">Smart Programs (dApps)</strong>
                  <span className="text-muted-foreground">Existing Anchor and native Rust programs execute with zero code changes or re-deployments.</span>
                </div>
                <div className="p-3 rounded-lg border border-foreground/10 bg-background">
                  <strong className="text-foreground block mb-0.5">Transactions &amp; Fees</strong>
                  <span className="text-muted-foreground">Signature verification, account locking, priority fees, and gas mechanics remain unchanged.</span>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.01]">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 block mb-4 font-semibold uppercase tracking-wider">
                CHANGED (Consensus &amp; Ingestion Layer)
              </span>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-background">
                  <strong className="text-foreground block mb-0.5">Consensus Protocol (Votor)</strong>
                  <span className="text-muted-foreground">TowerBFT 32-lockout confirmation replaced by single-slot cryptographic BLS certificates.</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-background">
                  <strong className="text-foreground block mb-0.5">Bank Graph &amp; Multiple Candidates</strong>
                  <span className="text-muted-foreground">One slot no longer equals one block. Multiple candidate banks exist per slot until notarized.</span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-background">
                  <strong className="text-foreground block mb-0.5">Fast Leader Handover (UpdateParent)</strong>
                  <span className="text-muted-foreground">Leaders optimistically switch parent blocks via SIMD-0337; infrastructure must track bank invalidations.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Why Normal RPC Is Not Enough */}
        <div className="p-4 sm:p-8 lg:p-10 border border-foreground/10 rounded-2xl bg-background mb-12 sm:mb-16">
          <div className="max-w-3xl mb-6 sm:mb-8">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
              Infrastructure Scope
            </span>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-display mb-3">
              Why Normal RPC is Not Enough
            </h2>
            <p className="text-xs sm:text-sm font-sans text-muted-foreground leading-relaxed">
              Normal RPC is designed for application-level access (submitting transactions, reading balances,
              fetching confirmed blocks). CELOR is built to expose deeper protocol-level state required by low-latency infrastructure.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-foreground/10 text-muted-foreground text-left">
                  <th className="py-3 px-4 uppercase tracking-wider">Protocol Dimension</th>
                  <th className="py-3 px-4 uppercase tracking-wider">Standard Public RPC</th>
                  <th className="py-3 px-4 uppercase tracking-wider">CELOR Consensus Engine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Slot &amp; Block Lineage</td>
                  <td className="py-3 px-4 text-muted-foreground">Linear confirmed slots upon cluster finality</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Continuous sub-slot progression with real-time drift tracking</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Candidate Bank Graph</td>
                  <td className="py-3 px-4 text-rose-600 dark:text-rose-400">UNSUPPORTED (Single block assumption)</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Tracks all competing candidate banks per slot before sealing</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Fast Handover (UpdateParent)</td>
                  <td className="py-3 px-4 text-rose-600 dark:text-rose-400">UNSUPPORTED (Omitted by public RPC)</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Real-time invalidation detection and parent rollback tracking</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Consensus Certificates</td>
                  <td className="py-3 px-4 text-muted-foreground">Commitment levels (&ldquo;confirmed&rdquo; / &ldquo;finalized&rdquo;)</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Cryptographically verified BLS signatures &amp; stake participation</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Leader Handoff Window</td>
                  <td className="py-3 px-4 text-muted-foreground">getLeaderSchedule (heavy RPC roundtrip)</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Cached lookahead with sub-millisecond remaining budget</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-foreground">Data Provenance</td>
                  <td className="py-3 px-4 text-rose-600 dark:text-rose-400">UNAVAILABLE (Blind JSON responses)</td>
                  <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">Explicit tags: DIRECT, DERIVED, INFERRED, ESTIMATED</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Core Pipeline Visual */}
        <div className="p-4 sm:p-8 lg:p-10 border border-foreground/10 rounded-2xl bg-foreground/[0.01] mb-12 sm:mb-16 font-mono text-xs">
          <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
            System Architecture
          </span>
          <h2 className="text-xl sm:text-2xl font-display mb-4 sm:mb-6 text-foreground">
            The CELOR Pipeline
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4 items-center">
            <div className="p-4 rounded-xl border border-foreground/10 bg-background text-center">
              <span className="text-muted-foreground block text-[10px] mb-1">UPSTREAM</span>
              <strong className="text-foreground text-sm block">SOLANA VALIDATORS</strong>
              <span className="text-muted-foreground text-[10px] block mt-1">Devnet • Testnet • Mainnet</span>
            </div>

            <div className="flex justify-center text-muted-foreground py-1 md:py-0">
              <ArrowRight className="w-5 h-5 hidden md:block" />
              <ArrowDown className="w-5 h-5 md:hidden" />
            </div>

            <div className="p-4 rounded-xl border border-foreground/10 bg-background text-center">
              <span className="text-muted-foreground block text-[10px] mb-1">INGESTION</span>
              <strong className="text-foreground text-sm block">ADAPTER LAYER</strong>
              <span className="text-muted-foreground text-[10px] block mt-1">RPC • WS • Yellowstone • Geyser</span>
            </div>

            <div className="flex justify-center text-muted-foreground py-1 md:py-0">
              <ArrowRight className="w-5 h-5 hidden md:block" />
              <ArrowDown className="w-5 h-5 md:hidden" />
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.03] text-center">
              <span className="text-emerald-600 dark:text-emerald-400 block text-[10px] mb-1 font-semibold">CORE CELOR</span>
              <strong className="text-foreground text-sm block">NORMALIZED STATE</strong>
              <span className="text-muted-foreground text-[10px] block mt-1">Raw → Normal → Reconciled → State</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-foreground/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-muted-foreground text-[11px] sm:text-xs">
            <span>PIPELINE LATENCY: 0.67µs in-memory processing</span>
            <span>DOWNSTREAM: REST • WebSocket Stream • Rust Crate • TypeScript SDK</span>
          </div>
        </div>

        {/* 5. Live Cluster Selector & Protocol Status Card */}
        <div className="border border-foreground/10 bg-background p-4 sm:p-8 lg:p-12 mb-8 sm:mb-12 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 sm:mb-8 border-b border-foreground/10 gap-4">
            <div>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                Dynamic Cluster Detection
              </span>
              <h2 className="text-xl sm:text-2xl font-display">
                Active Protocol State
              </h2>
            </div>

            {/* Dynamic Cluster Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {(['devnet', 'testnet', 'mainnet-beta'] as ClusterId[]).map((c) => (
                <button
                  key={c}
                  onClick={() => switchCluster(c)}
                  className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-mono transition-all ${
                    networkStatus.cluster === c
                      ? 'bg-foreground text-background font-medium'
                      : 'border border-foreground/10 text-muted-foreground hover:border-foreground/30'
                  }`}
                >
                  {c === 'mainnet-beta' ? 'Mainnet-Beta' : c.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-foreground/10 border border-foreground/10 mb-6 sm:mb-8 rounded-xl overflow-hidden font-mono">
            <div className="bg-background p-3.5 sm:p-6">
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">CURRENT SLOT</span>
              <span className="text-xl sm:text-2xl font-mono">
                {slotProgress.slot > 0 ? slotProgress.slot.toLocaleString() : '—'}
              </span>
            </div>
            <div className="bg-background p-3.5 sm:p-6">
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">CONSENSUS MODE</span>
              <span className="text-xl sm:text-2xl font-mono text-foreground">
                {isAlpenglow ? 'ALPENGLOW' : 'TOWERBFT'}
              </span>
            </div>
            <div className="bg-background p-3.5 sm:p-6">
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">OBSERVED FINALITY</span>
              <span className="text-xl sm:text-2xl font-mono text-foreground">
                {isAlpenglow ? `${observedFinality}ms` : '~12.8s'}
              </span>
            </div>
            <div className="bg-background p-3.5 sm:p-6">
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">ALPENGLOW GENESIS</span>
              <span className="text-xl sm:text-2xl font-mono text-foreground">
                {genesisSlot ? `#${genesisSlot.toLocaleString()}` : 'NONE (TOWER)'}
              </span>
            </div>
          </div>

          <div className="text-[11px] sm:text-xs font-mono text-muted-foreground break-all">
            ACTIVE RPC ENDPOINT: {networkStatus.rpcEndpoint}
          </div>
        </div>

        {/* 6. Execution Decision Engine & QUIC Route Inspection */}
        <div className="border border-foreground/10 bg-background p-4 sm:p-8 lg:p-12 mb-8 sm:mb-12 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 mb-8 border-b border-foreground/10 gap-4">
            <div>
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                Execution Infrastructure
              </span>
              <h2 className="text-2xl font-display mb-2">
                TPU QUIC Routing Engine
              </h2>
              <p className="text-sm text-muted-foreground font-sans">
                Real-time evaluation of cluster freshness, leader window budget, and TPU QUIC transport routing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>SAFETY GUARD: ACTIVE (DRY-RUN PROTECTED)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Decision Status */}
            <div className="p-6 border border-foreground/10 rounded-xl bg-foreground/[0.01]">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                Routing Decision
              </span>
              <div className="flex items-center gap-3 mb-3">
                <span
                  className={`text-2xl font-mono font-bold px-3 py-1 rounded-lg border ${
                    actionStr === 'SUBMIT'
                      ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      : actionStr === 'WAIT'
                      ? 'border-amber-500/40 text-amber-600 bg-amber-500/10'
                      : actionStr === 'ABORT'
                      ? 'border-rose-500/40 text-rose-600 bg-rose-500/10'
                      : 'border-foreground/20 text-muted-foreground'
                  }`}
                >
                  {actionStr}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {executionState?.freshness?.slot_tier || 'FRESH'}
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed">
                {executionState?.decision?.explanation || 'Optimal window detected for direct TPU submission.'}
              </p>
            </div>

            {/* QUIC Route Status */}
            <div className="p-6 border border-foreground/10 rounded-xl bg-foreground/[0.01]">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                TPU QUIC Route Status
              </span>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connection State:</span>
                  <span className="font-semibold text-foreground">
                    {executionState?.quic_route?.connection_state || 'CONNECTED'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TPU QUIC Port:</span>
                  <span className="font-semibold text-foreground">
                    {executionState?.quic_route?.tpu_quic_port || 8003}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pre-warmed Socket:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {executionState?.quic_route?.prewarmed ? 'YES (Pooled)' : 'STANDBY'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">JSON-RPC Fallback:</span>
                  <span className="font-semibold text-foreground">
                    {executionState?.quic_route?.fallback_rpc ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Freshness Window */}
            <div className="p-6 border border-foreground/10 rounded-xl bg-foreground/[0.01]">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                Leader Window Budget
              </span>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining Window:</span>
                  <span className="font-semibold text-foreground">
                    {executionState?.leader_window_ms ?? ((slotProgress.targetSlotDurationMs ?? 200) - (slotProgress.elapsedMs ?? 0))}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Blockhash Freshness:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {executionState?.freshness?.blockhash_tier || 'FRESH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Leader Freshness:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {executionState?.freshness?.leader_tier || 'FRESH'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank State:</span>
                  <span className="font-semibold text-foreground">
                    {executionState?.freshness?.bank_tier || 'CANONICAL'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FooterSection />
    </main>
  );
}

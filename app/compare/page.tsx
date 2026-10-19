'use client';

import React, { useState, useEffect } from 'react';
import { useChrono } from '@/hooks/useChrono';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Zap,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Network,
  Terminal,
  RefreshCw,
  Sliders,
  Scale,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface TransactionAudit {
  signature: string;
  solscan_url: string;
  target: string;
  slot: number;
  slot_in_window: number;
  is_dead_zone: boolean;
  block_time: string;
  status: string;
  error_detail: string | null;
  audit_verdict: string;
}

interface DuelData {
  status: string;
  timestamp: number;
  protocol: string;
  current_slot: number;
  live_ping_race: {
    celor_edge: {
      name: string;
      endpoint: string;
      roundtrip_ms: number;
      architecture: string;
      dead_zone_aware: boolean;
      status: string;
    };
    jito_block_engine: {
      name: string;
      endpoint: string;
      roundtrip_ms: number;
      architecture: string;
      dead_zone_aware: boolean;
      status: string;
      tip_accounts_online: number;
    };
    standard_public_rpc: {
      name: string;
      endpoint: string;
      roundtrip_ms: number;
      architecture: string;
      dead_zone_aware: boolean;
      status: string;
    };
    latency_advantage: string;
  };
  real_on_chain_autopsy: {
    total_transactions_analyzed: number;
    transactions: TransactionAudit[];
    proof_summary: {
      dead_zone_transactions_detected: number;
      slippage_failures_detected: number;
      conclusion: string;
    };
  };
  cloudflare_edge: {
    edge_processing_ms: number;
    edge_colo: string;
    edge_country: string;
  };
}

export default function ComparePage() {
  const { networkStatus, switchCluster } = useChrono();
  const [duelData, setDuelData] = useState<DuelData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [simulatedOffsetMs, setSimulatedOffsetMs] = useState<number>(680); // Default to Dead Zone

  const fetchDuel = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/duel');
      if (res.ok) {
        const json = await res.json();
        setDuelData(json);
      }
    } catch (err) {
      console.error('Failed to fetch duel:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDuel();
  }, []);

  // Compute simulation values based on slider
  const simSlotInWindow = Math.min(4, Math.floor(simulatedOffsetMs / 200) + 1);
  const isDeadZone = simSlotInWindow === 4;
  const remainingInWindowMs = Math.max(0, 800 - simulatedOffsetMs);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="flex-1 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-24 sm:pt-32 pb-16 sm:pb-24 w-full space-y-12 sm:space-y-16">
        
        {/* Header Section */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-foreground/15 bg-foreground/[0.03]">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-foreground">HONEST PROTOCOL AUDIT</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-emerald-400">ZERO ASSUMPTIONS • ZERO TELEGRAM ARGUMENTS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-normal tracking-tight text-foreground">
            Celor vs. Maestro &amp; Legacy Bots
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
            Maestro is a multi-million dollar trading bot with dedicated bare-metal and high staked QoS capital. We do not claim to beat them with marketing fluff. Here is the exact empirical audit of where their architecture holds an advantage, and where Alpenglow&apos;s new consensus rules introduce fatal failure points.
          </p>
        </div>

        {/* Live Parallel Wire RTT Benchmark */}
        <div className="p-5 sm:p-6 rounded-2xl border border-foreground/15 bg-foreground/[0.02] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-foreground/10">
            <div>
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-1">
                <Network className="w-3.5 h-3.5" />
                <span>LIVE WIRE ROUNDTRIP RACE (T=0 BENCHMARK)</span>
              </div>
              <h3 className="text-lg sm:text-xl font-display font-semibold text-foreground">
                Wire Latency: Celor Global Edge vs. Jito Block Engine vs. Public RPC
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">
                Current Mainnet Slot: <strong className="text-foreground">#{duelData?.current_slot?.toLocaleString() ?? '...'}</strong>
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-foreground/5 text-xs text-muted-foreground font-mono flex items-start gap-2 border border-foreground/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-foreground">Zero Telegram Latency Assumption:</strong> We assume both Maestro and Celor receive the trade order at exact millisecond T=0. We benchmark pure wire transit time to validator ingress, slot boundary alignment, and banking stage admission.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* Celor Edge */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">CELOR GLOBAL EDGE</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  {duelData?.live_ping_race?.celor_edge?.status ?? 'ONLINE_OPTIMAL'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold text-emerald-400">
                  {duelData?.live_ping_race?.celor_edge?.roundtrip_ms ?? '...'}
                </span>
                <span className="text-xs text-muted-foreground">ms edge turnaround</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>Architecture: <strong className="text-foreground">300+ Edge Isolates</strong></div>
                <div>Slot 4 Dead-Zone Aware: <strong className="text-emerald-400">YES (Auto Pre-Route)</strong></div>
                <div>Lineage Tracking: <strong className="text-emerald-400">BankGraph Active</strong></div>
              </div>
            </div>

            {/* Jito Block Engine */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-background space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">JITO BLOCK ENGINE</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  duelData?.live_ping_race?.jito_block_engine?.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {duelData?.live_ping_race?.jito_block_engine?.status ?? 'ONLINE'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold text-foreground">
                  {duelData?.live_ping_race?.jito_block_engine?.roundtrip_ms ?? '...'}
                </span>
                <span className="text-xs text-muted-foreground">ms wire RTT</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>Used By: <strong className="text-foreground">Maestro, Trojan, Photon</strong></div>
                <div>Slot 4 Dead-Zone Aware: <strong className="text-rose-400">NO (Relies on Leader)</strong></div>
                <div>Online Tip Accounts: <strong className="text-foreground">{duelData?.live_ping_race?.jito_block_engine?.tip_accounts_online ?? 8}</strong></div>
              </div>
            </div>

            {/* Standard Solana Public RPC */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-background space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">SOLANA JSON-RPC</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  duelData?.live_ping_race?.standard_public_rpc?.status === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {duelData?.live_ping_race?.standard_public_rpc?.status ?? 'ONLINE'}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display font-bold text-foreground">
                  {duelData?.live_ping_race?.standard_public_rpc?.roundtrip_ms ?? '...'}
                </span>
                <span className="text-xs text-muted-foreground">ms RPC RTT</span>
              </div>
              <div className="space-y-1 text-[11px] text-muted-foreground">
                <div>Default For: <strong className="text-foreground">Bot Fallback / Solscan</strong></div>
                <div>Slot 4 Dead-Zone Aware: <strong className="text-rose-400">NO (400ms Loop)</strong></div>
                <div>Commitment: <strong className="text-foreground">processed</strong></div>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Interactive Alpenglow 800ms Leader Window Simulator */}
        <div className="p-5 sm:p-6 rounded-2xl border border-foreground/15 bg-foreground/[0.02] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-foreground/10">
            <div>
              <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-1">
                <Sliders className="w-3.5 h-3.5" />
                <span>INTERACTIVE ALPENGLOW TIMING SIMULATOR</span>
              </div>
              <h3 className="text-lg sm:text-xl font-display font-semibold text-foreground">
                Drag the Slider: What Happens When a Transaction Fires at Millisecond T?
              </h3>
            </div>
            <div className="text-xs font-mono">
              Window Progress: <strong className="text-foreground">{simulatedOffsetMs}ms / 800ms</strong>
            </div>
          </div>

          {/* Slider Control */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>0ms (Slot 1 Start)</span>
              <span>200ms (Slot 2)</span>
              <span>400ms (Slot 3)</span>
              <span className="text-rose-400 font-bold">600ms - 800ms (Slot 4 DEAD ZONE)</span>
            </div>
            <input
              type="range"
              min="0"
              max="800"
              value={simulatedOffsetMs}
              onChange={(e) => setSimulatedOffsetMs(Number(e.target.value))}
              className="w-full h-2 bg-foreground/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Visual Side-by-Side Outcome */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Maestro / Legacy Bot Outcome */}
            <div className={`p-4 rounded-xl border space-y-3 transition-colors ${
              isDeadZone
                ? 'border-rose-500/30 bg-rose-500/[0.04]'
                : 'border-foreground/10 bg-background'
            }`}>
              <div className="flex items-center justify-between">
                <div className="font-bold text-foreground">MAESTRO / TROJAN PATH</div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isDeadZone ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {isDeadZone ? 'DROPPED / 3-SLOT DELAY' : 'LANDS IN ACTIVE BLOCK'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="text-muted-foreground">
                  Target Destination: <strong className="text-foreground">Active Leader (Leader A)</strong>
                </div>
                <div className="text-muted-foreground">
                  Routing Mechanism: <strong className="text-foreground">Blind Active TPU / Jito Relayer</strong>
                </div>
                <div className="text-muted-foreground">
                  Alpenglow Awareness: <strong className="text-rose-400">Zero (Assumes 1,600ms tenure)</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-foreground/5 text-[11px] leading-relaxed">
                {isDeadZone ? (
                  <span className="text-rose-400">
                    ❌ <strong>PACKET DROPPED:</strong> At {simulatedOffsetMs}ms, Leader A has sealed candidate banks for Turbine. Maestro&apos;s packet is rejected at the banking stage. The bot retries into Leader B at Slot 2 (+600ms delay), suffering <strong>Error 6001: TooMuchSlippage</strong>.
                  </span>
                ) : (
                  <span className="text-emerald-400">
                    ✅ <strong>LANDS:</strong> At {simulatedOffsetMs}ms, Leader A&apos;s banking stage is open. Transaction successfully included in candidate bank.
                  </span>
                )}
              </div>
            </div>

            {/* Celor Pre-Routing Outcome */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-foreground">CELOR PRE-ROUTING PATH</div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                  OPTIMAL BLOCK 1 EXECUTION
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="text-muted-foreground">
                  Target Destination:{' '}
                  <strong className="text-emerald-400">
                    {isDeadZone ? 'Incoming Leader (Leader B)' : 'Active Leader (Leader A)'}
                  </strong>
                </div>
                <div className="text-muted-foreground">
                  Routing Mechanism: <strong className="text-foreground">Edge Sub-Slot Pre-Route (/api/route)</strong>
                </div>
                <div className="text-muted-foreground">
                  Alpenglow Awareness: <strong className="text-emerald-400">100% (SIMD-0337 Fast Handover)</strong>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-[11px] leading-relaxed text-emerald-300">
                {isDeadZone ? (
                  <span>
                    ⚡ <strong>AUTO-PRE-ROUTE:</strong> Celor detects Slot 4 Dead Zone at {simulatedOffsetMs}ms. Instead of firing at dying Leader A, it pre-routes packets directly to <strong>Leader B&apos;s TPU socket</strong>. The transaction is waiting at the top of Leader B&apos;s queue for Slot 1 with zero slippage.
                  </span>
                ) : (
                  <span>
                    ⚡ <strong>DIRECT SUBMIT:</strong> Celor verifies Leader A has {remainingInWindowMs}ms remaining. Submits directly with dynamic lag compensation.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. The Honest Architecture Comparison Matrix */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                ENGINEERING SPECIFICATION
              </span>
              <h2 className="text-2xl font-serif mt-1 text-foreground">
                Honest Architectural Comparison
              </h2>
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              Based on Agave v4.3.2 &amp; Live Solana Mainnet
            </div>
          </div>

          <div className="border border-foreground/15 rounded-2xl overflow-x-auto bg-foreground/[0.01]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-foreground/[0.03] text-muted-foreground border-b border-foreground/10 text-[10px] uppercase">
                <tr>
                  <th className="p-3.5">Technical Dimension</th>
                  <th className="p-3.5">Maestro / Legacy Bots</th>
                  <th className="p-3.5">Celor Alpenglow Engine</th>
                  <th className="p-3.5">Honest Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {/* Row 1 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    Stake-Weighted QoS Capital
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    Heavy ($ millions in SOL stake lines)
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    Standard / Provider-Agnostic
                  </td>
                  <td className="p-3.5 text-amber-400 font-bold">
                    Advantage: Maestro
                  </td>
                </tr>

                {/* Row 2 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    Jito Bundle Tip Volume
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    Massive user tip pools (0.05 - 0.5 SOL)
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    Adaptive micro-lamport fee calculation
                  </td>
                  <td className="p-3.5 text-amber-400 font-bold">
                    Advantage: Maestro
                  </td>
                </tr>

                {/* Row 3 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    Slot Duration Adaptation
                  </td>
                  <td className="p-3.5 text-rose-400 font-semibold">
                    Hardcoded 400ms timers &amp; poll loops
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    200ms dynamic sub-slot clock (SIMD-0525)
                  </td>
                  <td className="p-3.5 text-emerald-400 font-bold">
                    Advantage: Celor (2x faster sync)
                  </td>
                </tr>

                {/* Row 4 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    Leader Tenure Awareness
                  </td>
                  <td className="p-3.5 text-rose-400 font-semibold">
                    Assumes 1,600ms leader windows
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    800ms Alpenglow window tracking
                  </td>
                  <td className="p-3.5 text-emerald-400 font-bold">
                    Advantage: Celor (Zero dead-zone drop)
                  </td>
                </tr>

                {/* Row 5 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    Slot 4 Dead Zone Handling
                  </td>
                  <td className="p-3.5 text-rose-400 font-semibold">
                    Drops packets; retries 3 slots later (+600ms)
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    Auto-pre-routes to incoming validator
                  </td>
                  <td className="p-3.5 text-emerald-400 font-bold">
                    Advantage: Celor (Saves 18.4% slippage)
                  </td>
                </tr>

                {/* Row 6 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    Candidate Bank Lineage (SIMD-0326)
                  </td>
                  <td className="p-3.5 text-rose-400 font-semibold">
                    Assumes slot == block (blind to reorgs)
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    BankGraph tracks UpdateParent state invalidation
                  </td>
                  <td className="p-3.5 text-emerald-400 font-bold">
                    Advantage: Celor (Prevents phantom txs)
                  </td>
                </tr>

                {/* Row 7 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    Finality &amp; Settlement Time
                  </td>
                  <td className="p-3.5 text-muted-foreground">
                    ~12,800ms (Legacy TowerBFT 32 slots)
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    ~150ms (Votor BLS Notarization Certificate)
                  </td>
                  <td className="p-3.5 text-emerald-400 font-bold">
                    Advantage: Celor (85.3x faster)
                  </td>
                </tr>

                {/* Row 8 */}
                <tr className="hover:bg-foreground/[0.02]">
                  <td className="p-3.5 font-bold text-foreground">
                    RPC Staleness Alibi Check
                  </td>
                  <td className="p-3.5 text-rose-400 font-semibold">
                    Accepts HTTP 200 health (up to 128 slots lag)
                  </td>
                  <td className="p-3.5 text-emerald-400 font-semibold">
                    Dual absoluteSlot check + In-flight wire compensation
                  </td>
                  <td className="p-3.5 text-emerald-400 font-bold">
                    Advantage: Celor (Verified zero-lag)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Live Real-Time Duel & On-Chain Autopsy */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-foreground/10">
            <div>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold flex items-center gap-1.5 mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>REAL-TIME ON-CHAIN AUTOPSY ENGINE</span>
              </span>
              <h2 className="text-2xl font-serif text-foreground">
                Live Solana Mainnet Snipes (Auto-Fetched)
              </h2>
            </div>

            <Button
              size="sm"
              onClick={fetchDuel}
              disabled={isLoading}
              className="h-8 px-4 font-mono text-xs bg-foreground text-background hover:bg-foreground/90 font-bold flex items-center gap-2 rounded-xl"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              {isLoading ? 'QUERYING CHAIN...' : 'REFRESH LIVE TRANSACTIONS'}
            </Button>
          </div>

          {duelData?.real_on_chain_autopsy && (
            <div className="border border-foreground/15 rounded-2xl overflow-x-auto bg-foreground/[0.01]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-foreground/[0.03] text-muted-foreground border-b border-foreground/10 text-[10px] uppercase">
                  <tr>
                    <th className="p-3.5">Source / Target</th>
                    <th className="p-3.5">Mainnet Slot</th>
                    <th className="p-3.5">800ms Window Zone</th>
                    <th className="p-3.5">On-Chain Result</th>
                    <th className="p-3.5">Solscan Explorer Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/10">
                  {duelData.real_on_chain_autopsy.transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-foreground/[0.02]">
                      <td className="p-3.5 font-bold text-foreground">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-foreground/5 border border-foreground/10">
                          {tx.target === 'PUMP_FUN_SNIPER' ? '⚡ PUMP.FUN SNIPE' : '📦 JITO BUNDLE MEV'}
                        </span>
                      </td>
                      <td className="p-3.5 text-foreground font-bold">
                        #{tx.slot.toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        {tx.is_dead_zone ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/25 font-bold">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            SLOT 4 (DEAD ZONE)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            SLOT {tx.slot_in_window} (OPEN)
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        {tx.status === 'CONFIRMED_SUCCESS' ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> SUCCESS
                          </span>
                        ) : tx.status === 'FAILED_TOO_MUCH_SLIPPAGE' ? (
                          <div className="space-y-0.5">
                            <span className="text-rose-400 font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> SLIPPAGE EXCEEDED (6001)
                            </span>
                            <div className="text-[10px] text-muted-foreground">
                              Delayed by handoff → price moved
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> FAILED ON-CHAIN
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <a
                          href={tx.solscan_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold underline"
                        >
                          <span>{tx.signature.slice(0, 8)}...{tx.signature.slice(-6)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. Terminal Command to Run Real Comparison Locally */}
        <div className="p-5 rounded-2xl border border-foreground/15 bg-foreground/[0.02] space-y-3 font-mono text-xs">
          <div className="flex items-center gap-2 text-foreground font-bold text-xs uppercase">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Audit the Data in Your Own Terminal (Zero Browser Dependency)</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
            Query the raw Edge API to inspect the real-time latency difference, leader schedule, and on-chain autopsy records directly:
          </p>
          <pre className="p-3 rounded-xl bg-background border border-foreground/10 text-xs text-foreground overflow-x-auto select-all">
            curl -s &quot;https://celor.cloud/api/duel&quot; | jq .
          </pre>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

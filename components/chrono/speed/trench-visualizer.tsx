'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Flame, 
  Layers, 
  Activity,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface Scenario {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  legacyOutcome: {
    title: string;
    description: string;
    status: 'LOST' | 'MISSED' | 'DELAYED';
    statusText: string;
    time: string;
    details: string[];
  };
  celorOutcome: {
    title: string;
    description: string;
    status: 'WON' | 'SAVED' | 'PROTECTED';
    statusText: string;
    time: string;
    details: string[];
  };
}

const SCENARIOS: Scenario[] = [
  {
    id: 'snipe',
    title: 'Pump.fun / Raydium Launch Snipe',
    subtitle: 'High-frequency entry into new liquidity pool',
    badge: 'TRENCH SNIPER',
    legacyOutcome: {
      title: 'Legacy 400ms: Blind Submission',
      description: 'Submitted at t=280ms into a 400ms slot without sub-slot remaining budget awareness.',
      status: 'MISSED',
      statusText: 'OUTRUN BY 14 TXs',
      time: '+1,420ms',
      details: [
        'Arrived after leader began local block sealing.',
        'Pushed into next slot; bought 80% higher in price.',
        'Commercial RPC gave no early warning of leader handoff.',
      ],
    },
    celorOutcome: {
      title: 'Celor 200ms: Dynamic Clock & Route Handoff',
      description: 'Celor detected only 40ms remaining in current slot; pre-warmed QUIC route to incoming leader.',
      status: 'WON',
      statusText: 'LANDED SLOT 0 BLOCK 1',
      time: '18ms execution',
      details: [
        'Targeted exact active leader tenure (~800ms 4-slot window).',
        'Pre-authenticated UDP/QUIC socket opened in advance.',
        'Sub-150ms BLS certificate confirmed instant finality.',
      ],
    },
  },
  {
    id: 'reorg',
    title: 'SIMD-0337 Parent Switch & Invalidation',
    subtitle: 'Incoming leader drops candidate bank branch',
    badge: 'CONSENSUS ROLLBACK',
    legacyOutcome: {
      title: 'Legacy: Silent Ghost Drop',
      description: 'Transaction was placed in Candidate Bank A. Next leader emitted UpdateParent marker, abandoning Bank A.',
      status: 'LOST',
      statusText: 'PHANTOM LOSS (-5 SOL)',
      time: 'Phantom drop',
      details: [
        'UI falsely reported transaction as confirmed.',
        'Branch abandoned on canonical fork; funds were never swapped.',
        'Bot continued trading on invalid state for 32 slots.',
      ],
    },
    celorOutcome: {
      title: 'Celor: Instant Invalidation & Re-route',
      description: '0.67µs detection of UpdateParent marker immediately purges abandoned candidate state.',
      status: 'PROTECTED',
      statusText: 'SAVED & RE-SIGNED (+0 SOL LOSS)',
      time: '0.67 µs alert',
      details: [
        'Instant Dark-Mode Abandoned TX Alert fired to client.',
        'Transaction automatically re-signed with fresh valid blockhash.',
        'Landed on the winning canonical fork without capital loss.',
      ],
    },
  },
  {
    id: 'lag',
    title: 'Commercial RPC WebSocket Lag vs Geyser',
    subtitle: 'Stream freshness and tip-of-the-fork visibility',
    badge: 'STREAM LATENCY',
    legacyOutcome: {
      title: 'Legacy: 1,200ms Buffered JSON',
      description: 'Public and commercial RPC WebSockets buffer blocks and deliver state with 900–1,400ms delay.',
      status: 'DELAYED',
      statusText: '6 SLOTS BEHIND TIP',
      time: '1,200ms lag',
      details: [
        'In a 200ms world, 1.2s lag means you are living 6 slots in the past.',
        'Decisions made on stale orderbooks and obsolete blockhashes.',
        'High rate of BlockhashNotFound errors.',
      ],
    },
    celorOutcome: {
      title: 'Celor: Sub-Millisecond Stream Normalization',
      description: 'Zero-allocation memory-mapped stream processing with direct Unix Domain Socket validator telemetry.',
      status: 'SAVED',
      statusText: '0 SLOTS LAG (REAL TIP)',
      time: '< 1ms lag',
      details: [
        'Pre-execution deshred packets ingested before block sealing.',
        'Full 10-dimension Alpenglow coverage matrix.',
        'Real-time monotonic drift tracking avoids stale blockhashes.',
      ],
    },
  },
];

export function TrenchVisualizer() {
  const [activeScenarioId, setActiveScenarioId] = useState('snipe');

  const current = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  return (
    <div className="py-12 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 font-mono text-xs uppercase tracking-wider mb-4">
          <Activity className="w-3.5 h-3.5" />
          <span>Real-World Trench Breakdown</span>
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold tracking-tight text-foreground">
          Why 200ms &amp; Alpenglow Changes Everything for Traders
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mt-3">
          On the old Solana, you could afford a 400ms margin of error. Under SIMD-0525 and Alpenglow, timing is brutal. Here is how Celor protects your capital.
        </p>

        {/* Tab Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mt-8">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveScenarioId(s.id)}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-mono font-medium transition-all cursor-pointer ${
                activeScenarioId === s.id
                  ? 'bg-foreground text-background shadow-lg scale-105'
                  : 'bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground border border-foreground/10'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
        {/* Legacy Column (The Old Dangerous Way) */}
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.02] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <AlertTriangle className="w-32 h-32 text-rose-500" />
          </div>

          <div>
            <div className="flex items-center justify-between pb-4 border-b border-rose-500/10 mb-6">
              <span className="text-xs font-mono text-rose-400 font-semibold uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Legacy 400ms &amp; TowerBFT
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border border-rose-500/30 text-rose-400 bg-rose-500/10 font-bold">
                {current.legacyOutcome.statusText}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-sans font-bold text-foreground mb-2">
              {current.legacyOutcome.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {current.legacyOutcome.description}
            </p>

            <div className="space-y-3 font-mono text-xs">
              {current.legacyOutcome.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-zinc-400">
                  <span className="text-rose-500 font-bold">✕</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-rose-500/10 flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>Effective Lag:</span>
            <span className="text-rose-400 font-bold text-sm">{current.legacyOutcome.time}</span>
          </div>
        </div>

        {/* Celor Column (The Modern Winning Way) */}
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.04] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-emerald-500/5">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <ShieldCheck className="w-32 h-32 text-emerald-500" />
          </div>

          <div>
            <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-6">
              <span className="text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Celor Alpenglow Engine
              </span>
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-300 bg-emerald-500/20 font-bold">
                {current.celorOutcome.statusText}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-sans font-bold text-foreground mb-2">
              {current.celorOutcome.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {current.celorOutcome.description}
            </p>

            <div className="space-y-3 font-mono text-xs">
              {current.celorOutcome.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-zinc-300">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-emerald-500/20 flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>Celor Pipeline:</span>
            <span className="text-emerald-400 font-bold text-sm">{current.celorOutcome.time}</span>
          </div>
        </div>
      </div>

      {/* Quick Action Footer */}
      <div className="text-center mt-10">
        <Button asChild className="bg-foreground hover:bg-foreground/90 text-background rounded-full px-6 py-2.5 font-sans font-medium text-xs sm:text-sm">
          <Link href="/sniper">
            Test the Live Trench Sniper Race →
          </Link>
        </Button>
      </div>
    </div>
  );
}

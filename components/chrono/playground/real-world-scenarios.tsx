'use client';

import React, { useState } from 'react';
import {
  Coins,
  Zap,
  Ghost,
  BarChart3,
  Landmark,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export function RealWorldScenarios() {
  const [activeScenario, setActiveScenario] = useState<string>('new_token');

  const scenarios = [
    {
      id: 'new_token',
      title: 'New Token Pool Launch',
      icon: Coins,
      summary: 'A new AMM liquidity pool appears on-chain.',
      pipeline: ['Pool Creation Shred', 'Slot Boundary', 'Leader QUIC Route', 'Candidate Bank B', 'Decision: FIRE'],
      explanation: 'Celor discovers the new pool pre-execution via validator shred telemetry, allowing your execution engine to submit before public RPC indexes the transaction.',
    },
    {
      id: 'leader_handoff',
      title: 'Leader Handoff Boundary',
      icon: Zap,
      summary: 'Your buy transaction arrives 15ms before slot ends.',
      pipeline: ['Submit Request', 'Tenure Check (<40ms)', 'Wait 12ms', 'Next Leader Active', 'Decision: SEND'],
      explanation: 'Rather than blasting the dying leader and losing the trade to a dropped packet, Celor holds 12ms and streams directly to the incoming leader’s prewarmed TPU.',
    },
    {
      id: 'ghost_block',
      title: 'Ghost Block Reorg',
      icon: Ghost,
      summary: 'An observed candidate bank is abandoned by the cluster.',
      pipeline: ['Candidate Observed', 'UpdateParent Received', 'Dead Branch Pruned', 'Decision: CANCEL', 'Capital Protected'],
      explanation: 'Other bots execute against the candidate bank assuming 1 slot = 1 block. When the leader switches parent, their orders fail. Celor aborts instantly upon receiving SIMD-0337.',
    },
    {
      id: 'trading_terminal',
      title: 'Institutional Terminal',
      icon: BarChart3,
      summary: 'A trading desk needs to know true cluster state.',
      pipeline: ['Slot Height', 'Leader Schedule', 'Canonical Bank', 'BLS Certificate', 'State Finalized (~150ms)'],
      explanation: 'Standard terminals wait ~12.8s for 32 TowerBFT confirmations. Alpenglow enables institutional settlement and balance updates in sub-second timeframes.',
    },
    {
      id: 'settlement',
      title: 'DvP Atomic Settlement',
      icon: Landmark,
      summary: 'Token asset and payment settle simultaneously.',
      pipeline: ['Asset Transfer', 'Payment Leg', 'Candidate Notarized', '84.6% Stake BLS Cert', 'Irreversible Settlement'],
      explanation: 'Atomic delivery-versus-payment requires cryptographic certainty. Alpenglow’s fast-path BLS certificate guarantees that transactions will never be unwound.',
    },
  ];

  const current = scenarios.find((s) => s.id === activeScenario) || scenarios[0];

  return (
    <section className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/40 text-sky-700 dark:text-sky-300 text-xs font-mono font-semibold mb-3">
            <Coins className="w-3 h-3" />
            <span>REAL-WORLD SCENARIOS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Try A Real-World Scenario
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            See how the new consensus engine alters everyday trading, settlement, and validator interactions.
          </p>
        </div>

        {/* Tab Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {scenarios.map((s) => {
            const Icon = s.icon;
            const isSelected = activeScenario === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveScenario(s.id)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-1 ring-sky-500/30'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 mb-2 ${isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</div>
                  <div className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    {s.summary}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Scenario Details Panel */}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 md:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {current.title} Workflow
            </h3>
            <span className="text-xs font-mono text-slate-400">Step-by-Step Architecture Pipeline</span>
          </div>

          {/* Workflow Sequence */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {current.pipeline.map((step, idx) => (
              <React.Fragment key={step}>
                <div className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-xs font-mono font-medium text-slate-800 dark:text-zinc-200 shadow-xs">
                  {step}
                </div>
                {idx < current.pipeline.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Detailed explanation */}
          <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed">
            <strong>Consensus Invariant: </strong> {current.explanation}
          </div>
        </div>
      </div>
    </section>
  );
}

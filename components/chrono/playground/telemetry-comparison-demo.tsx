'use client';

import React, { useState } from 'react';
import {
  Layers,
  Database,
  Check,
  X,
  HelpCircle,
  Eye,
  ShieldAlert,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { ProvenanceBadge } from '@/components/chrono/provenance-badge';

export function TelemetryComparisonDemo() {
  const [telemetryMode, setTelemetryMode] = useState<'PUBLIC' | 'DEEP'>('PUBLIC');
  const [gameSelection, setGameSelection] = useState<string | null>(null);
  const [gameRevealed, setGameRevealed] = useState<boolean>(false);

  const capabilities = [
    { name: 'Slot Number', rpc: true, deep: true, provRpc: 'DIRECT', provDeep: 'DIRECT' },
    { name: 'Root Finality', rpc: true, deep: true, provRpc: 'DIRECT', provDeep: 'DIRECT' },
    { name: 'Leader Schedule', rpc: true, deep: true, provRpc: 'DERIVED', provDeep: 'DERIVED' },
    { name: 'Candidate Banks', rpc: false, deep: true, provRpc: 'UNAVAILABLE', provDeep: 'DIRECT' },
    { name: 'Bank Hash', rpc: false, deep: true, provRpc: 'UNAVAILABLE', provDeep: 'DIRECT' },
    { name: 'UpdateParent Markers', rpc: false, deep: true, provRpc: 'UNAVAILABLE', provDeep: 'DIRECT' },
    { name: 'BLS12-381 Certificates', rpc: false, deep: true, provRpc: 'UNAVAILABLE', provDeep: 'DIRECT' },
    { name: 'Pre-Execution Deshred', rpc: false, deep: true, provRpc: 'UNAVAILABLE', provDeep: 'DIRECT' },
  ];

  const handleGuess = (choice: string) => {
    setGameSelection(choice);
    setGameRevealed(true);
  };

  const resetGame = () => {
    setGameSelection(null);
    setGameRevealed(false);
  };

  return (
    <section id="reality" className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800/40 text-cyan-700 dark:text-cyan-300 text-xs font-mono font-semibold mb-3">
              <Eye className="w-3 h-3" />
              <span>SOURCE TRUTH & PROVENANCE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Public RPC vs Deep Validator Telemetry
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Standard JSON-RPC only shows you history after blocks are sealed. Celor hooks into deep validator telemetry to observe candidate banks before execution.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 self-start md:self-auto">
            <button
              onClick={() => setTelemetryMode('PUBLIC')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                telemetryMode === 'PUBLIC'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              PUBLIC RPC
            </button>
            <button
              onClick={() => setTelemetryMode('DEEP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                telemetryMode === 'DEEP'
                  ? 'bg-sky-600 text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              DEEP TELEMETRY
            </button>
          </div>
        </div>

        {/* Capability Matrix & Deshred Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Column 1 & 2: Interactive Capability Comparison Table */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
                Feature Coverage Audit ({telemetryMode === 'PUBLIC' ? 'Public JSON-RPC' : 'Deep Validator Geyser'})
              </span>
              <span className="text-xs font-mono text-slate-500">
                Score: {telemetryMode === 'PUBLIC' ? '27 / 100' : '98 / 100'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-mono">
                    <th className="pb-2.5 font-medium">Consensus Metric</th>
                    <th className="pb-2.5 font-medium text-center">Standard RPC</th>
                    <th className="pb-2.5 font-medium text-center">Celor Geyser</th>
                    <th className="pb-2.5 font-medium text-right">Data Provenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono">
                  {capabilities.map((item) => {
                    const isAvailable = telemetryMode === 'PUBLIC' ? item.rpc : item.deep;
                    const prov = (telemetryMode === 'PUBLIC' ? item.provRpc : item.provDeep) as
                      | 'DIRECT'
                      | 'DERIVED'
                      | 'UNAVAILABLE';

                    return (
                      <tr key={item.name} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                        <td className="py-2.5 font-sans font-medium text-slate-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="py-2.5 text-center">
                          {item.rpc ? (
                            <Check className="w-4 h-4 text-emerald-500 inline-block" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 dark:text-zinc-600 inline-block" />
                          )}
                        </td>
                        <td className="py-2.5 text-center">
                          {item.deep ? (
                            <Check className="w-4 h-4 text-emerald-500 inline-block" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 dark:text-zinc-600 inline-block" />
                          )}
                        </td>
                        <td className="py-2.5 text-right">
                          <ProvenanceBadge provenance={prov} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Celor Invariant: Never simulate or fabricate missing RPC fields.</span>
              <span className="font-mono text-slate-400">Phase 9 Specification</span>
            </div>
          </div>

          {/* Column 3: Pre-Execution Deshred Pipeline */}
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-mono font-bold uppercase mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pre-Execution Telemetry</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                See It Before Execution
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
                Turbine broadcasts packet shreds across the cluster. Celor reconstructs transactions from validator deshred hooks before ordinary RPC block announcements exist.
              </p>

              {/* Step Pipeline */}
              <div className="mt-4 space-y-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
                  <span>1. Shred Ingestion</span>
                  <span className="text-slate-400">15ms</span>
                </div>
                <div className="p-2.5 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 flex items-center justify-between font-bold">
                  <span>2. Pre-Execution Deshred</span>
                  <span className="text-sky-600">32ms (Celor)</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-400 flex items-center justify-between">
                  <span>3. RPC Block Event</span>
                  <span className="text-slate-400">200ms+ (RPC Gossip)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-zinc-800/80 text-[11px] text-slate-500">
              Observed before state commit. Enables algorithmic routing with zero blind spots.
            </div>
          </div>
        </div>

        {/* Source Truth Game: "IS THIS REAL?" */}
        <div className="rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/40 via-sky-50/20 to-transparent dark:from-indigo-950/20 dark:via-sky-950/10 p-6 md:p-8">
          <div className="max-w-2xl">
            <span className="text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
              SOURCE TRUTH GAME
            </span>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              Is This Real?
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
              Suppose you are querying a standard Public Solana JSON-RPC endpoint. Can you get the <strong>Bank Hash</strong> of a candidate bank?
            </p>

            {/* Answer Options */}
            {!gameRevealed ? (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {['REAL', 'ESTIMATED', 'UNAVAILABLE'].map((choice) => (
                  <button
                    key={choice}
                    onClick={() => handleGuess(choice)}
                    className="px-4 py-2 rounded-xl text-xs font-mono font-semibold border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-indigo-400 transition-all cursor-pointer"
                  >
                    {choice}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="p-3.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-xs text-sky-900 dark:text-sky-200 leading-relaxed">
                  <strong>Answer: UNAVAILABLE.</strong> You guessed{' '}
                  <span className="font-mono font-bold">{gameSelection}</span>.{' '}
                  Standard public RPC does not expose validator-internal bank hashes or candidate forks. Celor refuses to synthesize or fabricate placeholder data.
                </div>
                <button
                  onClick={resetGame}
                  className="text-xs font-mono text-indigo-600 dark:text-indigo-400 underline cursor-pointer"
                >
                  Play again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

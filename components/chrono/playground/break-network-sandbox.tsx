'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  ZapOff,
  GitBranch,
  RefreshCw,
  Clock,
  Split,
  EyeOff,
} from 'lucide-react';
import { breakNetworkAction, type BreakNetworkResponse } from '@/lib/chrono-client/playground';

export function BreakNetworkSandbox() {
  const [activePerturbation, setActivePerturbation] = useState<string>('kill_leader');
  const [response, setResponse] = useState<BreakNetworkResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const perturbations = [
    { id: 'kill_leader', label: 'KILL LEADER', icon: ZapOff, color: 'hover:border-amber-400' },
    { id: 'abandon_bank', label: 'ABANDON BANK', icon: GitBranch, color: 'hover:border-rose-400' },
    { id: 'change_parent', label: 'CHANGE PARENT', icon: RefreshCw, color: 'hover:border-indigo-400' },
    { id: 'stale_data', label: 'STALE DATA', icon: Clock, color: 'hover:border-yellow-400' },
    { id: 'provider_conflict', label: 'PROVIDER CONFLICT', icon: Split, color: 'hover:border-purple-400' },
    { id: 'remove_telemetry', label: 'REMOVE TELEMETRY', icon: EyeOff, color: 'hover:border-slate-400' },
  ];

  const handleTriggerPerturbation = async (id: string) => {
    setActivePerturbation(id);
    setLoading(true);
    try {
      const res = await breakNetworkAction(id);
      setResponse(res);
    } catch {
      // Handled cleanly
    } finally {
      setLoading(false);
    }
  };

  // Run initial perturbation on mount if not yet evaluated
  React.useEffect(() => {
    handleTriggerPerturbation('kill_leader');
  }, []);

  return (
    <section className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-mono font-semibold mb-3">
              <Flame className="w-3 h-3 text-rose-500" />
              <span>CONSENSUS CHAOS TESTING</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Break The Network
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Inject intentional failure modes into the simulator. Watch how Celor’s consensus engine protects capital and prevents blind execution.
            </p>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-8">
          {perturbations.map((item) => {
            const Icon = item.icon;
            const isSelected = activePerturbation === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTriggerPerturbation(item.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 shadow-md'
                    : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 text-slate-700 dark:text-zinc-300 ' +
                      item.color
                }`}
              >
                <Icon className={`w-4 h-4 mb-3 ${isSelected ? 'text-current' : 'text-slate-400'}`} />
                <span className="font-mono text-[11px] font-bold tracking-tight block truncate">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Reactive Simulator Response Card */}
        {response && (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 md:p-8 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase border ${
                    response.action === 'WAIT'
                      ? 'border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : response.action === 'CANCEL'
                      ? 'border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : response.action === 'UNKNOWN'
                      ? 'border-purple-300 bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                      : 'border-zinc-300 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}
                >
                  ACTION: {response.action}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  Perturbation: {response.perturbation}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Capital Protection Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Left Column: Why */}
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    WHY DID CELOR DECIDE THIS?
                  </span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white leading-relaxed">
                    {response.why}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-1">
                    STATE IMPACT
                  </span>
                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {response.state_impact}
                  </p>
                </div>
              </div>

              {/* Right Column: Technical Wiring */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block mb-2">
                  INTERNAL RUST ENGINE DISPATCH
                </span>
                <div className="font-mono text-xs text-sky-600 dark:text-sky-400 font-medium break-all">
                  {response.technical_detail}
                </div>
                <div className="mt-3 text-[11px] text-slate-500 dark:text-zinc-500 leading-normal">
                  Zero blind execution: Celor intercepts edge-case conditions at the physical layer before transactions can be lost or frontrun on abandoned state.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

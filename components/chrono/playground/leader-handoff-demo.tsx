'use client';

import React, { useState } from 'react';
import {
  Clock,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Zap,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

interface LeaderHandoffDemoProps {
  technicalMode: boolean;
}

export function LeaderHandoffDemo({ technicalMode }: LeaderHandoffDemoProps) {
  const [activeLeaderIdx, setActiveLeaderIdx] = useState<number>(0);
  const [subSlotRemainingMs, setSubSlotRemainingMs] = useState<number>(160);
  const [decisionState, setDecisionState] = useState<'FIRE' | 'WAIT' | 'CANCEL' | 'UNKNOWN'>('FIRE');
  const [interactiveOutcome, setInteractiveOutcome] = useState<string | null>(null);

  const leaders = [
    { name: 'Validator A (dv4AC...RBVJB)', stake: '2.4%', latency: '8ms' },
    { name: 'Validator B (7xKXt...Q1L)', stake: '1.9%', latency: '12ms' },
    { name: 'Validator C (3kLmn...90P)', stake: '3.1%', latency: '9ms' },
  ];

  const handleNextLeader = () => {
    setActiveLeaderIdx((prev) => (prev + 1) % leaders.length);
    setSubSlotRemainingMs(185);
    setDecisionState('FIRE');
    setInteractiveOutcome(null);
  };

  const handleTestLateFire = () => {
    setSubSlotRemainingMs(18);
    setDecisionState('WAIT');
    setInteractiveOutcome('LATE_FIRED');
  };

  const handleTestFreshFire = () => {
    setSubSlotRemainingMs(160);
    setDecisionState('FIRE');
    setInteractiveOutcome('FRESH_FIRED');
  };

  return (
    <section id="leader" className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold mb-3">
              <Clock className="w-3 h-3" />
              <span>SUB-SLOT EXECUTION TIMING</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Leader Handoff: Why Sub-Slot Timing Matters
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              One validator's turn ends. Another takes over. If you fire a transaction with only 18ms left in a slot, the old leader drops it. Celor calculates the handoff boundary in microseconds.
            </p>
          </div>

          <button
            onClick={handleNextLeader}
            className="self-start md:self-auto px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>NEXT LEADER</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Main Handoff Visualizer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 & 2: Handoff Animation & Interactive Buttons */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 md:p-8 shadow-xs">
            {/* Active Leader vs Next Leader Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Current Leader */}
              <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/50 dark:bg-sky-950/20 p-4">
                <span className="text-[10px] font-mono uppercase text-sky-600 dark:text-sky-400 font-semibold tracking-wider">
                  CURRENT LEADER
                </span>
                <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white truncate">
                  {leaders[activeLeaderIdx].name}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Stake: {leaders[activeLeaderIdx].stake}</span>
                  <span>QUIC Ping: {leaders[activeLeaderIdx].latency}</span>
                </div>
              </div>

              {/* Next Leader */}
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 p-4">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider">
                  NEXT LEADER (IMMINENT)
                </span>
                <div className="mt-1 text-sm font-bold text-slate-700 dark:text-zinc-300 truncate">
                  {leaders[(activeLeaderIdx + 1) % leaders.length].name}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>Stake: {leaders[(activeLeaderIdx + 1) % leaders.length].stake}</span>
                  <span>Prewarmed TPU</span>
                </div>
              </div>
            </div>

            {/* Sub-Slot Budget Progress Bar */}
            <div className="mb-6 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/80 bg-slate-50/30 dark:bg-zinc-900/20">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-slate-500">Sub-Slot Budget:</span>
                <span className={`font-bold ${subSlotRemainingMs < 40 ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {subSlotRemainingMs}ms remaining / 200ms target
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    subSlotRemainingMs < 40 ? 'bg-rose-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${(subSlotRemainingMs / 200) * 100}%` }}
                />
              </div>
            </div>

            {/* Interactive Buy Request Scenario Buttons */}
            <div>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 mb-3 block">
                Simulate Buy Request Timing:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleTestLateFire}
                  className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-100/50 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300 mb-1">
                    <span>1. Fire Too Late</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-normal">
                    18ms remaining → Sent to old leader → Dropped due to expired slot.
                  </p>
                </button>

                <button
                  onClick={handleTestFreshFire}
                  className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 text-left transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                    <span>2. Wait for Handoff</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-normal">
                    Holds 12ms → Prewarms QUIC → Sent to next leader directly.
                  </p>
                </button>
              </div>
            </div>

            {/* Outcome Display */}
            {interactiveOutcome && (
              <div
                className={`mt-6 p-4 rounded-xl border text-xs leading-relaxed ${
                  interactiveOutcome === 'LATE_FIRED'
                    ? 'border-rose-300 dark:border-rose-900 bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
                    : 'border-emerald-300 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {interactiveOutcome === 'LATE_FIRED' ? (
                  <div>
                    <strong>Celor Decision: WAIT.</strong> Unaware bots sent their packet to Old Leader{' '}
                    <em>(missed)</em>. Celor held submission for 12ms and rerouted to the new leader’s TPU, preventing transaction drop.
                  </div>
                ) : (
                  <div>
                    <strong>Celor Decision: FIRE.</strong> Optimal leader tenure verified (320ms budget remaining). Packet dispatched directly via QUIC stream.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Column 3: "Why Did Celor Wait?" Interactive Cards */}
          <div className="space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1">
              "Why Did Celor Choose This?"
            </div>

            {/* WAIT Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                decisionState === 'WAIT'
                  ? 'border-amber-400 bg-amber-50/80 dark:bg-amber-950/30 dark:border-amber-700 ring-2 ring-amber-400/20'
                  : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>ACTION: WAIT</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Leader almost changed.</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Less than 40ms remaining in slot. Holding packet saves gas and guarantees inclusion on next leader.
              </p>
            </div>

            {/* CANCEL Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                decisionState === 'CANCEL'
                  ? 'border-rose-400 bg-rose-50/80 dark:bg-rose-950/30 dark:border-rose-700 ring-2 ring-rose-400/20'
                  : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-xs mb-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>ACTION: CANCEL</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Bank abandoned.</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                UpdateParent observed or fork reorg detected. In-flight order aborted to prevent execution against ghost state.
              </p>
            </div>

            {/* FIRE Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                decisionState === 'FIRE'
                  ? 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 dark:border-emerald-700 ring-2 ring-emerald-400/20'
                  : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>ACTION: FIRE</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Fresh state & leader active.</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Bank valid, latency under threshold, healthy telemetry source verified.
              </p>
            </div>

            {/* UNKNOWN Card */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                decisionState === 'UNKNOWN'
                  ? 'border-purple-400 bg-purple-50/80 dark:bg-purple-950/30 dark:border-purple-700 ring-2 ring-purple-400/20'
                  : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-xs mb-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>ACTION: UNKNOWN</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">Source missing evidence.</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                The connected stream does not supply necessary candidate telemetry. Celor refuses to guess.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useState } from 'react';
import {
  GitFork,
  GitBranch,
  XCircle,
  CheckCircle,
  RefreshCw,
  Info,
  Layers,
  ArrowRight,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { ProvenanceBadge } from '@/components/chrono/provenance-badge';

interface CandidateBanksDemoProps {
  technicalMode: boolean;
}

export function CandidateBanksDemo({ technicalMode }: CandidateBanksDemoProps) {
  const [bankCount, setBankCount] = useState<number>(3);
  const [slotCreated, setSlotCreated] = useState<boolean>(true);
  const [slotNumber] = useState<number>(447809653);
  const [followedBank, setFollowedBank] = useState<string>('bank-B');
  const [abandonedBanks, setAbandonedBanks] = useState<string[]>([]);
  const [canonicalBank, setCanonicalBank] = useState<string | null>(null);
  const [updateParentTriggered, setUpdateParentTriggered] = useState<boolean>(false);
  const [parentSlot, setParentSlot] = useState<number>(499);

  const resetDemo = () => {
    setAbandonedBanks([]);
    setCanonicalBank(null);
    setUpdateParentTriggered(false);
    setParentSlot(499);
    setFollowedBank('bank-B');
  };

  const handleAbandonFollowed = () => {
    if (!abandonedBanks.includes(followedBank)) {
      setAbandonedBanks([...abandonedBanks, followedBank]);
      // Canonical moves to Bank A if B abandoned
      setCanonicalBank('bank-A');
    }
  };

  const handleUpdateParent = () => {
    setUpdateParentTriggered(true);
    setParentSlot(500);
    // SIMD-0337: Invalidates older branch Bank A, establishes Bank B on new parent
    if (!abandonedBanks.includes('bank-A')) {
      setAbandonedBanks([...abandonedBanks, 'bank-A']);
    }
    setCanonicalBank('bank-B');
    setFollowedBank('bank-B');
  };

  const letters = ['A', 'B', 'C', 'D'].slice(0, bankCount);

  return (
    <section id="forks" className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs font-mono font-semibold mb-3">
              <GitFork className="w-3 h-3" />
              <span>ALPENGLOW BANK GRAPH</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              One Slot. Multiple Possible States.
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Under Alpenglow, more than one candidate state can exist around the same slot. A slot is an interval of time, not an immutable monolithic block.
            </p>
          </div>

          {/* Bank Count Controls */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 self-start md:self-auto">
            <span className="text-xs font-mono text-slate-500 dark:text-zinc-400 px-2">Candidates:</span>
            {[2, 3, 4].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setBankCount(count);
                  resetDemo();
                }}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  bankCount === count
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {count} banks
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Workspace Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 md:p-8 shadow-xs">
          {/* Top Slot Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-sky-500 animate-ping" />
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase">Active Cluster Slot</span>
                <div className="text-xl font-mono font-extrabold text-slate-900 dark:text-white">
                  SLOT {slotNumber}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleAbandonFollowed}
                disabled={abandonedBanks.includes(followedBank)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  abandonedBanks.includes(followedBank)
                    ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400 dark:border-zinc-800'
                    : 'border-rose-300 dark:border-rose-900 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>ABANDON {followedBank.toUpperCase()}</span>
              </button>

              <button
                onClick={handleUpdateParent}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-indigo-300 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>CHANGE PARENT (SIMD-0337)</span>
              </button>

              <button
                onClick={resetDemo}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Visual Candidate Tree Graph */}
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="inline-block px-4 py-1.5 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 font-mono text-xs font-semibold shadow-xs">
                Parent Block: Slot {parentSlot} {updateParentTriggered && '(Updated via SIMD-0337)'}
              </div>
              <div className="w-px h-6 bg-slate-300 dark:bg-zinc-700 mx-auto" />
            </div>

            {/* Candidate Nodes Row */}
            <div className={`grid grid-cols-1 md:grid-cols-${bankCount} gap-4`}>
              {letters.map((letter) => {
                const bankId = `bank-${letter}`;
                const isFollowed = followedBank === bankId;
                const isAbandoned = abandonedBanks.includes(bankId);
                const isCanonical = canonicalBank === bankId || (!isAbandoned && !canonicalBank && isFollowed);

                return (
                  <div
                    key={letter}
                    onClick={() => !isAbandoned && setFollowedBank(bankId)}
                    className={`relative rounded-xl border p-4.5 transition-all cursor-pointer ${
                      isAbandoned
                        ? 'border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 opacity-70'
                        : isFollowed
                        ? 'border-sky-400 dark:border-sky-600 bg-sky-50/40 dark:bg-sky-950/20 shadow-md ring-2 ring-sky-400/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40 hover:border-slate-300'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                          BANK {letter}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                          isAbandoned
                            ? 'border-rose-300 bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                            : isCanonical
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'border-sky-300 bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        }`}
                      >
                        {isAbandoned ? '✕ ABANDONED' : isCanonical ? '✓ CANONICAL' : 'CANDIDATE'}
                      </span>
                    </div>

                    {/* Metadata & Bank Details */}
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Parent Slot:</span>
                        <span>{isAbandoned && updateParentTriggered ? parentSlot - 1 : parentSlot}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Blockhash:</span>
                        <span>4xMvK...{letter}653</span>
                      </div>
                      {technicalMode && (
                        <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-zinc-800/80 text-[11px]">
                          <span className="text-slate-400">bank_hash:</span>
                          <span className="text-sky-600 dark:text-sky-400">
                            BankHash_{letter}{slotNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Selection State Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {isAbandoned ? 'Pruned from graph' : isFollowed ? 'Currently tracking' : 'Click to follow'}
                      </span>
                      {isFollowed && !isAbandoned && (
                        <span className="text-sky-600 dark:text-sky-400 font-semibold inline-flex items-center gap-1">
                          Active Branch
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanatory Callout Box */}
          <div className="mt-4 rounded-xl border border-amber-200/80 dark:border-amber-900/30 bg-amber-50/60 dark:bg-amber-950/20 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                <strong>Why does this matter?</strong> In legacy Solana (TowerBFT), people assumed 1 slot = 1 block.
                Under Alpenglow, validators construct competing candidate banks. If a validator builds on a branch that
                is superseded, that bank is <em>abandoned</em>. Celor prevents trading systems from treating observed
                state as final state before canonical consensus resolves.
              </div>
            </div>
          </div>

          {/* Technical Inspector Trace (Visible when Technical Mode is on) */}
          {technicalMode && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
                  Technical Wire Trace (CanonicalResolver)
                </span>
                <ProvenanceBadge provenance="DIRECT" />
              </div>
              <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
{JSON.stringify(
  {
    slot: slotNumber,
    active_banks_count: bankCount,
    followed_bank: followedBank,
    abandoned_branches: abandonedBanks,
    canonical_resolution: canonicalBank || followedBank,
    update_parent_event: updateParentTriggered
      ? {
          cleared_bank_id: 'bank-A',
          parent_slot: parentSlot,
          simd_specification: 'SIMD-0337 Fast Leader Handover',
          action: 'StateRollback & PruneUncommitted',
        }
      : null,
  },
  null,
  2
)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

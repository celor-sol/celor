'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Timer,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Award,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { ProvenanceBadge } from '@/components/chrono/provenance-badge';

interface FinalityRaceDemoProps {
  technicalMode: boolean;
}

export function FinalityRaceDemo({ technicalMode }: FinalityRaceDemoProps) {
  const [raceRunning, setRaceRunning] = useState<boolean>(false);
  const [clockValue, setClockValue] = useState<number>(12.8);
  const [lane1Progress, setLane1Progress] = useState<number>(0);
  const [lane2Progress, setLane2Progress] = useState<number>(0);
  const [lane2Done, setLane2Done] = useState<boolean>(false);
  const [lane1Done, setLane1Done] = useState<boolean>(false);

  // BLS Verification state
  const [tampered, setTampered] = useState<boolean>(false);

  const startRace = () => {
    setRaceRunning(true);
    setLane1Progress(0);
    setLane2Progress(0);
    setLane2Done(false);
    setLane1Done(false);
    setClockValue(12.8);

    // Fast Alpenglow finish in 1.2s visual animation (~150ms conceptual)
    let p2 = 0;
    const interval2 = setInterval(() => {
      p2 += 10;
      setLane2Progress(p2);
      if (p2 >= 100) {
        clearInterval(interval2);
        setLane2Done(true);
        setClockValue(0.15); // Compress giant clock to 0.150!
      }
    }, 120);

    // Legacy TowerBFT takes ~5s visual animation to represent 12.8s
    let p1 = 0;
    const interval1 = setInterval(() => {
      p1 += 2;
      setLane1Progress(p1);
      if (p1 >= 100) {
        clearInterval(interval1);
        setLane1Done(true);
        setRaceRunning(false);
      }
    }, 100);
  };

  const resetRace = () => {
    setRaceRunning(false);
    setLane1Progress(0);
    setLane2Progress(0);
    setLane1Done(false);
    setLane2Done(false);
    setClockValue(12.8);
  };

  return (
    <section id="finality" className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold mb-3">
            <Timer className="w-3.5 h-3.5" />
            <span>CONSENSUS FINALITY REVOLUTION</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How Fast Does The Network Agree?
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-zinc-400">
            TowerBFT required waiting 32 consecutive block lockouts (~12.8 seconds). Alpenglow replaces this with cryptographic aggregate BLS certificates (~150ms).
          </p>
        </div>

        {/* Giant Visual Finality Clock & Target Box */}
        <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-gradient-to-b from-white via-sky-50/20 to-indigo-50/20 dark:from-zinc-900/80 dark:via-zinc-900/40 dark:to-zinc-950 p-6 md:p-10 shadow-xs mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
            {/* Old TowerBFT Baseline */}
            <div className="p-4 rounded-2xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                OLD CONSENSUS MODEL
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-400 dark:text-zinc-500 font-mono mt-1">
                ~12.8s
              </div>
              <p className="text-xs text-slate-500 mt-2">
                32 progressive block lockouts in TowerBFT. High reorg risk before root.
              </p>
            </div>

            {/* Giant Compressing Clock Center */}
            <div className="flex flex-col items-center justify-center py-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold mb-1">
                CONSENSUS SPEED CLOCK
              </span>
              <div className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 dark:text-white my-2 transition-all duration-500">
                {clockValue === 0.15 ? '0.150s' : `${clockValue.toFixed(1)}s`}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-xs font-bold font-mono">
                <Flame className="w-3.5 h-3.5 text-sky-600 animate-bounce" />
                <span>Alpenglow targets ~85.33× faster finality.</span>
              </div>
            </div>

            {/* Alpenglow Target */}
            <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                ALPENGLOW TARGET
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                ~150ms
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-2">
                Sub-slot BLS aggregate certificate with &ge;80% stake fast-path notarization.
              </p>
            </div>
          </div>

          {/* Finality Race Interactive Lanes */}
          <div className="mt-8 pt-8 border-t border-slate-200/80 dark:border-zinc-800/80">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                Interactive Finality Race
              </span>
              <div className="flex gap-2">
                <button
                  onClick={startRace}
                  disabled={raceRunning}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>RUN FINALITY RACE</span>
                </button>
                <button
                  onClick={resetRace}
                  className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  title="Reset race"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lane 1: Old Solana */}
            <div className="mb-4 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-semibold text-slate-500">LANE 1: OLD SOLANA (TowerBFT)</span>
                <span className="text-slate-400">
                  {lane1Done ? 'FINAL (12,800ms)' : `${(lane1Progress * 0.32).toFixed(0)} / 32 Lockouts`}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-slate-400 dark:bg-zinc-600 transition-all duration-100"
                  style={{ width: `${lane1Progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5 uppercase">
                <span>Observe</span>
                <span>Wait (Slot 8)</span>
                <span>Wait (Slot 16)</span>
                <span>Wait (Slot 24)</span>
                <span>Final Root</span>
              </div>
            </div>

            {/* Lane 2: Alpenglow */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  LANE 2: ALPENGLOW (BLS Fast-Path)
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {lane2Done ? '✓ FINALIZED IN ~150ms' : `${lane2Progress}%`}
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-100"
                  style={{ width: `${lane2Progress}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-emerald-700 dark:text-emerald-400 mt-1.5 uppercase font-medium">
                <span>Observe</span>
                <span>BLS Vote Aggregation</span>
                <span>Certificate Verified</span>
                <span>Instant Finality</span>
              </div>
            </div>
          </div>
        </div>

        {/* BLS Certificate & "Who Agreed?" Interactive Section */}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 md:p-8 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-[10px] font-mono uppercase font-bold text-sky-600 dark:text-sky-400 tracking-wider">
                CRYPTOGRAPHIC CONSENSUS
              </span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                BLS Certificate: Who Agreed?
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                A cryptographic proof that enough validators agreed. No blockspace wasted on on-chain votes.
              </p>
            </div>

            {/* Tamper test toggle */}
            <button
              onClick={() => setTampered(!tampered)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                tampered
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  : 'border-slate-200 dark:border-zinc-800 text-slate-600 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{tampered ? 'TAMPER ACTIVE (Revert)' : 'SIMULATE FORGED SIGNATURE'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stake Agreement Meter */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 text-center flex flex-col justify-center items-center">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-200 dark:text-zinc-800"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={tampered ? 'text-rose-500' : 'text-emerald-500'}
                    strokeDasharray={`${tampered ? 58 : 84.6}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {tampered ? '58.0%' : '84.6%'}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400">Stake</span>
                </div>
              </div>
              <div className="mt-3 text-xs font-semibold text-slate-700 dark:text-zinc-300">
                {tampered ? 'Threshold Not Met (<80%)' : 'Fast-Path Threshold Met (≥80%)'}
              </div>
            </div>

            {/* Validator Endorsements List */}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40">
              <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold tracking-wider block mb-2">
                Validator Aggregate Endorsements:
              </span>
              <div className="space-y-1.5 text-xs font-mono">
                {['Validator A (dv4AC...RBVJB)', 'Validator B (7xKXt...Q1L)', 'Validator C (3kLmn...90P)', 'Validator D (J1to...Fast)'].map((v) => (
                  <div key={v} className="flex items-center justify-between text-slate-700 dark:text-zinc-300">
                    <span className="truncate pr-2">{v}</span>
                    <span className={tampered ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}>
                      {tampered ? '✕' : '✓'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-zinc-800/80 text-[11px] text-slate-500">
                +116 additional validator signatures combined
              </div>
            </div>

            {/* Verification Status Card */}
            <div className={`p-4 rounded-xl border flex flex-col justify-between ${
              tampered
                ? 'border-rose-200 bg-rose-50/60 dark:bg-rose-950/30'
                : 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/30'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                    CRYPTOGRAPHIC CHECK
                  </span>
                  <ProvenanceBadge provenance="DIRECT" />
                </div>
                <div className={`text-base font-bold ${tampered ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {tampered ? '✕ CERTIFICATE REJECTED' : '✓ CERTIFICATE VALID'}
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2 leading-relaxed">
                  {tampered
                    ? 'BLS pairing check failed. Forged signature or corrupted payload detected. Celor cancels execution to protect user capital.'
                    : 'BLS12-381 pairing equation verified. State cannot be reverted by any fork.'}
                </p>
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-3">
                Algorithm: BLS12-381 Aggregation (SIMD-0326)
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

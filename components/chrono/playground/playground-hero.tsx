'use client';

import React, { useState } from 'react';
import { Play, Sparkles, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';

interface PlaygroundHeroProps {
  onStartPlayground: () => void;
  onExploreSubroute?: (id: string) => void;
}

export function PlaygroundHero({ onStartPlayground }: PlaygroundHeroProps) {
  const [animating, setAnimating] = useState(false);
  const [step, setStep] = useState<number>(0); // 0: Idle, 1: "1", 2: "2", 3: "3", 4: "GO", 5: Revealed

  const handleStart = () => {
    if (animating) return;
    setAnimating(true);
    setStep(1);

    setTimeout(() => setStep(2), 500);
    setTimeout(() => setStep(3), 1000);
    setTimeout(() => setStep(4), 1500);
    setTimeout(() => {
      setStep(5);
      setAnimating(false);
      onStartPlayground();
    }, 2000);
  };

  const resetIntro = () => {
    setStep(0);
    setAnimating(false);
  };

  return (
    <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      {/* Background Subtle Ice/Lavender Ambient Gradient */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-sky-100/60 via-indigo-50/40 to-transparent dark:from-sky-950/20 dark:via-indigo-950/10 dark:to-transparent rounded-full blur-3xl opacity-80" />
      </div>

      <div className="text-center max-w-3xl mx-auto">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-sky-200/80 dark:border-sky-800/40 bg-sky-50/80 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 text-xs font-medium tracking-wide mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
          <span>Interactive Solana Architecture Simulator</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Solana Changed Its Engine.
        </h1>

        {/* Subheadline */}
        <p className="mt-5 text-lg sm:text-xl text-slate-600 dark:text-zinc-300 font-normal leading-relaxed max-w-2xl mx-auto">
          Alpenglow changes how Solana reaches agreement. Celor lets you see the new network model in real time.
        </p>

        {/* Supporting Micro-Text */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-zinc-500">
          <span>Explore it.</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
          <span>Break it.</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-zinc-700" />
          <span>See what changes.</span>
        </div>

        {/* Central Action CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          {step === 0 ? (
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-semibold text-sm bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-lg shadow-slate-900/10 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START PLAYGROUND</span>
            </button>
          ) : step < 5 ? (
            <div className="inline-flex items-center justify-center w-36 py-3.5 rounded-xl font-mono text-lg font-bold bg-sky-50 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 animate-pulse shadow-sm">
              {step === 1 && '1 . . .'}
              {step === 2 && '2 . . .'}
              {step === 3 && '3 . . .'}
              {step === 4 && 'GO!'}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Engine Initialized
              </span>
              <button
                onClick={resetIntro}
                className="p-2 rounded-lg border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                title="Replay intro animation"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5-Step Story Pipeline Visualizer */}
      <div className="mt-14 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {[
            {
              term: 'SLOT',
              meaning: 'Where this activity is happening.',
              detail: 'A ~200ms target interval (SIMD-0525; formerly 400ms) assigned to a specific producing leader.',
              color: 'border-sky-200/70 bg-sky-50/50 dark:border-sky-900/40 dark:bg-sky-950/20 text-sky-900 dark:text-sky-300',
              stepNum: '01',
            },
            {
              term: 'LEADER',
              meaning: "The validator currently producing the network's data.",
              detail: 'Rotates across 4-slot windows (~800ms tenure). If their window expires, handoff takes over.',
              color: 'border-indigo-200/70 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300',
              stepNum: '02',
            },
            {
              term: 'BANK',
              meaning: "The current version of Solana's state being built.",
              detail: 'Under Alpenglow, multiple candidate banks can exist per slot simultaneously.',
              color: 'border-cyan-200/70 bg-cyan-50/50 dark:border-cyan-900/40 dark:bg-cyan-950/20 text-cyan-900 dark:text-cyan-300',
              stepNum: '03',
            },
            {
              term: 'STATE',
              meaning: 'What the network currently believes happened.',
              detail: 'Resolved canonically across forks based on cryptographic lineage.',
              color: 'border-violet-200/70 bg-violet-50/50 dark:border-violet-900/40 dark:bg-violet-950/20 text-violet-900 dark:text-violet-300',
              stepNum: '04',
            },
            {
              term: 'FINALITY',
              meaning: 'When the network agrees this state is final.',
              detail: 'Aggregated BLS proof notarizes state in ~150ms instead of 32 TowerBFT slots (~6.4s at 200ms / ~12.8s legacy).',
              color: 'border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300',
              stepNum: '05',
            },
          ].map((item, idx) => {
            const isHighlighted = step === 5 || step === idx + 1;
            return (
              <div
                key={item.term}
                className={`relative rounded-xl border p-4 transition-all duration-300 ${item.color} ${
                  isHighlighted ? 'scale-102 shadow-md ring-1 ring-sky-400/40' : 'opacity-90'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                    {item.stepNum}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline-block last:hidden" />
                </div>
                <h3 className="text-base font-bold tracking-tight mb-1">{item.term}</h3>
                <p className="text-xs font-medium text-slate-700 dark:text-zinc-300 mb-2 leading-relaxed">
                  {item.meaning}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
                  {item.detail}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

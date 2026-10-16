'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useChrono } from '@/hooks/useChrono';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { PlaygroundHero } from '@/components/chrono/playground/playground-hero';
import { CandidateBanksDemo } from '@/components/chrono/playground/candidate-banks-demo';
import { LeaderHandoffDemo } from '@/components/chrono/playground/leader-handoff-demo';
import { FinalityRaceDemo } from '@/components/chrono/playground/finality-race-demo';
import { TelemetryComparisonDemo } from '@/components/chrono/playground/telemetry-comparison-demo';
import { BreakNetworkSandbox } from '@/components/chrono/playground/break-network-sandbox';
import { RealWorldScenarios } from '@/components/chrono/playground/real-world-scenarios';
import { LiveNetworkExplorer } from '@/components/chrono/playground/live-network-explorer';
import { ReplayPlayer } from '@/components/chrono/playground/replay-player';
import { Epoch1064Testbench } from '@/components/chrono/epoch1064-testbench';
import {
  Sparkles,
  Terminal,
  Code,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';

export default function PlaygroundPage() {
  const { networkStatus, switchCluster } = useChrono();

  // Mode: "DEMO" | "LIVE" | "REPLAY"
  const [activeMode, setActiveMode] = useState<'DEMO' | 'LIVE' | 'REPLAY'>('DEMO');

  // Toggle: "SIMPLE" | "TECHNICAL"
  const [technicalMode, setTechnicalMode] = useState<boolean>(false);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay bg-background text-foreground">
      {/* Navigation Bar */}
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      {/* Top Floating Control Toolbar */}
      <div className="sticky top-16 z-30 w-full backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-slate-200/80 dark:border-zinc-800/80 py-2.5 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Mode Switcher Buttons & Badges */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setActiveMode('DEMO')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeMode === 'DEMO'
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                PLAY DEMO
              </button>
              <button
                onClick={() => setActiveMode('LIVE')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeMode === 'LIVE'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                LIVE NETWORK
              </button>
              <button
                onClick={() => setActiveMode('REPLAY')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  activeMode === 'REPLAY'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                REPLAY
              </button>
            </div>

            {/* Mode Badge */}
            {activeMode === 'DEMO' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-[11px] font-mono font-semibold">
                ◇ DEMO SIMULATED
              </span>
            )}
            {activeMode === 'LIVE' && (
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-semibold ${
                  networkStatus.connected
                    ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-900 text-slate-500'
                }`}
              >
                {networkStatus.connected ? '● LIVE CONNECTED' : '○ OFFLINE'}
              </span>
            )}
            {activeMode === 'REPLAY' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[11px] font-mono font-semibold">
                ↻ REPLAY ACTIVE
              </span>
            )}
          </div>

          {/* Right Controls: Subroutes Anchor Links & Simple/Technical Toggle */}
          <div className="flex items-center gap-3">
            {/* Anchor jump links */}
            <nav className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-500 dark:text-zinc-400">
              <button
                onClick={() => scrollToSection('forks')}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                #slot & #forks
              </button>
              <button
                onClick={() => scrollToSection('leader')}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                #leader
              </button>
              <button
                onClick={() => scrollToSection('finality')}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                #finality
              </button>
              <button
                onClick={() => scrollToSection('reality')}
                className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                #reality
              </button>
            </nav>

            {/* Simple vs Technical Switch */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800">
              <button
                onClick={() => setTechnicalMode(false)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  !technicalMode
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                SIMPLE
              </button>
              <button
                onClick={() => setTechnicalMode(true)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  technicalMode
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                TECHNICAL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Experience Body */}
      {activeMode === 'DEMO' && (
        <>
          {/* Section 1: Hero */}
          <PlaygroundHero onStartPlayground={() => scrollToSection('forks')} />

          {/* Section 1.5: Epoch 1064 Hardfork Interactive Test Bench */}
          <Epoch1064Testbench />

          {/* Section 2: Candidate Banks & SIMD-0337 UpdateParent */}
          <CandidateBanksDemo technicalMode={technicalMode} />

          {/* Section 3: Leader Handoff & Sub-Slot Timing */}
          <LeaderHandoffDemo technicalMode={technicalMode} />

          {/* Section 4: Finality Playground & BLS Certificates */}
          <FinalityRaceDemo technicalMode={technicalMode} />

          {/* Section 5: Telemetry Comparison & Pre-Execution Deshred */}
          <TelemetryComparisonDemo />

          {/* Section 6: Break The Network Sandbox */}
          <BreakNetworkSandbox />

          {/* Section 7: Real-World Scenarios */}
          <RealWorldScenarios />
        </>
      )}

      {activeMode === 'LIVE' && (
        <div className="py-6">
          <LiveNetworkExplorer technicalMode={technicalMode} />
        </div>
      )}

      {activeMode === 'REPLAY' && (
        <div className="py-6">
          <ReplayPlayer technicalMode={technicalMode} />
        </div>
      )}

      {/* Final Call To Action */}
      <section className="py-20 border-t border-slate-200/80 dark:border-zinc-800/80 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-zinc-950/50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Now you understand why the infrastructure has to change.
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-zinc-400 max-w-xl mx-auto">
            Traditional RPC infrastructure was built for 12-second block intervals. Celor provides the high-frequency consensus telemetry required for Alpenglow.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/developers"
              className="px-6 py-3 rounded-xl font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-sm transition-all inline-flex items-center gap-2"
            >
              <span>BUILD WITH CELOR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/sniper"
              className="px-6 py-3 rounded-xl font-semibold text-xs border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-400 transition-all inline-flex items-center gap-2"
            >
              <span>VIEW SNIPER INFRA</span>
            </Link>

            <Link
              href="/network"
              className="px-6 py-3 rounded-xl font-semibold text-xs border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:border-slate-400 transition-all inline-flex items-center gap-2"
            >
              <span>VIEW NETWORK EXPLORER</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <FooterSection />
    </main>
  );
}

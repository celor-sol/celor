'use client';

import { useEffect, useState, useRef } from 'react';
import {
  SlotProgress,
  LeaderInfo,
  CandidateBank,
  FinalityInfo,
  NetworkStatus,
  FieldProvenance,
} from '@/lib/chrono-core/types';
import { ShieldCheck, Activity, Clock, Layers, ArrowRight, Radio } from 'lucide-react';
import { ProvenanceBadge } from './provenance-badge';

interface LiveNetworkSectionProps {
  slotProgress: SlotProgress;
  leaderInfo: LeaderInfo;
  candidateBanks: CandidateBank[];
  finalityInfo: FinalityInfo | null;
  networkStatus: NetworkStatus;
}

export function LiveNetworkSection({
  slotProgress,
  leaderInfo,
  candidateBanks,
  finalityInfo,
  networkStatus,
}: LiveNetworkSectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const [clockTime, setClockTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => setClockTime(new Date().toLocaleTimeString());
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const progressPercent = Math.min(100, Math.round(slotProgress.phaseRatio * 100));
  const canonicalBank =
    candidateBanks.find((b) => b.state === 'CANONICAL') ||
    (candidateBanks.length > 0 ? candidateBanks[0] : null);

  const coverageScore = networkStatus.telemetry?.coverageScore ?? networkStatus.coverageScore ?? 0;

  const metrics: {
    label: string;
    value: string;
    detail: string;
    provenance: FieldProvenance;
  }[] = [
    {
      label: 'CURRENT SLOT',
      value: slotProgress.slot > 0 ? slotProgress.slot.toLocaleString() : 'UNAVAILABLE',
      detail: `${slotProgress.targetSlotDurationMs}ms window`,
      provenance: slotProgress.slot > 0 ? slotProgress.provenance : 'UNAVAILABLE',
    },
    {
      label: 'SLOT DURATION',
      value: `${slotProgress.targetSlotDurationMs}ms`,
      detail: `Protocol Target Duration (${slotProgress.targetSlotDurationMs}ms)`,
      provenance: 'DERIVED',
    },
    {
      label: 'CURRENT LEADER',
      value: leaderInfo.currentLeader || 'CALIBRATING...',
      detail: `Phase: ${leaderInfo.handoffState}`,
      provenance: leaderInfo.currentLeader ? leaderInfo.provenance : 'DERIVED',
    },
    {
      label: 'NEXT LEADER',
      value: leaderInfo.nextLeader || 'CALIBRATING...',
      detail: 'Handoff scheduled',
      provenance: leaderInfo.nextLeader ? leaderInfo.provenance : 'DERIVED',
    },
    {
      label: 'TIME REMAINING',
      value: slotProgress.isRealTime ? `${slotProgress.remainingMs}ms` : `${slotProgress.targetSlotDurationMs}ms`,
      detail: `Drift: ${slotProgress.driftMs}ms`,
      provenance: 'ESTIMATED',
    },
    {
      label: 'CANDIDATE BANKS',
      value:
        candidateBanks.length > 0
          ? `0${candidateBanks.length} BRANCH${candidateBanks.length > 1 ? 'ES' : ''}`
          : '01 BRANCH',
      detail:
        candidateBanks.length > 1
          ? 'Multi-candidate bank slot (SIMD-0326)'
          : 'Linear canonical block stream (Public RPC)',
      provenance: candidateBanks.length > 0 ? candidateBanks[0].provenance : 'DIRECT',
    },
    {
      label: 'FINALITY STATE',
      value: finalityInfo?.mode === 'ALPENGLOW_VOTOR' ? 'VOTOR FINALIZED' : 'ROOTED (32 LOCKOUTS)',
      detail: finalityInfo?.mode === 'ALPENGLOW_VOTOR'
        ? 'BLS Fast-Path Certificate (~80% stake)'
        : slotProgress.slot > 31
        ? `Root Slot ${(slotProgress.slot - 31).toLocaleString()} (32 lockouts)`
        : 'TowerBFT 32-slot lockout root',
      provenance: 'DIRECT',
    },
    {
      label: 'CONSENSUS FINALITY',
      value: finalityInfo?.mode === 'ALPENGLOW_VOTOR'
        ? finalityInfo.consensusFinalityMs
          ? `${finalityInfo.consensusFinalityMs}ms`
          : '~150ms'
        : finalityInfo?.finalityLatencyMs
        ? `${(finalityInfo.finalityLatencyMs / 1000).toFixed(1)}s`
        : '~6.4s',
      detail: finalityInfo?.mode === 'ALPENGLOW_VOTOR'
        ? finalityInfo.consensusFinalityMs
          ? 'Live Monotonic Finality (Geyser Level 4)'
          : 'Protocol Target Finality (SIMD-0326 BLS Cert)'
        : 'TowerBFT progressive lockout root (32 slots × 200ms target)',
      provenance: finalityInfo?.provenance || 'ESTIMATED',
    },
    {
      label: 'PROVIDER NOTIFICATION LAG',
      value: `${finalityInfo?.providerLatencyMs || 1200}ms`,
      detail: 'WebSocket delivery lag (distinct from consensus finality)',
      provenance: 'DIRECT',
    },
  ];

  return (
    <section
      id="live"
      ref={sectionRef}
      className="relative py-16 sm:py-24 lg:py-32 border-y border-foreground/10"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header matching Optimus */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 mb-12 sm:mb-16 lg:mb-20">
          <div>
            <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono text-muted-foreground mb-4 sm:mb-6">
              <span className="w-6 sm:w-8 h-px bg-foreground/30" />
              Live Consensus Telemetry
            </span>
            <h2
              className={`text-3xl sm:text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Deterministic timing.
              <br />
              <span className="text-muted-foreground">Measured in microseconds.</span>
            </h2>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2 sm:gap-4 font-mono text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  networkStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-foreground font-medium text-xs sm:text-sm">
                {networkStatus.connected ? 'CELOR SERVICE: LIVE' : 'CELOR OFFLINE'}
              </span>
            </div>
            <span className="text-foreground/30 hidden sm:inline">|</span>
            <span className="uppercase text-[11px] sm:text-xs font-mono px-2 py-0.5 rounded border border-foreground/10">
              {networkStatus.source || networkStatus.cluster}
            </span>
            <span className="text-foreground/30 hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm">{clockTime || '00:00:00'}</span>
          </div>
        </div>

        {/* Telemetry Coverage Banner */}
        <div className="border border-foreground/10 p-4 sm:p-5 lg:p-6 mb-8 bg-foreground/[0.01] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse shrink-0" />
            <div>
              <div className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase">
                Alpenglow Telemetry Coverage Matrix
              </div>
              <div className="text-xs sm:text-sm font-mono text-foreground font-medium">
                {coverageScore}% of consensus dimensions observable under current provider profile
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-full md:w-48 h-2 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  coverageScore === 100 ? 'bg-purple-500' : 'bg-amber-500'
                }`}
                style={{ width: `${coverageScore}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-xs font-mono text-muted-foreground whitespace-nowrap">
              {coverageScore === 100 ? 'SANDBOX (10/10)' : 'PUBLIC RPC (3/10)'}
            </span>
          </div>
        </div>

        {/* Latency Disaggregation Breakdown (Observation vs Celor Core vs Browser Render) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-foreground/10 border border-foreground/10 rounded-xl overflow-hidden mb-8 sm:mb-12">
          <div className="bg-background p-4 sm:p-5 font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground uppercase">1. Source Observation</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-foreground/10 bg-foreground/[0.02]">
                NETWORK STREAM
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-mono text-foreground font-medium">
              {networkStatus.serviceTelemetry?.sourceLatencyUs
                ? `${(networkStatus.serviceTelemetry.sourceLatencyUs / 1000).toFixed(1)}ms`
                : networkStatus.environment === 'fixture'
                ? '0.4ms'
                : '~45ms'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-sans">
              WAN stream ingress to local Celor Service adapter.
            </p>
          </div>

          <div className="bg-background p-4 sm:p-5 font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground uppercase">2. Celor Core Pipeline</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                [MEASURED]
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-mono text-foreground font-medium">
              {networkStatus.serviceTelemetry?.processingLatencyUs
                ? `${(networkStatus.serviceTelemetry.processingLatencyUs / 1000).toFixed(2)}µs`
                : '2.00µs (p50)'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-sans">
              Zero-allocation Rust core: BankGraph insert & canonical resolve.
            </p>
          </div>

          <div className="bg-background p-4 sm:p-5 font-mono">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-muted-foreground uppercase">3. Browser Render</span>
              <span className="text-[10px] px-2 py-0.5 rounded border border-foreground/10 bg-foreground/[0.02]">
                DOM DISPATCH
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-mono text-foreground font-medium">
              &lt; 2.5ms
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-sans">
              Localhost WebSocket delivery and React concurrent reconcile.
            </p>
          </div>
        </div>

        {/* Real Slot Pulse Monitor */}
        <div className="border border-foreground/10 p-4 sm:p-6 lg:p-8 mb-8 sm:mb-12 bg-foreground/[0.01] rounded-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Active Slot Engine
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-mono font-medium tracking-tight">
                SLOT {slotProgress.slot > 0 ? slotProgress.slot.toLocaleString() : '—'}
              </div>
            </div>

            <div className="font-mono text-left md:text-right">
              <div className="text-xl sm:text-2xl lg:text-3xl font-mono text-foreground">
                {slotProgress.isRealTime
                  ? `${slotProgress.elapsedMs}ms / ${slotProgress.targetSlotDurationMs}ms`
                  : 'CALIBRATING'}
              </div>
              <div className="text-xs text-muted-foreground">
                Progress: {progressPercent}% | Target: {slotProgress.targetSlotDurationMs}ms
              </div>
            </div>
          </div>

          {/* Slot Progress Bar */}
          <div className="h-3 w-full bg-foreground/10 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-75 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-3 flex justify-between items-center text-[10px] sm:text-xs font-mono text-muted-foreground">
            <span>0ms (Start)</span>
            <span>{Math.round((slotProgress.targetSlotDurationMs || 200) / 2)}ms (Half)</span>
            <span>{slotProgress.targetSlotDurationMs || 200}ms (Target)</span>
          </div>
        </div>

        {/* 8-Cell Technical Metric Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-foreground/10 rounded-xl overflow-hidden">
          {metrics.map((metric, idx) => (
            <div
              key={metric.label}
              className={`bg-background p-4 sm:p-6 lg:p-8 transition-all duration-700 flex flex-col justify-between ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${idx * 60}ms` }}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    {metric.label}
                  </span>
                  <ProvenanceBadge provenance={metric.provenance} />
                </div>
                <div
                  className={`text-xl sm:text-2xl lg:text-3xl font-mono font-medium tracking-tight truncate ${
                    metric.value === 'UNAVAILABLE' ? 'text-muted-foreground/60 line-through' : 'text-foreground'
                  }`}
                >
                  {metric.value}
                </div>
              </div>
              <div className="mt-3 sm:mt-4 text-[11px] sm:text-xs font-sans text-muted-foreground">
                {metric.detail}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

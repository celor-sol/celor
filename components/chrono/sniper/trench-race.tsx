'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  RotateCcw,
  Terminal,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SimulatorScenarioResponse } from './types';
import { SCENARIO_PRESETS, fetchOrGenerateSimulation } from './simulation-engine';

interface TrenchRaceProps {
  onSwitchToDevnet?: () => void;
}

export function TrenchRace({ onSwitchToDevnet }: TrenchRaceProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>('fire');
  const [viewMode, setViewMode] = useState<'SIMPLE' | 'TECHNICAL'>('SIMPLE');
  const [executionMode, setExecutionMode] = useState<'DEMO' | 'REAL_DEVNET'>('DEMO');

  // Race State Machine: 'IDLE' | 'COUNTDOWN' | 'RACING' | 'COMPLETE'
  const [raceState, setRaceState] = useState<'IDLE' | 'COUNTDOWN' | 'RACING' | 'COMPLETE'>('IDLE');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [raceElapsedMs, setRaceElapsedMs] = useState<number>(0);
  const [simulationData, setSimulationData] = useState<SimulatorScenarioResponse | null>(null);
  const [showWhyModal, setShowWhyModal] = useState<boolean>(false);

  // Active steps in each lane
  const [celorStepIndex, setCelorStepIndex] = useState<number>(0);
  const [standardStepIndex, setStandardStepIndex] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load initial simulation data
  useEffect(() => {
    let isMounted = true;
    fetchOrGenerateSimulation(selectedScenario).then((data) => {
      if (isMounted) {
        setSimulationData(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedScenario]);

  // Handle countdown and race start
  const handleStartRace = async () => {
    if (raceState === 'COUNTDOWN' || raceState === 'RACING') return;

    if (executionMode === 'REAL_DEVNET') {
      if (onSwitchToDevnet) onSwitchToDevnet();
      return;
    }

    // Load scenario data
    const data = await fetchOrGenerateSimulation(selectedScenario);
    setSimulationData(data);

    // Reset race counters
    setRaceState('COUNTDOWN');
    setCountdownNum(3);
    setRaceElapsedMs(0);
    setCelorStepIndex(0);
    setStandardStepIndex(0);

    // Countdown 3 -> 2 -> 1 -> GO
    let count = 3;
    const countInterval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownNum(count);
      } else {
        clearInterval(countInterval);
        startLiveRace(data);
      }
    }, 450);
  };

  const startLiveRace = (data: SimulatorScenarioResponse) => {
    setRaceState('RACING');
    startTimeRef.current = Date.now();

    const totalStandardMs = data.standard_lane.total_landing_ms;

    // Simulation animation duration in UI: ~2.4s for standard, Celor finishes earlier
    const ANIMATION_DURATION_MS = 2400;
    const msScale = ANIMATION_DURATION_MS / totalStandardMs;

    const interval = setInterval(() => {
      const now = Date.now();
      const rawElapsed = now - startTimeRef.current;
      const virtualElapsed = Math.min(Math.round(rawElapsed / msScale), totalStandardMs);
      setRaceElapsedMs(virtualElapsed);

      // Advance Celor steps
      const cSteps = data.celor_lane.steps;
      let nextCelorIdx = 0;
      for (let i = 0; i < cSteps.length; i++) {
        if (virtualElapsed >= cSteps[i].elapsed_ms) {
          nextCelorIdx = i + 1;
        }
      }
      setCelorStepIndex(nextCelorIdx);

      // Advance Standard steps
      const sSteps = data.standard_lane.steps;
      let nextStdIdx = 0;
      for (let i = 0; i < sSteps.length; i++) {
        if (virtualElapsed >= sSteps[i].elapsed_ms) {
          nextStdIdx = i + 1;
        }
      }
      setStandardStepIndex(nextStdIdx);

      if (virtualElapsed >= totalStandardMs) {
        clearInterval(interval);
        setRaceState('COMPLETE');
      }
    }, 25);

    timerRef.current = interval;
  };

  const handleResetRace = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRaceState('IDLE');
    setRaceElapsedMs(0);
    setCelorStepIndex(0);
    setStandardStepIndex(0);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const data = simulationData;
  if (!data) return null;

  const currentPreset = SCENARIO_PRESETS.find((p) => p.id === selectedScenario) || SCENARIO_PRESETS[0];

  return (
    <div className="space-y-12 sm:space-y-16">
      
      {/* Hero Section */}
      <div className="relative text-center max-w-4xl mx-auto space-y-6 pt-4 sm:pt-8">
        
        {/* Top Mode Badge */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border border-foreground/15 bg-foreground/[0.03] text-foreground font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CELOR SNIPER INFRA
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold">
            ● {executionMode === 'DEMO' ? 'DEMO SIMULATION' : 'LIVE DEVNET MODE'}
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-[clamp(2.4rem,7vw,4.5rem)] font-serif font-normal tracking-tight leading-[1.02] text-foreground">
          The Race Starts <br className="hidden sm:inline" />
          <span className="italic font-light">Before The Block.</span>
        </h1>

        {/* Subtext */}
        <p className="text-base sm:text-lg lg:text-xl text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
          Most bots wait for RPC to tell them what happened. <br className="hidden sm:inline" />
          <strong className="text-foreground font-medium">Celor helps your bot understand what is happening earlier and route faster.</strong>
        </p>

        {/* Two Giant Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {raceState === 'COUNTDOWN' ? (
            <div className="h-14 sm:h-16 w-64 rounded-full border border-foreground bg-foreground text-background flex items-center justify-center text-2xl font-mono font-bold tracking-widest animate-pulse">
              {countdownNum}
            </div>
          ) : (
            <Button
              onClick={handleStartRace}
              disabled={raceState === 'RACING'}
              className="h-14 sm:h-16 px-8 sm:px-10 rounded-full bg-foreground text-background hover:bg-foreground/90 font-mono text-sm sm:text-base font-bold tracking-wider shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 w-full sm:w-auto justify-center"
            >
              <Zap className="w-5 h-5 fill-current" />
              SNIPE IN DEMO (3-2-1 RACE)
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => {
              setExecutionMode('REAL_DEVNET');
              if (onSwitchToDevnet) onSwitchToDevnet();
            }}
            className="h-14 sm:h-16 px-8 rounded-full border-foreground/20 hover:bg-foreground/5 font-mono text-xs sm:text-sm font-semibold tracking-wide w-full sm:w-auto justify-center"
          >
            RUN REAL DEVNET →
          </Button>
        </div>

        <div className="text-[11px] font-mono text-muted-foreground">
          Interactive Trench Infrastructure Demonstration • {data.disclaimer}
        </div>
      </div>

      {/* 5-Step Core Pipeline Strip */}
      <div className="p-4 sm:p-5 border border-foreground/10 rounded-2xl bg-foreground/[0.02]">
        <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3 text-center sm:text-left">
          HOW CELOR INFRASTRUCTURE OPERATES
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 font-mono text-xs">
          <div className="p-3 rounded-xl bg-background border border-foreground/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground">STEP 1</span>
            <span className="font-bold text-foreground mt-1">1. SIGNAL</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">Direct shred ingest</span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-foreground/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground">STEP 2</span>
            <span className="font-bold text-foreground mt-1">2. CHECK</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">Leader, slot, parent</span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-foreground/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground">STEP 3</span>
            <span className="font-bold text-foreground mt-1">3. DECIDE</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">FIRE • WAIT • CANCEL</span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-foreground/10 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground">STEP 4</span>
            <span className="font-bold text-foreground mt-1">4. SEND</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">Direct Leader QUIC</span>
          </div>
          <div className="p-3 rounded-xl bg-background border border-foreground/10 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[10px] text-muted-foreground">STEP 5</span>
            <span className="font-bold text-foreground mt-1">5. LAND</span>
            <span className="text-[9px] text-muted-foreground mt-0.5">On-chain verified</span>
          </div>
        </div>
      </div>

      {/* Scenario Selector & Engine Decision Modes */}
      <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-foreground/10 pb-3">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Scenario Presets
            </span>
            <h3 className="text-base sm:text-lg font-serif">
              Trench Scenarios (FIRE • WAIT • CANCEL • UNKNOWN)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">View:</span>
            <button
              onClick={() => setViewMode(viewMode === 'SIMPLE' ? 'TECHNICAL' : 'SIMPLE')}
              className="text-xs font-mono px-3 py-1 rounded-md border border-foreground/15 bg-background hover:bg-foreground/5 text-foreground transition-colors"
            >
              {viewMode === 'SIMPLE' ? 'SIMPLE' : 'TECHNICAL (RAW)'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SCENARIO_PRESETS.map((preset) => {
            const isSelected = selectedScenario === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedScenario(preset.id);
                  handleResetRace();
                }}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'border-foreground bg-foreground text-background shadow-sm'
                    : 'border-foreground/10 bg-background hover:bg-foreground/[0.03] text-foreground'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-xs leading-snug">{preset.title}</span>
                    <span
                      className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${
                        isSelected
                          ? 'bg-background/20 text-background border-transparent'
                          : preset.badgeClass
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] leading-relaxed line-clamp-2 ${
                      isSelected ? 'text-background/80' : 'text-muted-foreground'
                    }`}
                  >
                    {preset.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* "Why?" Interactive Drawer */}
        <div className="p-4 rounded-xl border border-foreground/10 bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              <strong>Decision Rationale:</strong> Celor decided <strong className="text-foreground">{currentPreset.decision}</strong> for this scenario.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowWhyModal(!showWhyModal)}
            className="h-7 text-[11px] font-mono text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            {showWhyModal ? 'Hide Why? ▲' : 'Inspect Why? ▼'}
          </Button>
        </div>

        {showWhyModal && (
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] space-y-2 font-mono text-xs">
            <div className="font-bold uppercase text-[10px] text-muted-foreground tracking-wider">
              Deterministic Decision Engine Trace:
            </div>
            <ul className="space-y-1 text-foreground/90 text-[11px]">
              {currentPreset.decisionWhy?.map((r, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* The Trench Race Track */}
      <div className="border border-foreground/15 rounded-3xl bg-background shadow-xl overflow-hidden">
        
        {/* Race Track Header */}
        <div className="p-4 sm:p-6 border-b border-foreground/10 bg-foreground/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Trench Duel Simulator
              </span>
              <div className="font-serif text-lg font-semibold text-foreground">
                Standard RPC vs. Celor Infrastructure
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-mono text-xs text-muted-foreground bg-background px-3 py-1.5 rounded-lg border border-foreground/10">
              Clock: <span className="font-bold text-foreground">+{raceElapsedMs}ms</span>
            </div>
            {raceState !== 'IDLE' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetRace}
                className="font-mono text-xs h-8 rounded-lg"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> RESET
              </Button>
            )}
          </div>
        </div>

        {/* Lanes Area */}
        <div className="p-4 sm:p-8 space-y-8">
          
          {/* LANE 1: STANDARD RPC */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-foreground/10 text-foreground border border-foreground/20">
                  {data.standard_lane.badge}
                </span>
                <span className="font-mono text-sm font-semibold tracking-tight">
                  LANE 1 — {data.standard_lane.name}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Decision: <strong className="text-foreground">+{data.standard_lane.total_decision_ms}ms</strong> • Landing:{' '}
                <strong className="text-foreground">+{data.standard_lane.total_landing_ms}ms</strong>
              </span>
            </div>

            {/* Standard Lane Step Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              {data.standard_lane.steps.map((step, idx) => {
                const isPassed = raceState === 'COMPLETE' || standardStepIndex > idx;
                const isCurrent = raceState === 'RACING' && standardStepIndex === idx + 1;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all text-xs font-mono flex flex-col justify-between h-28 ${
                      isPassed
                        ? 'bg-foreground/[0.04] border-foreground/20 text-foreground'
                        : isCurrent
                        ? 'bg-foreground/[0.08] border-foreground/40 text-foreground shadow-sm animate-pulse'
                        : 'bg-background border-foreground/10 text-muted-foreground/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {step.label.split(':')[0]}
                      </span>
                      {isPassed && <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-foreground mb-1">
                        {step.label.split(':')[1]?.trim() || step.label}
                      </div>
                      <div className="text-[9px] text-muted-foreground leading-tight line-clamp-2">
                        {step.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="w-full h-px bg-foreground/10 my-4" />

          {/* LANE 2: CELOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase bg-blue-600 text-white shadow-sm">
                  {data.celor_lane.badge}
                </span>
                <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
                  LANE 2 — {data.celor_lane.name}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                Decision: <strong className="text-blue-600 dark:text-blue-400">+{data.celor_lane.total_decision_ms}ms</strong> • Landing:{' '}
                <strong className="text-blue-600 dark:text-blue-400">+{data.celor_lane.total_landing_ms}ms</strong>
              </span>
            </div>

            {/* Celor Lane Step Cards */}
            <div
              className={`grid gap-2 sm:gap-3 ${
                data.celor_lane.steps.length > 6
                  ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-8'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
              }`}
            >
              {data.celor_lane.steps.map((step, idx) => {
                const isPassed = raceState === 'COMPLETE' || celorStepIndex > idx;
                const isCurrent = raceState === 'RACING' && celorStepIndex === idx + 1;
                const isFire = step.stage.includes('FIRE');
                const isCancel = step.stage.includes('CANCEL');
                const isWait = step.stage.includes('WAIT');
                const isQuic = step.stage.includes('QUIC');
                const isLanded = step.stage.includes('LANDED');

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all text-xs font-mono flex flex-col justify-between h-28 ${
                      isPassed
                        ? isFire
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-md font-bold'
                          : isCancel
                          ? 'bg-rose-500 text-white border-rose-600 shadow-md font-bold'
                          : isWait
                          ? 'bg-amber-500 text-white border-amber-600 shadow-md font-bold'
                          : isQuic
                          ? 'bg-blue-600 text-white border-blue-700 shadow-md font-bold'
                          : isLanded
                          ? 'bg-foreground text-background border-foreground shadow-sm'
                          : 'bg-foreground/[0.05] border-foreground/20 text-foreground'
                        : isCurrent
                        ? 'bg-blue-500/15 border-blue-500 text-foreground shadow-sm animate-pulse'
                        : 'bg-background border-foreground/10 text-muted-foreground/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-semibold ${
                          isPassed && (isFire || isCancel || isWait || isQuic)
                            ? 'text-white/80'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.label.split(':')[0]}
                      </span>
                      {isPassed && (
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            isFire || isCancel || isWait || isQuic ? 'text-white' : 'text-foreground'
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <div
                        className={`font-bold text-xs mb-1 ${
                          isPassed && (isFire || isCancel || isWait || isQuic)
                            ? 'text-white'
                            : 'text-foreground'
                        }`}
                      >
                        {step.label.split(':')[1]?.trim() || step.label}
                      </div>
                      <div
                        className={`text-[9px] leading-tight line-clamp-2 ${
                          isPassed && (isFire || isCancel || isWait || isQuic)
                            ? 'text-white/90'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.detail}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Speed Comparison Strip */}
        <div className="p-4 sm:p-6 bg-foreground/[0.02] border-t border-foreground/10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Standard Bot
            </span>
            <p className="text-xs text-foreground/80 leading-relaxed font-sans">
              Waits for RPC gossip aggregation, polls unconfirmed transactions, and sends through standard RPC relay hops.
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 uppercase tracking-widest font-semibold">
              Celor Infrastructure
            </span>
            <p className="text-xs text-foreground leading-relaxed font-sans font-medium">
              Evaluates raw shreds in 0.50µs, checks leader tenure &amp; candidate bank lineage, and routes straight to leader TPU QUIC.
            </p>
          </div>

          <div className="p-4 rounded-2xl border border-foreground/10 bg-background flex flex-col justify-center items-center text-center font-mono">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">
              SIMULATED LEAD (ILLUSTRATIVE)
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              +{data.decision_lead_ms}ms
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Standard: {data.standard_lane.total_decision_ms}ms • Celor: {data.celor_lane.total_decision_ms}ms
            </div>
          </div>

        </div>
      </div>

      {/* Result Screen (When Race Completes or In Preview) */}
      {(raceState === 'COMPLETE' || raceState === 'IDLE') && (
        <div className="border border-foreground/10 rounded-3xl bg-foreground/[0.02] p-6 sm:p-10 space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-foreground/10 pb-6">
            <div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {raceState === 'COMPLETE' ? 'RACE COMPLETE' : 'BENCHMARK COMPARISON'}
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif font-normal tracking-tight mt-1">
                {data.summary_verdict}
              </h2>
            </div>

            <div className="text-xs font-mono text-muted-foreground sm:text-right">
              <div>Mode: <strong className="text-foreground">{data.mode}</strong></div>
              <div>Token: <strong className="text-foreground">{data.token}</strong></div>
            </div>
          </div>

          {/* Scorecard: Celor vs Standard */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            
            {/* Celor Card */}
            <div className="p-5 rounded-2xl border border-blue-500/20 bg-background shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="font-bold text-sm text-foreground">CELOR INFRASTRUCTURE</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                  {data.celor_lane.badge}
                </span>
              </div>

              <div className="space-y-2 text-foreground/90">
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-muted-foreground">Time to Decision</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    +{data.celor_lane.total_decision_ms} ms
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-muted-foreground">Execution Route</span>
                  <span className="font-semibold text-foreground">{data.celor_lane.route}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-muted-foreground">Landed Block / Slot</span>
                  <span className="font-semibold text-foreground">
                    {data.celor_lane.landed_slot === 0 ? 'ABORTED' : `#${data.celor_lane.landed_slot} (Block N)`}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Illustrative Entry Mcap</span>
                  <span className="font-bold text-foreground">
                    {data.celor_lane.entry_mcap_usd === 0
                      ? '$0 (Capital Saved)'
                      : `$${data.celor_lane.entry_mcap_usd.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Standard RPC Card */}
            <div className="p-5 rounded-2xl border border-foreground/10 bg-background shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-foreground/40" />
                  <span className="font-bold text-sm text-foreground">STANDARD RPC BOT</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-foreground/5 text-muted-foreground text-[10px] font-bold">
                  {data.standard_lane.badge}
                </span>
              </div>

              <div className="space-y-2 text-foreground/90">
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-muted-foreground">Time to Decision</span>
                  <span className="font-bold text-foreground">+{data.standard_lane.total_decision_ms} ms</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-muted-foreground">Execution Route</span>
                  <span className="font-semibold text-foreground">{data.standard_lane.route}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-foreground/5">
                  <span className="text-muted-foreground">Landed Block / Slot</span>
                  <span className="font-semibold text-foreground">
                    #{data.standard_lane.landed_slot} (Block N+2)
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Illustrative Entry Mcap</span>
                  <span className="font-bold text-foreground">
                    ${data.standard_lane.entry_mcap_usd.toLocaleString()} (+{data.standard_lane.price_impact_percent}%)
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Trench Token Example (Illustrative) */}
          <div className="p-5 sm:p-6 rounded-2xl border border-foreground/10 bg-background">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-foreground/10 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  Trench Mcap Example
                </span>
                <div className="font-serif text-lg font-semibold text-foreground">
                  {data.token} New Pool Detected
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                ILLUSTRATIVE PRICE MOVEMENT
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10">
                <div className="text-[10px] text-muted-foreground uppercase">POOL CREATION MCAP</div>
                <div className="text-lg font-bold text-foreground mt-1">
                  ${data.initial_mcap_usd.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">Base liquidity pool seed</div>
              </div>

              <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10">
                <div className="text-[10px] text-muted-foreground uppercase">STANDARD BOT ENTRY</div>
                <div className="text-lg font-bold text-rose-500 mt-1">
                  ${data.standard_lane.entry_mcap_usd.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Observed later (+{data.standard_lane.price_impact_percent}% price impact)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10">
                <div className="text-[10px] text-muted-foreground uppercase">CELOR BOT ENTRY</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {data.celor_lane.entry_mcap_usd === 0
                    ? '$0 (Saved Capital)'
                    : `$${data.celor_lane.entry_mcap_usd.toLocaleString()}`}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {data.celor_lane.entry_mcap_usd === 0
                    ? 'Aborted invalid abandoned bank'
                    : `Earlier decision (+${data.celor_lane.price_impact_percent}% impact)`}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-muted-foreground mt-4 leading-relaxed">
              * In trenches, being early matters more than seeing the same transaction eventually. Controlled simulation values shown for demonstration.
            </div>
          </div>

          {/* Technical Trace (Advanced View) */}
          {viewMode === 'TECHNICAL' && (
            <div className="p-5 sm:p-6 rounded-2xl border border-foreground/10 bg-background font-mono text-xs space-y-4">
              <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-500" />
                  <span className="font-bold text-sm uppercase">Technical Trace Inspection</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Fields verified against Celor Backend contracts
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-[11px]">
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">Slot</span>
                  <span className="font-semibold text-foreground">{data.technical_trace.slot}</span>
                </div>
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">Current Leader</span>
                  <span className="font-semibold text-foreground truncate block" title={data.technical_trace.current_leader}>
                    {data.technical_trace.current_leader}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">Candidate Bank ID</span>
                  <span className="font-semibold text-foreground">
                    {data.technical_trace.bank_id || 'None (Validator Local)'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">Blockhash</span>
                  <span className="font-semibold text-foreground truncate block">
                    {data.technical_trace.blockhash}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">Source Feeds</span>
                  <span className="font-semibold text-foreground">{data.technical_trace.source}</span>
                </div>
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">Freshness Tier</span>
                  <span className="font-semibold text-foreground">{data.technical_trace.freshness_tier}</span>
                </div>
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">UpdateParent Observed</span>
                  <span className="font-semibold text-foreground">
                    {data.technical_trace.update_parent_observed ? 'TRUE (Invalidated)' : 'FALSE'}
                  </span>
                </div>
                <div className="p-2.5 rounded bg-foreground/[0.02] border border-foreground/5">
                  <span className="text-muted-foreground text-[10px] block">TPU Route</span>
                  <span className="font-semibold text-foreground">
                    QUIC Port {data.technical_trace.quic_target_port}
                  </span>
                </div>
              </div>

              {/* Reasons */}
              <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-2">
                <span className="text-[10px] uppercase text-muted-foreground tracking-wider block">
                  ExecutionDecisionEngine Reasons
                </span>
                <ul className="space-y-1.5 text-foreground/90">
                  {data.technical_trace.engine_reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Simple Human Explanation */}
          <div className="p-6 rounded-2xl border border-foreground/10 bg-background flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h4 className="text-lg font-serif font-semibold text-foreground">
                Why does this matter in trenches?
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Standard infrastructure relies on: <strong>Wait → Observe → Submit</strong>. <br />
                Celor transforms the sniper pipeline into: <strong>Observe earlier → Understand state → Decide → Route</strong>.
              </p>
              <div className="text-xs font-serif italic text-foreground pt-1">
                &ldquo;Celor does not try to become another sniper. <strong>Celor gives snipers better infrastructure.</strong>&rdquo;
              </div>
            </div>

            <Button
              onClick={handleStartRace}
              className="h-11 px-6 rounded-full bg-foreground text-background font-mono text-xs font-semibold shrink-0"
            >
              RACE AGAIN
            </Button>
          </div>

        </div>
      )}

    </div>
  );
}

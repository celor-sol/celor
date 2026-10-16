'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  RotateCcw, 
  Play, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Flame, 
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export function SpeedBattle() {
  const [isRacing, setIsRacing] = useState(false);
  const [raceFinished, setRaceFinished] = useState(false);
  const [celorElapsed, setCelorElapsed] = useState(0);
  const [legacyElapsed, setLegacyElapsed] = useState(0);
  const [celorProgress, setCelorProgress] = useState(0);
  const [legacyProgress, setLegacyProgress] = useState(0);
  const [legacyLockout, setLegacyLockout] = useState(0);

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Celor targets 150ms finality (simulated visually scaled to ~1.2s so humans can see it)
  // Legacy targets 12,800ms (scaled to ~6.4s for compelling side-by-side demonstration)
  const VISUAL_CELOR_DURATION = 1200; // ms
  const VISUAL_LEGACY_DURATION = 6400; // ms

  const startRace = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsRacing(true);
    setRaceFinished(false);
    setCelorElapsed(0);
    setLegacyElapsed(0);
    setCelorProgress(0);
    setLegacyProgress(0);
    setLegacyLockout(0);
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = now - startTimeRef.current;

      // Celor progress (completes fast)
      if (delta <= VISUAL_CELOR_DURATION) {
        const ratio = delta / VISUAL_CELOR_DURATION;
        setCelorProgress(ratio * 100);
        // Map visual delta to real-world target (0 -> 150ms)
        setCelorElapsed(Math.round(ratio * 150));
      } else {
        setCelorProgress(100);
        setCelorElapsed(150);
      }

      // Legacy progress (takes longer, progressive 32 lockouts)
      if (delta <= VISUAL_LEGACY_DURATION) {
        const legacyRatio = delta / VISUAL_LEGACY_DURATION;
        setLegacyProgress(legacyRatio * 100);
        // Map visual delta to real-world target (0 -> 12,800ms)
        setLegacyElapsed(Math.round(legacyRatio * 12800));
        setLegacyLockout(Math.min(32, Math.floor(legacyRatio * 32)));
      } else {
        setLegacyProgress(100);
        setLegacyElapsed(12800);
        setLegacyLockout(32);
        setIsRacing(false);
        setRaceFinished(true);
        return;
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);
  };

  const resetRace = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setIsRacing(false);
    setRaceFinished(false);
    setCelorElapsed(0);
    setLegacyElapsed(0);
    setCelorProgress(0);
    setLegacyProgress(0);
    setLegacyLockout(0);
  };

  useEffect(() => {
    // Auto-run once on load for immediate punchy visual impression
    const timer = setTimeout(() => {
      startRace();
    }, 600);
    return () => {
      clearTimeout(timer);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div className="relative rounded-3xl border border-foreground/15 bg-background/80 backdrop-blur-2xl p-6 sm:p-8 lg:p-10 shadow-2xl overflow-hidden">
      {/* Background kinetic glow */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      {/* Header with Title & Action Controls */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-foreground/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>Interactive Live Race</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-sans font-bold tracking-tight text-foreground">
            Head-to-Head: <span className="text-emerald-400">200ms Alpenglow</span> vs <span className="text-muted-foreground">Legacy 400ms</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Watch a simulated transaction race through both consensus architectures in real-time. See why Alpenglow renders legacy RPC bots obsolete.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={startRace}
            disabled={isRacing}
            className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans font-semibold px-6 py-2.5 rounded-full shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Play className={`w-4 h-4 ${isRacing ? 'animate-spin' : 'fill-current'}`} />
            <span>{isRacing ? 'Racing...' : raceFinished ? 'Race Again' : 'Trigger Race'}</span>
          </Button>

          <Button
            onClick={resetRace}
            variant="outline"
            className="border-foreground/20 hover:bg-foreground/5 rounded-full px-4 py-2.5"
            title="Reset Race"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* The Dual Race Tracks */}
      <div className="relative z-10 py-8 space-y-8">
        {/* Track 1: CELOR ALPENGLOW (THE WINNER) */}
        <div className="relative p-5 sm:p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] shadow-inner transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
              <span className="font-mono font-bold text-sm sm:text-base text-emerald-400">
                CELOR ALPENGLOW VOTOR (SIMD-0525 + SIMD-0326)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                FAST PATH 80% STAKE
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-muted-foreground">Settlement Time:</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                {celorElapsed}ms
              </span>
              <span className="text-[11px] text-emerald-500 font-semibold uppercase">
                {celorProgress >= 100 ? '✓ NOTARIZED' : 'STREAMING'}
              </span>
            </div>
          </div>

          {/* Kinetic Track */}
          <div className="relative h-10 w-full bg-zinc-950/80 rounded-xl overflow-hidden border border-emerald-500/20 p-1">
            {/* Guide markers */}
            <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none opacity-20 text-[9px] font-mono text-zinc-400">
              <span>0ms Ingest</span>
              <span>50ms Deshred</span>
              <span>100ms Candidate Bank</span>
              <span>150ms BLS Certificate</span>
            </div>

            {/* Glowing Laser Progress Bar */}
            <div
              className="h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-teal-300 rounded-lg transition-all duration-75 relative shadow-[0_0_20px_rgba(16,185,129,0.6)]"
              style={{ width: `${celorProgress}%` }}
            >
              {celorProgress > 5 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_15px_#fff] animate-pulse" />
              )}
            </div>
          </div>

          {/* Dynamic Milestones */}
          <div className="mt-3 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              200ms Dynamic Slot Window
            </span>
            <span>Parent Switch Guard: <strong className="text-emerald-400">0.67µs Invalidation</strong></span>
            <span>Consensus State: <strong className="text-foreground">{celorProgress >= 100 ? 'CRYPTOGRAPHICALLY FINALIZED' : 'PROCESSING'}</strong></span>
          </div>
        </div>

        {/* Track 2: LEGACY SOLANA (TOWERBFT) */}
        <div className="relative p-5 sm:p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.01] transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="font-mono font-medium text-sm sm:text-base text-foreground/80">
                LEGACY SOLANA (400ms SLOTS + TOWERBFT)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                32 ON-CHAIN LOCKOUTS
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-muted-foreground">Settlement Time:</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-zinc-400">
                {legacyElapsed >= 1000 ? `${(legacyElapsed / 1000).toFixed(1)}s` : `${legacyElapsed}ms`}
              </span>
              <span className="text-[11px] text-amber-500 uppercase">
                {legacyProgress >= 100 ? 'ROOTED' : `LOCKOUT ${legacyLockout}/32`}
              </span>
            </div>
          </div>

          {/* Kinetic Track */}
          <div className="relative h-10 w-full bg-zinc-950/80 rounded-xl overflow-hidden border border-foreground/10 p-1">
            {/* Guide markers */}
            <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none opacity-20 text-[9px] font-mono text-zinc-400">
              <span>0s Ingest</span>
              <span>~3.2s 8 Lockouts</span>
              <span>~6.4s 16 Lockouts</span>
              <span>~12.8s Root Commitment</span>
            </div>

            {/* Slow Crawl Bar */}
            <div
              className="h-full bg-gradient-to-r from-zinc-700 via-amber-600 to-amber-400 rounded-lg transition-all duration-75 relative opacity-80"
              style={{ width: `${legacyProgress}%` }}
            >
              {legacyProgress > 2 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              )}
            </div>
          </div>

          {/* Dynamic Milestones */}
          <div className="mt-3 flex flex-wrap items-center justify-between text-xs font-mono text-muted-foreground">
            <span className="flex items-center gap-1.5 text-amber-500">
              <Clock className="w-3.5 h-3.5" />
              400ms Historic Slot Interval
            </span>
            <span>RPC WebSocket Lag: <strong className="text-rose-400">~1,200ms buffered</strong></span>
            <span>Reorg Vulnerability: <strong className="text-amber-400">{legacyProgress < 100 ? 'UNNOTARIZED UNTIL ROOT' : 'COMMITTED'}</strong></span>
          </div>
        </div>
      </div>

      {/* Delta Callout Box */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-1">
            Settlement Acceleration
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-bold text-foreground flex items-center gap-2">
            <span>85x Faster</span>
            <Flame className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            150ms BLS certificate vs 12,800ms 32-lockout progressive root.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5">
          <div className="text-xs font-mono text-sky-400 uppercase tracking-wider mb-1">
            Leader Tenure Window
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-bold text-foreground">
            ~800ms
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            4 slots × 200ms target cadence. 50% tighter execution boundaries.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
          <div className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-1">
            Celor Normalization Speed
          </div>
          <div className="text-2xl sm:text-3xl font-sans font-bold text-foreground">
            0.67 µs
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            In-memory Rust pipeline. Faster than any commercial JSON-RPC.
          </p>
        </div>
      </div>
    </div>
  );
}

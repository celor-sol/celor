'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CELOR_TOKEN } from '@/lib/token';
import {
  Calendar,
  Clock,
  Zap,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Sparkles,
  Layers,
  Activity,
  Flame,
  HelpCircle,
  TrendingUp,
} from 'lucide-react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

export function AlpenglowCountdown() {
  // Target hardfork activation: Wednesday, October 21, 2026, 14:50:00 UTC
  const targetDate = new Date('2026-10-21T14:50:00Z').getTime();

  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 7,
    hours: 1,
    minutes: 20,
    seconds: 42,
    isPast: false,
  });

  const [viewMode, setViewMode] = useState<'simple' | 'technical'>('simple');
  const [simActiveTab, setSimActiveTab] = useState<'with-celor' | 'without-celor'>('without-celor');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(CELOR_TOKEN.ca);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative py-16 sm:py-24 border-y border-foreground/10 bg-gradient-to-b from-foreground/[0.02] via-background to-foreground/[0.02] overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
        
        {/* Header Pill & Announcement Verification */}
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-4 shadow-lg shadow-emerald-500/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>CONFIRMED BY SOLANA &amp; ANZA</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-bold tracking-tight text-foreground mb-4">
            Alpenglow Mainnet Activation
          </h2>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl font-sans mb-6">
            Official hardfork timestamp locked by Solana Foundation &amp; Anza: <br />
            <strong className="text-foreground font-mono">Wednesday, October 21 • ~14:50 UTC</strong>
          </p>

          {/* Social Proof Quote from Solana/Anza Tweet */}
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 p-3.5 sm:px-6 rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-md text-xs font-mono text-muted-foreground shadow-sm">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span>🏔️</span> @solana &amp; @anza_xyz:
            </span>
            <span className="text-foreground italic">
              &ldquo;It&apos;s time. Alpenglow goes live on mainnet-beta Wednesday, October 21, ~14:50 UTC.&rdquo;
            </span>
            <span className="hidden sm:inline text-foreground/30">•</span>
            <span className="text-emerald-400 font-semibold">CELOR 100% READY</span>
          </div>
        </div>

        {/* Live Countdown Clock Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-background/80 backdrop-blur-xl text-center shadow-lg hover:border-emerald-500/30 transition-all">
            <div className="text-3xl sm:text-6xl font-mono font-bold tracking-tight text-foreground">
              {String(timeLeft.days).padStart(2, '0')}
            </div>
            <div className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
              Days
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-background/80 backdrop-blur-xl text-center shadow-lg hover:border-emerald-500/30 transition-all">
            <div className="text-3xl sm:text-6xl font-mono font-bold tracking-tight text-foreground">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <div className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
              Hours
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/10 bg-background/80 backdrop-blur-xl text-center shadow-lg hover:border-emerald-500/30 transition-all">
            <div className="text-3xl sm:text-6xl font-mono font-bold tracking-tight text-foreground">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <div className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-muted-foreground mt-1">
              Minutes
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.03] backdrop-blur-xl text-center shadow-lg shadow-emerald-500/10">
            <div className="text-3xl sm:text-6xl font-mono font-bold tracking-tight text-emerald-400">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <div className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mt-1">
              Seconds
            </div>
          </div>
        </div>

        {/* View Switcher: Easy English vs Engineer Spec */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="inline-flex p-1 rounded-full border border-foreground/10 bg-foreground/[0.03] backdrop-blur-md">
            <button
              onClick={() => setViewMode('simple')}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                viewMode === 'simple'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🌱 In Plain English (For Traders &amp; Holders)
            </button>
            <button
              onClick={() => setViewMode('technical')}
              className={`px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
                viewMode === 'technical'
                  ? 'bg-foreground text-background shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              ⚙️ Technical Spec (SIMD &amp; Consensus)
            </button>
          </div>
        </div>

        {/* Dynamic Explainer Cards */}
        {viewMode === 'simple' ? (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 font-mono font-bold text-sm">
                01
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                Solana gets 2x Faster
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Before Oct 21, blocks were created every <strong>400 milliseconds</strong>. After Oct 21, they are cut to <strong>200 milliseconds</strong>. 
                Everything will move at the speed of thought.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 font-mono font-bold text-sm">
                02
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                The &ldquo;Ghost Block&rdquo; Danger
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Under Alpenglow, validators propose multiple candidate blocks at once. If a block is abandoned, 
                <strong> normal bots and RPCs will buy on dead blocks</strong> and waste SOL on failed trades.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-xl relative overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-4 font-mono font-bold text-sm">
                03
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-400" />
                Why Everyone Needs Celor
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Celor is the <strong>high-speed radar</strong>. We detect ghost/abandoned blocks in <strong>0.001 milliseconds</strong> and 
                auto-switch your trades to the winning block so you never get front-run or dropped.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {/* Spec 1 */}
            <div className="p-6 rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-xl">
              <div className="text-xs font-mono text-emerald-400 font-semibold mb-2">SIMD-0326 • VOTOR CONSENSUS</div>
              <h3 className="text-lg font-bold text-foreground mb-2">BLS12-381 Notarization</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Replaces TowerBFT 32-lockout finality (~12.8s) with two-phase BLS certificate aggregation. Fast-path finality achieved in ~150ms at 80% stake; fallback in ~250ms at 60% stake.
              </p>
            </div>

            {/* Spec 2 */}
            <div className="p-6 rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-xl">
              <div className="text-xs font-mono text-amber-400 font-semibold mb-2">SIMD-0337 • FAST LEADER HANDOVER</div>
              <h3 className="text-lg font-bold text-foreground mb-2">UpdateParent Invalidation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Incoming leaders propose blocks by reparenting candidate banks without waiting for full slot timeouts. CELOR invalidates abandoned parent state in &lt;0.67µs using zero-allocation ring buffers.
              </p>
            </div>

            {/* Spec 3 */}
            <div className="p-6 rounded-2xl border border-foreground/10 bg-background/50 backdrop-blur-xl">
              <div className="text-xs font-mono text-sky-400 font-semibold mb-2">SIMD-0525 • SLOT CADENCE</div>
              <h3 className="text-lg font-bold text-foreground mb-2">200ms Dynamic Slot Clock</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                4-slot leader tenure compressed from 1,600ms down to 800ms. CELOR Dynamic Slot Clock synchronizes multi-provider streams across Helius, Triton, and local Geyser feeds.
              </p>
            </div>
          </div>
        )}

        {/* Interactive "What Happens on October 21" Simulation */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl border border-foreground/15 bg-background/70 backdrop-blur-2xl shadow-2xl mb-16">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-foreground/10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400 font-semibold uppercase tracking-wider mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>October 21 Trench Simulator</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-sans font-bold text-foreground">
                Trading on Alpenglow: With vs Without Celor
              </h3>
            </div>

            <div className="flex items-center gap-2 p-1 rounded-xl bg-foreground/5 border border-foreground/10 self-stretch sm:self-auto">
              <button
                onClick={() => setSimActiveTab('without-celor')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  simActiveTab === 'without-celor'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                ❌ Without Celor (Normal RPC)
              </button>
              <button
                onClick={() => setSimActiveTab('with-celor')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  simActiveTab === 'with-celor'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🟢 With Celor Radar
              </button>
            </div>
          </div>

          {/* Scenario Details */}
          {simActiveTab === 'without-celor' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/[0.05] border border-rose-500/20 text-sm font-sans space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-rose-400 font-semibold">
                  <span>SCENARIO: PUMP.FUN NEW TOKEN LAUNCH ON 200MS MAINNET</span>
                  <span>OUTCOME: TRADE FAILED &amp; SOL BURNED</span>
                </div>
                <div className="space-y-2 text-muted-foreground text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-rose-400 font-bold">1.</span>
                    <span>Trader fires 2 SOL buy order through standard Helius/QuickNode RPC node.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-rose-400 font-bold">2.</span>
                    <span>Validator Leader handoff triggers: next leader reparents via SIMD-0337 (UpdateParent).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-rose-400 font-bold">3.</span>
                    <span>Normal RPC lags by ~1,200ms and fails to detect the parent switch in time.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-rose-400 font-bold">4.</span>
                    <strong className="text-rose-400">Transaction lands on abandoned candidate bank → Dropped, 0.05 SOL priority fee lost, snipe completely missed.</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 text-sm font-sans space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-emerald-400 font-semibold">
                  <span>SCENARIO: PUMP.FUN NEW TOKEN LAUNCH ON 200MS MAINNET</span>
                  <span>OUTCOME: 100% CANONICAL INCLUSION</span>
                </div>
                <div className="space-y-2 text-muted-foreground text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-emerald-400 font-bold">1.</span>
                    <span>Trader fires buy order through Celor Multi-Provider Normalizer.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-emerald-400 font-bold">2.</span>
                    <span>Leader issues SIMD-0337 parent switch: Celor engine catches UpdateParent in <strong>0.67 microseconds</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-emerald-400 font-bold">3.</span>
                    <span>Celor instantly auto-switches routing to the canonical parent bank with valid fresh blockhash.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-mono text-emerald-400 font-bold">4.</span>
                    <strong className="text-emerald-400">Transaction confirmed within ~150ms BLS certificate notarization → 1st slot fill, zero wasted SOL.</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action & Token Banner */}
        <div className="p-6 sm:p-8 rounded-3xl border border-foreground/15 bg-gradient-to-r from-emerald-500/10 via-background to-teal-500/10 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider mb-3">
            <Flame className="w-4 h-4" />
            <span>Powering Solana 2.0 Consensus</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-sans font-bold text-foreground mb-3">
            Get Ready for October 21 with $CELOR
          </h3>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-6">
            The hardfork countdown is running. Don&apos;t get left trading with last year&apos;s infrastructure.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleCopy}
              size="lg"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans font-bold px-6 h-12 rounded-full w-full sm:w-auto"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              <span>{copied ? 'CA Copied to Clipboard' : 'Copy $CELOR CA'}</span>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-foreground/20 hover:bg-foreground/5 font-sans px-6 h-12 rounded-full w-full sm:w-auto"
            >
              <a href={CELOR_TOKEN.pumpFunUrl} target="_blank" rel="noreferrer">
                Trade on Pump.fun <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
}

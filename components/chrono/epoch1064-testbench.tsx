'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CELOR_TOKEN } from '@/lib/token';
import {
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  ShieldCheck,
  Activity,
  Layers,
  ArrowRight,
  Flame,
  Copy,
  Check,
  Server,
  FileCode,
  Gauge,
  Sparkles,
} from 'lucide-react';

export function Epoch1064Testbench() {
  // Epoch Mode: 'PRE_FORK' (Epoch 1063 - TowerBFT) | 'POST_FORK' (Epoch 1064 - Alpenglow Votor)
  const [epochMode, setEpochMode] = useState<'PRE_FORK' | 'POST_FORK'>('POST_FORK');

  // Network Offline Stake Slider (0% to 50%)
  const [offlineStake, setOfflineStake] = useState<number>(12);

  // Live Transaction Flight Simulation State
  const [txFlightState, setTxFlightState] = useState<'IDLE' | 'FLIGHT' | 'CONFIRMED'>('IDLE');
  const [flightElapsedMs, setFlightElapsedMs] = useState<number>(0);
  const [flightStage, setFlightStage] = useState<string>('Ready to dispatch');
  const [txPreset, setTxPreset] = useState<'pump' | 'raydium' | 'transfer'>('pump');
  const [copied, setCopied] = useState<boolean>(false);

  const flightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate Consensus State based on Offline Stake
  const activeStake = 100 - offlineStake;
  let consensusPath: 'FAST_PATH' | 'FALLBACK_PATH' | 'STALLED' = 'FAST_PATH';
  let targetFinalityMs = 148;

  if (activeStake >= 80) {
    consensusPath = 'FAST_PATH';
    targetFinalityMs = Math.round(135 + (100 - activeStake) * 1.5);
  } else if (activeStake >= 60) {
    consensusPath = 'FALLBACK_PATH';
    targetFinalityMs = Math.round(210 + (80 - activeStake) * 2.5);
  } else {
    consensusPath = 'STALLED';
    targetFinalityMs = 0;
  }

  // Handle Fire Simulated Transaction
  const handleFireTx = () => {
    if (txFlightState === 'FLIGHT') return;

    if (flightTimerRef.current) clearInterval(flightTimerRef.current);
    setTxFlightState('FLIGHT');
    setFlightElapsedMs(0);
    setFlightStage('Signing & submitting to leader QUIC port...');

    const startTime = performance.now();
    const finality = epochMode === 'POST_FORK' ? targetFinalityMs : 12800;

    flightTimerRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = Math.round(now - startTime);
      setFlightElapsedMs(elapsed);

      if (epochMode === 'POST_FORK') {
        if (elapsed < 30) {
          setFlightStage('Turbine shred dispatched to 200ms candidate bank...');
        } else if (elapsed < 80) {
          setFlightStage('Candidate Bank executed. Disseminating Votor votes...');
        } else if (elapsed < 120) {
          setFlightStage(`Aggregating BLS12-381 signatures (${activeStake.toFixed(1)}% stake reached)...`);
        } else if (elapsed >= finality) {
          clearInterval(flightTimerRef.current!);
          setFlightElapsedMs(finality);
          setFlightStage('Votor Certificate notarized! Finalized in ' + finality + 'ms');
          setTxFlightState('CONFIRMED');
        }
      } else {
        // Legacy TowerBFT
        if (elapsed < 400) {
          setFlightStage('Included in 400ms block. Waiting for TowerBFT lockouts...');
        } else if (elapsed < 3200) {
          setFlightStage(`Progressive lockout level: ${Math.min(32, Math.floor(elapsed / 400))}/32 slots...`);
        } else if (elapsed >= 4000) {
          // Accelerate demo for legacy
          clearInterval(flightTimerRef.current!);
          setFlightElapsedMs(12800);
          setFlightStage('Rooted after 32 progressive lockouts (~12.8s)');
          setTxFlightState('CONFIRMED');
        }
      }
    }, 20);
  };

  const handleResetTx = () => {
    if (flightTimerRef.current) clearInterval(flightTimerRef.current);
    setTxFlightState('IDLE');
    setFlightElapsedMs(0);
    setFlightStage('Ready to dispatch');
  };

  useEffect(() => {
    return () => {
      if (flightTimerRef.current) clearInterval(flightTimerRef.current);
    };
  }, []);

  const handleCopyCA = () => {
    navigator.clipboard.writeText(CELOR_TOKEN.ca);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="epoch1064" className="py-16 sm:py-24 border-y border-foreground/10 bg-foreground/[0.015] relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-500/5 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">

        {/* Header Pill & Headline */}
        <div className="text-center max-w-4xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-4 shadow-lg shadow-emerald-500/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Epoch 1064 Interactive Test Bench</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-sans font-bold tracking-tight text-foreground mb-4">
            Try Solana 2.0 Before Mainnet
          </h2>

          <p className="text-base sm:text-lg text-muted-foreground font-sans max-w-2xl mx-auto leading-relaxed">
            On October 21 at <strong className="text-foreground">Epoch 1064 (~14:50 UTC)</strong>, Solana replaces TowerBFT with off-chain Votor BLS certificates on Agave 4.3.0. 
            Test the hardfork cutover live below.
          </p>

          {/* Hardfork Cutover Toggle */}
          <div className="flex items-center justify-center gap-2 mt-8">
            <div className="inline-flex p-1.5 rounded-2xl border border-foreground/15 bg-background/80 backdrop-blur-xl shadow-lg">
              <button
                onClick={() => {
                  setEpochMode('PRE_FORK');
                  handleResetTx();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold transition-all cursor-pointer ${
                  epochMode === 'PRE_FORK'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Epoch 1063 (Legacy TowerBFT)
              </button>
              <button
                onClick={() => {
                  setEpochMode('POST_FORK');
                  handleResetTx();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-mono font-semibold transition-all cursor-pointer flex items-center gap-2 ${
                  epochMode === 'POST_FORK'
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>Epoch 1064 (Alpenglow Votor)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard 3-Column Test Grid */}
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 mb-12 sm:mb-16">

          {/* Card 1: Interactive Transaction Flight Engine (Left 7 Cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl border border-foreground/15 bg-background/70 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-foreground/10 mb-6">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Consensus Transaction Flight</span>
                </div>
                <div className="text-xs font-mono text-muted-foreground">
                  Engine: <strong className="text-foreground">{epochMode === 'POST_FORK' ? 'Votor (Agave 4.3.0)' : 'TowerBFT (Legacy)'}</strong>
                </div>
              </div>

              {/* Transaction Presets */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-xs font-mono text-muted-foreground mr-2">Preset:</span>
                <button
                  onClick={() => setTxPreset('pump')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    txPreset === 'pump'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'bg-foreground/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pump.fun 5 SOL Buy
                </button>
                <button
                  onClick={() => setTxPreset('raydium')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    txPreset === 'raydium'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'bg-foreground/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Raydium Arbitrage
                </button>
                <button
                  onClick={() => setTxPreset('transfer')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                    txPreset === 'transfer'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                      : 'bg-foreground/5 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Standard Transfer
                </button>
              </div>

              {/* Latency Digital Meter */}
              <div className="p-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02] mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    Monotonic Latency Elapsed
                  </div>
                  <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-foreground flex items-baseline gap-2">
                    <span className={epochMode === 'POST_FORK' ? 'text-emerald-400' : 'text-amber-400'}>
                      {flightElapsedMs}
                    </span>
                    <span className="text-lg text-muted-foreground font-normal">ms</span>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-foreground/10 sm:pl-6">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
                    Canonical Target
                  </div>
                  <div className="text-lg sm:text-xl font-mono font-bold text-foreground">
                    {epochMode === 'POST_FORK' ? `~${targetFinalityMs}ms BLS Cert` : '~12,800ms Root'}
                  </div>
                  <div className="text-xs font-mono text-emerald-400">
                    {epochMode === 'POST_FORK' ? '99% Latency Reduction' : 'Baseline 32 Lockouts'}
                  </div>
                </div>
              </div>

              {/* Live Stage Progress Indicator */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>CONSENSUS PIPELINE</span>
                  <span className="text-foreground font-semibold truncate max-w-xs">{flightStage}</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-foreground/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-75 ${
                      txFlightState === 'CONFIRMED'
                        ? 'bg-emerald-400'
                        : epochMode === 'POST_FORK'
                        ? 'bg-emerald-500'
                        : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${
                        txFlightState === 'CONFIRMED'
                          ? 100
                          : epochMode === 'POST_FORK'
                          ? Math.min(100, Math.round((flightElapsedMs / targetFinalityMs) * 100))
                          : Math.min(100, Math.round((flightElapsedMs / 4000) * 100))
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-foreground/10">
              <Button
                onClick={handleFireTx}
                disabled={txFlightState === 'FLIGHT'}
                size="lg"
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans font-bold px-6 h-12 rounded-full shadow-lg shadow-emerald-500/20"
              >
                <Zap className="w-4 h-4 mr-2 fill-current" />
                <span>{txFlightState === 'FLIGHT' ? 'Flying in Consensus...' : 'Fire Transaction'}</span>
              </Button>

              <Button
                onClick={handleResetTx}
                size="lg"
                variant="outline"
                className="border-foreground/15 hover:bg-foreground/5 h-12 rounded-full px-5 text-xs font-mono"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                <span>Reset</span>
              </Button>

              {txFlightState === 'CONFIRMED' && (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-semibold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Notarization Certified</span>
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Off-Chain Votor & Byzantine Fault Tolerance Tester (Right 5 Cols) */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl border border-foreground/15 bg-background/70 backdrop-blur-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-foreground/10 mb-6">
                <div className="flex items-center gap-2 text-xs font-mono text-sky-400 font-bold uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Fault-Tolerance Stress Lab</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  40% RESILIENCE
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Simulate Offline / Stalled Stake:</span>
                  <span className="text-foreground font-bold text-sm">{offlineStake}% OFFLINE</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={offlineStake}
                  onChange={(e) => setOfflineStake(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-2 bg-foreground/10 rounded-lg cursor-pointer"
                />

                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>0% (Perfect)</span>
                  <span className="text-emerald-400">20% (Fast Path Limit)</span>
                  <span className="text-amber-400">40% (Fallback Limit)</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Dynamic Consensus Path Evaluation */}
              <div className="p-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] space-y-3 mb-6">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">ACTIVE VOTING STAKE:</span>
                  <span className="text-emerald-400 font-bold">{activeStake.toFixed(1)}%</span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-muted-foreground">CONSENSUS PATHWAY:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      consensusPath === 'FAST_PATH'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : consensusPath === 'FALLBACK_PATH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {consensusPath === 'FAST_PATH'
                      ? '⚡ FAST PATH (≥80%)'
                      : consensusPath === 'FALLBACK_PATH'
                      ? '🛡️ FALLBACK PATH (≥60%)'
                      : '🔴 HALTED (<60%)'}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-foreground/10">
                  {consensusPath === 'FAST_PATH'
                    ? '80%+ validator stake reached. Off-chain BLS aggregated certificate generated in ~150ms.'
                    : consensusPath === 'FALLBACK_PATH'
                    ? 'Between 60% and 80% stake reached. Fallback certificate notarization maintains safety even under heavy network partitions.'
                    : 'Less than 60% stake reachable. Safety threshold breached.'}
                </p>
              </div>
            </div>

            {/* Agave 4.3.0 Qualification Badge */}
            <div className="p-3.5 rounded-xl border border-foreground/10 bg-background flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Agave 4.3.0 Client Qualification</span>
              </span>
              <span className="text-emerald-400 font-bold">CERTIFIED</span>
            </div>
          </div>
        </div>

        {/* The "Explorer TPS Illusion" Explainer Card */}
        <div className="p-6 sm:p-8 rounded-3xl border border-foreground/15 bg-background/80 backdrop-blur-2xl shadow-xl mb-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-foreground/10">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono text-amber-400 font-semibold uppercase tracking-wider mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>The Explorer TPS Metric Shift</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-sans font-bold text-foreground">
                Why Reported Explorer TPS Will Drop on October 21
              </h3>
            </div>
            <span className="text-xs font-mono text-muted-foreground px-3 py-1 rounded-full border border-foreground/10">
              Votes Moved Off-Chain
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl border border-rose-500/20 bg-rose-500/[0.03]">
              <div className="text-xs font-mono text-rose-400 font-semibold mb-2">
                LEGACY SOLANA (TOWERBFT)
              </div>
              <div className="text-3xl font-mono font-bold text-foreground mb-2">
                ~2,800 <span className="text-sm font-normal text-muted-foreground">Reported TPS</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground font-mono">
                <div>• 2,200 TPS was on-chain vote transactions</div>
                <div>• Only ~600 TPS was actual user transactions</div>
                <div>• Vote spam bloated state and delayed real trades</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04]">
              <div className="text-xs font-mono text-emerald-400 font-semibold mb-2">
                SOLANA 2.0 (ALPENGLOW VOTOR)
              </div>
              <div className="text-3xl font-mono font-bold text-emerald-400 mb-2">
                ~600 <span className="text-sm font-normal text-muted-foreground">Clean Real TPS</span>
              </div>
              <div className="space-y-1 text-xs text-muted-foreground font-mono">
                <div>• 100% of block space dedicated to actual user transactions</div>
                <div>• Votes bundled into off-chain BLS certificates</div>
                <div>• 99% faster finality with zero vote congestion</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="text-center max-w-2xl mx-auto pt-4">
          <p className="text-xs sm:text-sm font-mono text-muted-foreground mb-4">
            Celor is the only infrastructure that normalizes Votor off-chain certificates and multi-candidate banks in real time.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={handleCopyCA}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans font-bold px-5 h-10 rounded-full text-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              <span>{copied ? 'CA Copied' : 'Copy $CELOR CA'}</span>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-foreground/15 hover:bg-foreground/5 h-10 rounded-full px-5 text-xs font-sans"
            >
              <a href={CELOR_TOKEN.pumpFunUrl} target="_blank" rel="noreferrer">
                Trade on Pump.fun →
              </a>
            </Button>
          </div>
        </div>

      </div>
    </section>
  );
}

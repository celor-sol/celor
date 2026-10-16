'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { SpeedBattle } from '@/components/chrono/speed/speed-battle';
import { TrenchVisualizer } from '@/components/chrono/speed/trench-visualizer';
import { GlobalSpeedLadder } from '@/components/chrono/speed/global-speed-ladder';
import { AlpenglowCountdown } from '@/components/chrono/alpenglow-countdown';
import { Epoch1064Testbench } from '@/components/chrono/epoch1064-testbench';
import { useChrono } from '@/hooks/useChrono';
import { Button } from '@/components/ui/button';
import { CELOR_TOKEN } from '@/lib/token';
import { 
  Zap, 
  ArrowRight, 
  Copy, 
  Check, 
  ExternalLink, 
  Flame, 
  ShieldCheck, 
  Sparkles, 
  Layers,
  Activity,
  Gauge
} from 'lucide-react';
import Link from 'next/link';

export default function SpeedShockwavePage() {
  const {
    slotProgress,
    leaderInfo,
    networkStatus,
    switchCluster,
  } = useChrono();

  const [copied, setCopied] = useState(false);
  const [pulseDegree, setPulseDegree] = useState(0);

  // 200ms continuous sweep animation for kinetic tachometer
  useEffect(() => {
    let animationFrame: number;
    let start = performance.now();
    const duration = slotProgress.targetSlotDurationMs || 200;

    const animate = (now: number) => {
      const elapsed = (now - start) % duration;
      const progress = elapsed / duration;
      setPulseDegree(progress * 360);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [slotProgress.targetSlotDurationMs]);

  const handleCopy = () => {
    navigator.clipboard.writeText(CELOR_TOKEN.ca);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay bg-background text-foreground">
      {/* Navigation */}
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-24 overflow-hidden border-b border-foreground/10">
        {/* Radial Background Atmosphere */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] sm:w-[900px] sm:h-[900px] bg-gradient-to-b from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
            {/* Left: Headline & Bullish Proposition */}
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-6">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SIMD-0525 &amp; Alpenglow Live Migration</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sans font-extrabold tracking-tight leading-[0.98] sm:leading-[0.95] text-foreground mb-6">
                Solana 2.0: <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400">
                  The 200ms Shockwave
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl font-sans">
                Canonical slot duration was just halved from 400ms down to a <strong>200ms target</strong>, and 12.8s TowerBFT root lockouts were crushed into <strong>~150ms BLS certificates</strong>. 
                CELOR is the first-mover infrastructure built to navigate the new consensus reality.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-8">
                <Button
                  asChild
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans font-semibold px-6 sm:px-8 h-12 sm:h-14 rounded-full text-sm sm:text-base shadow-xl shadow-emerald-500/20"
                >
                  <a href="#race">
                    Watch the Speed Battle
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-foreground/20 hover:bg-foreground/5 px-6 sm:px-8 h-12 sm:h-14 rounded-full text-sm sm:text-base"
                >
                  <Link href="/sniper">
                    Launch Trench Sniper →
                  </Link>
                </Button>

                <Button
                  onClick={handleCopy}
                  size="lg"
                  variant="ghost"
                  className="border border-foreground/10 hover:bg-foreground/5 rounded-full px-5 h-12 sm:h-14 text-xs sm:text-sm font-mono text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'CA Copied' : 'Copy $CELOR CA'}</span>
                </Button>
              </div>

              {/* Quick Feature Badges */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground pt-4 border-t border-foreground/10">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> 2x Network Throughput
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> 85x Faster Finality
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" /> 0.67µs Normalizer
                </span>
              </div>
            </div>

            {/* Right: Kinetic 200ms Tachometer Visualizer */}
            <div className="shrink-0 relative">
              <div className="relative w-72 h-72 sm:w-88 sm:h-88 lg:w-96 lg:h-96 rounded-full border border-foreground/10 bg-background/60 backdrop-blur-2xl p-6 flex flex-col items-center justify-center text-center shadow-2xl">
                {/* Rotating SVG Sweep Gauge */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    className="stroke-foreground/10"
                    strokeWidth="3"
                    fill="none"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="46%"
                    className="stroke-emerald-400"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="100 1000"
                    style={{
                      transformOrigin: 'center',
                      transform: `rotate(${pulseDegree}deg)`,
                      transition: 'transform 16ms linear',
                    }}
                  />
                </svg>

                <div className="relative z-10 space-y-1">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Gauge className="w-3 h-3" />
                    <span>200ms Cadence</span>
                  </div>

                  <div className="text-4xl sm:text-5xl font-mono font-bold tracking-tight text-foreground my-2">
                    {slotProgress.targetSlotDurationMs || 200}
                    <span className="text-lg text-muted-foreground font-normal">ms</span>
                  </div>

                  <div className="text-xs font-mono text-muted-foreground">
                    Current Live Slot
                  </div>
                  <div className="text-sm font-mono font-semibold text-emerald-400">
                    #{slotProgress.slot > 0 ? slotProgress.slot.toLocaleString() : '507,745,280'}
                  </div>

                  <div className="pt-3 border-t border-foreground/10 mt-2 text-[10px] font-mono text-muted-foreground space-y-0.5">
                    <div>Finality: <strong className="text-foreground">~150ms BLS Cert</strong></div>
                    <div>Leader Window: <strong className="text-foreground">~800ms (4 slots)</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Alpenglow Mainnet Activation Hub & Countdown */}
      <AlpenglowCountdown />

      {/* Epoch 1064 Interactive Hardfork Test Bench */}
      <Epoch1064Testbench />

      {/* Main Interactive Race Container */}
      <section id="race" className="py-16 sm:py-24 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        <SpeedBattle />
      </section>

      {/* Trench Breakdown (Real World Problems & Solutions) */}
      <section className="py-12 border-y border-foreground/10 bg-foreground/[0.01]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
          <TrenchVisualizer />
        </div>
      </section>

      {/* Macro Blockchain Speed Ladder */}
      <section className="py-16 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        <GlobalSpeedLadder />
      </section>

      {/* Official Token Contract Showcase */}
      <section className="py-16 sm:py-20 border-t border-foreground/10 bg-background relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-xs uppercase tracking-wider mb-4">
            <Flame className="w-3.5 h-3.5" />
            <span>Official Protocol Token</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-sans font-bold tracking-tight text-foreground mb-4">
            Back the Infrastructure of Solana 2.0
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-8 font-sans">
            As Solana migrates to Alpenglow and 200ms slots, $CELOR powers the decentralized consensus telemetry, candidate bank normalization, and sniper routing layer.
          </p>

          <div className="p-4 sm:p-6 rounded-2xl border border-foreground/15 bg-foreground/[0.02] backdrop-blur-xl max-w-2xl mx-auto mb-8">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-2">
              <span>MINT ADDRESS (PUMP.FUN VERIFIED)</span>
              <span className="text-emerald-400 font-semibold">$CELOR</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-background border border-foreground/10 font-mono text-xs sm:text-sm text-foreground break-all">
              <span>{CELOR_TOKEN.ca}</span>
              <Button
                onClick={handleCopy}
                size="sm"
                className="bg-foreground text-background hover:bg-foreground/90 shrink-0 font-sans text-xs px-4 rounded-lg"
              >
                {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-sans font-bold px-8 h-12 rounded-full">
              <a href={CELOR_TOKEN.pumpFunUrl} target="_blank" rel="noreferrer">
                Trade on Pump.fun <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-foreground/20 hover:bg-foreground/5 h-12 rounded-full px-8">
              <a href={CELOR_TOKEN.xUrl} target="_blank" rel="noreferrer">
                Follow @celorinfra on X <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <FooterSection />
    </main>
  );
}

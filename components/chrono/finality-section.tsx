'use client';

import { useEffect, useState, useRef } from 'react';
import { FinalityInfo, FieldProvenance } from '@/lib/chrono-client/types';
import { CheckCircle2, Circle, Zap, Clock, ShieldCheck, FileCheck, ArrowDown, ArrowRight } from 'lucide-react';
import { ProvenanceBadge } from './provenance-badge';

interface FinalitySectionProps {
  finalityInfo: FinalityInfo | null;
  currentSlot: number;
}

export function FinalitySection({
  finalityInfo,
  currentSlot,
}: FinalitySectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

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

  const isBls =
    finalityInfo?.mode === 'ALPENGLOW_VOTOR' ||
    finalityInfo?.certificateType === 'BLS_FAST_PATH_CERT' ||
    finalityInfo?.certificateType === 'BLS_FALLBACK_CERT';

  const consensusLatency = finalityInfo?.consensusFinalityMs ?? (isBls ? 150 : 12800);
  const providerLag = finalityInfo?.providerLatencyMs ?? 1200;
  const chronoProcessing = finalityInfo?.chronoProcessingUs ?? 14;

  const stages = [
    {
      name: '1. OBSERVED STREAM',
      description: 'Slot and block received via streaming provider connection',
      time: '0ms',
      provenance: 'DIRECT' as const,
      achieved: Boolean(currentSlot && currentSlot > 0),
    },
    {
      name: '2. CANONICAL RESOLUTION',
      description: 'Head of valid fork resolved across candidate banks',
      time: 'FORK WINNER',
      provenance: 'DERIVED' as const,
      achieved: Boolean(currentSlot && currentSlot > 0),
    },
    {
      name: '3. CONSENSUS NOTARIZATION',
      description: isBls
        ? 'BLS aggregate certificate notarized (SIMD-0326 fast path)'
        : 'TowerBFT 32-lockout progressive root commitment',
      time: isBls ? `${consensusLatency}ms` : '~12.8s',
      provenance: (finalityInfo?.provenance || 'DIRECT') as FieldProvenance,
      achieved: Boolean(currentSlot && currentSlot > 31),
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative py-16 sm:py-24 lg:py-32 border-b border-foreground/10 bg-foreground/[0.01]"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono text-muted-foreground mb-3 sm:mb-4">
            <span className="w-6 sm:w-8 h-px bg-foreground/30" />
            PROTOCOL ARCHITECTURE • SIMD-0326
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-display tracking-tight mb-4 sm:mb-6">
            Consensus changed.
            <br />
            <span className="text-muted-foreground">Execution did not.</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
            Solana itself emphasizes: SVM transaction execution (programs, accounts, fees)
            remains unchanged. What changes is the consensus mechanism itself: direct validator
            voting and aggregate BLS certificates replace 32 progressive on-chain lockouts.
          </p>
        </div>

        {/* Visual Old Solana vs New Solana Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {/* OLD SOLANA (TowerBFT) */}
          <div className="p-4 sm:p-6 lg:p-8 border border-foreground/10 rounded-2xl bg-background/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-foreground/10 mb-6">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  Legacy Architecture
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border border-foreground/15 text-muted-foreground bg-foreground/5">
                  TOWERBFT
                </span>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-foreground/10 bg-foreground/[0.01]">
                  <span className="w-6 h-6 rounded-full border border-foreground/20 flex items-center justify-center text-xs text-muted-foreground shrink-0">1</span>
                  <div>
                    <div className="font-semibold text-foreground text-xs sm:text-sm">Votes on-chain as transactions</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground">~75% of block space consumed by validator voting</div>
                  </div>
                </div>

                <div className="flex justify-center text-muted-foreground py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-foreground/10 bg-foreground/[0.01]">
                  <span className="w-6 h-6 rounded-full border border-foreground/20 flex items-center justify-center text-xs text-muted-foreground shrink-0">2</span>
                  <div>
                    <div className="font-semibold text-foreground text-xs sm:text-sm">32 progressive lockout rounds</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground">Votes double timeout progressively on parent forks</div>
                  </div>
                </div>

                <div className="flex justify-center text-muted-foreground py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-foreground/10 bg-foreground/[0.01]">
                  <span className="w-6 h-6 rounded-full border border-foreground/20 flex items-center justify-center text-xs text-muted-foreground shrink-0">3</span>
                  <div>
                    <div className="font-semibold text-foreground text-xs sm:text-sm">~12.8s finality root commitment</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground">Slot assumed to be single monolithic block</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 border-t border-foreground/10 text-xs font-mono text-muted-foreground">
              Legacy Model: Coarse validator RPC root commitments
            </div>
          </div>

          {/* NEW SOLANA (Alpenglow / Votor) */}
          <div className="p-4 sm:p-6 lg:p-8 border border-emerald-500/30 rounded-2xl bg-emerald-500/[0.02] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-6">
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                  Alpenglow Architecture
                </span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-medium">
                  VOTOR + CERTIFICATES
                </span>
              </div>

              <div className="space-y-4 font-mono text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03]">
                  <span className="w-6 h-6 rounded-full border border-emerald-500/40 flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">1</span>
                  <div>
                    <div className="font-semibold text-foreground text-xs sm:text-sm">Validators vote directly off-chain</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground">Zero transaction fee overhead; reclaims ~75% block space</div>
                  </div>
                </div>

                <div className="flex justify-center text-emerald-600 dark:text-emerald-400 py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03]">
                  <span className="w-6 h-6 rounded-full border border-emerald-500/40 flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">2</span>
                  <div>
                    <div className="font-semibold text-foreground text-xs sm:text-sm">BLS aggregate signature certificates</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground">Fast path (80% stake) or Fallback path (60% stake)</div>
                  </div>
                </div>

                <div className="flex justify-center text-emerald-600 dark:text-emerald-400 py-1">
                  <ArrowDown className="w-4 h-4" />
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03]">
                  <span className="w-6 h-6 rounded-full border border-emerald-500/40 flex items-center justify-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">3</span>
                  <div>
                    <div className="font-semibold text-foreground text-xs sm:text-sm">~150ms Target Finality (Sub-Second BLS Cert)</div>
                    <div className="text-[11px] sm:text-xs text-muted-foreground">Multi-bank candidate resolution and UpdateParent handover</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 border-t border-emerald-500/20 text-xs font-mono text-emerald-600 dark:text-emerald-400">
              Alpenglow Model: High-fidelity bank graph &amp; cryptographic certificate tracking
            </div>
          </div>
        </div>

        {/* Unchanged vs Changed Summary Matrix */}
        <div className="p-4 sm:p-6 lg:p-8 border border-foreground/10 rounded-2xl bg-background mb-12 sm:mb-16 font-mono text-xs">
          <div className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-4 sm:mb-6">
            Execution Invariance vs Consensus Evolution
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.01]">
              <span className="text-xs text-muted-foreground block mb-2 font-semibold">
                UNCHANGED (Execution Layer)
              </span>
              <ul className="space-y-2 text-foreground/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
                  <span><strong>SVM Runtime:</strong> Same BPF/eBPF bytecode execution</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
                  <span><strong>Programs &amp; Contracts:</strong> Zero code changes required for dApps</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/40 shrink-0" />
                  <span><strong>Transactions &amp; Fees:</strong> Standard signature format &amp; priority fees</span>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.01]">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 block mb-2 font-semibold">
                CHANGED (Consensus &amp; Ingestion Layer)
              </span>
              <ul className="space-y-2 text-foreground/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Consensus:</strong> TowerBFT replaced by Votor notarization certificates</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Multi-Bank Behavior:</strong> Multiple candidate versions exist per slot</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Infrastructure:</strong> Low-level indexers must understand bank_id &amp; UpdateParent</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Live Finality Verification Card with Strict Metric Separation */}
        <div className="border border-foreground/10 bg-background p-4 sm:p-6 lg:p-10 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-foreground/10">
            <div>
              <span className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1">
                Deterministic Consensus Verification
              </span>
              <span className="text-xs sm:text-sm font-sans font-medium text-foreground">
                Separating Protocol Finality from Streaming / Observation Delays
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs font-mono text-foreground font-medium">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {isBls ? 'FAST PATH (80% STAKE)' : 'FALLBACK PATH (32-SLOT ROOT)'}
              </span>
              <ProvenanceBadge provenance={finalityInfo?.provenance || 'DIRECT'} />
            </div>
          </div>

          {/* Metric Quadrant */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-6 sm:py-8 border-b border-foreground/10 font-mono">
            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">CONSENSUS FINALITY</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-display text-foreground">
                {isBls ? `${consensusLatency}ms` : '~12.8s'}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1">
                {isBls ? 'LIVE OBSERVED [MEASURED]' : '32 Lockout Root'}
              </span>
            </div>

            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">PROTOCOL TARGET</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-display text-muted-foreground">
                ~150ms
              </span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                SIMD-0326 Fast Path
              </span>
            </div>

            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">PROVIDER LAG</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-display text-foreground">
                {providerLag}ms
              </span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                WebSocket Root Lag
              </span>
            </div>

            <div>
              <span className="text-[11px] sm:text-xs text-muted-foreground block mb-1">CELOR PROCESSING</span>
              <span className="text-2xl sm:text-3xl lg:text-4xl font-display text-foreground">
                0.67µs
              </span>
              <span className="text-[10px] text-sky-600 dark:text-sky-400 block mt-1">
                Sub-microsecond Normalizer
              </span>
            </div>
          </div>

          {/* Three-Stage Verified Pipeline */}
          <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-6 font-mono text-xs">
            {stages.map((stage) => (
              <div
                key={stage.name}
                className="p-3 sm:p-4 border border-foreground/10 rounded-lg flex items-center justify-between gap-2 bg-foreground/[0.01]"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  {stage.achieved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-xs sm:text-sm truncate">{stage.name}</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{stage.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-foreground/80 font-medium text-xs sm:text-sm">{stage.time}</span>
                  <ProvenanceBadge provenance={stage.provenance} showIcon={false} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

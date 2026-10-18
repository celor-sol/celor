'use client';

import React, { useState } from 'react';
import { ShieldCheck, Zap, Flame, CheckCircle2, Copy, Check, Code2, Layers, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FeeTierData {
  address: string;
  isContested: boolean;
  contentionRate: number;
  totalSlotsAnalyzed: number;
  contestedSlots: number;
  uncontestedMin: number;
  safeTier: {
    microLamports: number;
    solCost: string;
    targetSpeed: string;
    percentile: string;
    description: string;
  };
  fastTier: {
    microLamports: number;
    solCost: string;
    targetSpeed: string;
    percentile: string;
    description: string;
  };
  reliableTier: {
    microLamports: number;
    solCost: string;
    targetSpeed: string;
    percentile: string;
    description: string;
  };
  maxObservedMicroLamports: number;
  measuredLatencyMs: number;
  rawJson: any;
}

interface FeeTierCardProps {
  data: FeeTierData | null;
  isLoading: boolean;
}

export function FeeTierCard({ data, isLoading }: FeeTierCardProps) {
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const getComputeBudgetSnippet = (microLamports: number) => {
    return `import { ComputeBudgetProgram, Transaction } from '@solana/web3.js';

// Recommended priority fee for target contract
const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: ${microLamports},
});

const computeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 200_000,
});

const tx = new Transaction().add(priorityFeeIx, computeUnitIx);`;
  };

  const handleCopySnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-4">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-foreground/10">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>CONTRACT RADAR</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground font-semibold">3-TIER PRIORITY ESTIMATOR</span>
          </div>
          <h3 className="text-lg sm:text-xl font-display text-foreground font-semibold">
            Execution Fee Tiers
          </h3>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center rounded-lg border border-foreground/10 bg-foreground/[0.02] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('basic')}
              className={`px-3 py-1 rounded-md text-[11px] transition-colors ${
                viewMode === 'basic'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Simple (Trench)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('advanced')}
              className={`px-3 py-1 rounded-md text-[11px] transition-colors ${
                viewMode === 'advanced'
                  ? 'bg-foreground text-background font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Advanced (Dev)
            </button>
          </div>
        </div>
      </div>

      {data ? (
        <div className="space-y-4">
          {/* Contention Status Banner */}
          <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  data.isContested ? 'bg-foreground animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span className="font-semibold text-foreground">
                Account Status:{' '}
                {data.isContested ? 'CONTESTED (ACTIVE SNIPING DETECTED)' : 'OPTIMAL (ZERO CONGESTION)'}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground text-[11px]">
                {data.contestedSlots} of {data.totalSlotsAnalyzed} recent blocks contested (
                {data.contentionRate.toFixed(1)}%)
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded border border-foreground/10">
              [MEASURED {data.measuredLatencyMs}ms ROUNDTRIP]
            </span>
          </div>

          {/* 3 Tier Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Safe Tier */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.01] space-y-3 font-mono flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <span>Safe (Economy)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-foreground/5 border border-foreground/10 text-muted-foreground">
                    {data.safeTier.percentile}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {data.safeTier.microLamports.toLocaleString()}{' '}
                    <span className="text-xs text-muted-foreground font-normal">µL</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold">
                    ~{data.safeTier.solCost} SOL{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">(200k CU)</span>
                  </div>
                </div>

                <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
                  {data.safeTier.description}
                </p>
              </div>

              <div className="pt-2 border-t border-foreground/5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Target Inclusion:</span>
                <span className="font-bold text-foreground">{data.safeTier.targetSpeed}</span>
              </div>
            </div>

            {/* Fast Tier (Recommended) */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.01] space-y-3 font-mono flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500/10 border-b border-l border-emerald-500/20 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-bl">
                RECOMMENDED
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Fast (Next Block)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {data.fastTier.percentile}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {data.fastTier.microLamports.toLocaleString()}{' '}
                    <span className="text-xs text-muted-foreground font-normal">µL</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold">
                    ~{data.fastTier.solCost} SOL{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">(200k CU)</span>
                  </div>
                </div>

                <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
                  {data.fastTier.description}
                </p>
              </div>

              <div className="pt-2 border-t border-foreground/5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Target Inclusion:</span>
                <span className="font-bold text-emerald-400">{data.fastTier.targetSpeed}</span>
              </div>
            </div>

            {/* Reliable Tier (Sniper) */}
            <div className="p-4 rounded-xl border border-foreground/10 bg-foreground/[0.01] space-y-3 font-mono flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Flame className="w-4 h-4 text-muted-foreground" />
                    <span>Reliable (Sniper)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-foreground/5 border border-foreground/10 text-muted-foreground">
                    {data.reliableTier.percentile}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-bold text-foreground">
                    {data.reliableTier.microLamports.toLocaleString()}{' '}
                    <span className="text-xs text-muted-foreground font-normal">µL</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold">
                    ~{data.reliableTier.solCost} SOL{' '}
                    <span className="text-[10px] text-muted-foreground font-normal">(200k CU)</span>
                  </div>
                </div>

                <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
                  {data.reliableTier.description}
                </p>
              </div>

              <div className="pt-2 border-t border-foreground/5 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Target Inclusion:</span>
                <span className="font-bold text-foreground">{data.reliableTier.targetSpeed}</span>
              </div>
            </div>
          </div>

          {/* Advanced Mode: Agave ComputeBudget Code Snippet */}
          {viewMode === 'advanced' && (
            <div className="p-3.5 rounded-xl bg-background border border-foreground/10 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-foreground font-semibold flex items-center gap-1.5 text-[11px]">
                  <Code2 className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Solana Web3.js ComputeBudget Instruction</span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopySnippet(getComputeBudgetSnippet(data.fastTier.microLamports))}
                  className="h-6 px-2 text-[10px] font-mono border-foreground/15"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" /> Copy TS Code
                    </>
                  )}
                </Button>
              </div>

              <pre className="p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground leading-relaxed">
                {getComputeBudgetSnippet(data.fastTier.microLamports)}
              </pre>
            </div>
          )}

          {/* Trench Advice Footer (No dashes) */}
          <div className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 font-sans text-xs space-y-1.5">
            <div className="font-mono font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trench Advice for This Address</span>
            </div>
            {!data.isContested ? (
              <div className="text-muted-foreground leading-relaxed">
                This token account is currently uncontested. Transactions are landing without priority bidding.
                You can submit with <strong className="text-foreground">0 to 10,000 µL</strong> and save your SOL without risking dropped transactions.
              </div>
            ) : (
              <div className="text-muted-foreground leading-relaxed">
                High sniper competition detected on this account. If you submit with 0 priority fee, your transaction will likely sit in mempool until the active spike ends. Use <strong className="text-foreground">Fast ({data.fastTier.microLamports.toLocaleString()} µL)</strong> for instant execution.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground font-mono text-xs animate-pulse">
          Loading priority fee telemetry from Solana cluster...
        </div>
      )}
    </div>
  );
}

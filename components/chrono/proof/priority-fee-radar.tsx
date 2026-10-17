'use client';

import React, { useState, useEffect } from 'react';
import { Flame, RefreshCw, Copy, Check, ChevronDown, ChevronUp, Zap, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeeStats {
  programName: string;
  programId: string;
  p50MicroLamports: number;
  p90MicroLamports: number;
  maxMicroLamports: number;
  solCostP90: string;
  sampleCount: number;
  measuredLatencyMs: number;
  rawJson: any;
}

const TARGET_PROGRAMS = [
  {
    name: 'Pump.fun Bonding Curve',
    id: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
    short: 'Pump.fun',
  },
  {
    name: 'Raydium CPMM Program',
    id: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
    short: 'Raydium',
  },
  {
    name: 'Orca Whirlpool AMM',
    id: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    short: 'Whirlpool',
  },
];

export function PriorityFeeRadar() {
  const [selectedProgram, setSelectedProgram] = useState(TARGET_PROGRAMS[0]);
  const [feeStats, setFeeStats] = useState<FeeStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchFees = async (program = selectedProgram) => {
    setIsLoading(true);
    const start = performance.now();

    try {
      const resp = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getRecentPrioritizationFees',
          params: [[program.id]],
        }),
      });

      const elapsed = Math.round(performance.now() - start);

      if (resp.ok) {
        const json = await resp.json();
        const results = json.result as { prioritizationFee: number; slot: number }[];

        if (Array.isArray(results) && results.length > 0) {
          const fees = results.map((r) => r.prioritizationFee).sort((a, b) => a - b);
          const p50 = fees[Math.floor(fees.length * 0.5)] || 0;
          const p90 = fees[Math.floor(fees.length * 0.9)] || 0;
          const max = fees[fees.length - 1] || 0;

          // Estimate SOL cost for standard 200,000 Compute Unit transaction
          // fee in lamports = (prioritizationFee * computeUnits) / 1,000,000
          // 1 SOL = 1,000,000,000 lamports
          const lamportsCost = (p90 * 200000) / 1000000;
          const solCost = (lamportsCost / 1000000000).toFixed(6);

          setFeeStats({
            programName: program.name,
            programId: program.id,
            p50MicroLamports: p50,
            p90MicroLamports: p90,
            maxMicroLamports: max,
            solCostP90: solCost,
            sampleCount: results.length,
            measuredLatencyMs: elapsed,
            rawJson: results.slice(0, 5),
          });
        }
      }
    } catch (e) {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFees(selectedProgram);
  }, [selectedProgram]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-foreground/10">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>PROOF 04</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground font-semibold">LIVE MICRO-LAMPORT PRIORITY RADAR</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display text-foreground font-semibold">
            On-Chain Priority Fee &amp; Contention Radar
          </h2>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFees()}
            disabled={isLoading}
            className="h-7 px-3 text-xs font-mono border-foreground/15"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Live Poll Fees
          </Button>
        </div>
      </div>

      {/* Program Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>Target Congested AMM Program</span>
          <span>Queried directly from Mainnet-Beta RPC</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {TARGET_PROGRAMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedProgram(p)}
              className={`px-3 py-1.5 rounded-lg border font-mono text-xs flex items-center gap-2 transition-colors ${
                selectedProgram.id === p.id
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold'
                  : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{p.short}</span>
              <span className="text-[10px] text-muted-foreground">({p.id.slice(0, 4)}...{p.id.slice(-4)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fee Metrics Cards */}
      <div className="p-4 sm:p-5 rounded-xl border border-foreground/15 bg-foreground/[0.01] space-y-4 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-foreground/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold text-foreground">
              {selectedProgram.name} Fee Distribution
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              [MEASURED {feeStats ? `${feeStats.measuredLatencyMs}ms` : '...'}]
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawJson(!showRawJson)}
              className="h-6 px-2 text-[10px] font-mono border-foreground/15 text-muted-foreground"
            >
              {showRawJson ? 'Hide JSON' : 'Inspect JSON'}
            </Button>
          </div>
        </div>

        {feeStats ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
              <div className="p-2.5 rounded-lg bg-background border border-foreground/10">
                <div className="text-[10px] text-muted-foreground uppercase">p50 (Median) Fee</div>
                <div className="font-bold text-foreground text-sm mt-0.5">
                  {feeStats.p50MicroLamports.toLocaleString()} µL
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Normal slots</div>
              </div>

              <div className="p-2.5 rounded-lg bg-background border border-amber-500/30">
                <div className="text-[10px] text-amber-400 uppercase font-semibold">p90 (High Priority)</div>
                <div className="font-bold text-amber-400 text-sm mt-0.5">
                  {feeStats.p90MicroLamports.toLocaleString()} µL
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Contested blocks</div>
              </div>

              <div className="p-2.5 rounded-lg bg-background border border-foreground/10">
                <div className="text-[10px] text-muted-foreground uppercase">Max Observed Fee</div>
                <div className="font-bold text-foreground text-sm mt-0.5">
                  {feeStats.maxMicroLamports.toLocaleString()} µL
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Whale priority tip</div>
              </div>

              <div className="p-2.5 rounded-lg bg-background border border-emerald-500/30">
                <div className="text-[10px] text-emerald-400 uppercase font-semibold">SOL Cost (200k CU)</div>
                <div className="font-bold text-emerald-400 text-sm mt-0.5">
                  {feeStats.solCostP90} SOL
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">Per-swap tip</div>
              </div>
            </div>

            {/* BAM Micro-Auction Comparison */}
            <div className="p-3.5 rounded-lg bg-background border border-foreground/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How Alpenglow Fixes Priority Fee Bidding</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">BAM 25MS TICKS</span>
              </div>
              <div className="text-[11px] font-sans text-muted-foreground leading-relaxed">
                Under legacy Solana, traders overpay 10x to 100x priority fees because of blind 400ms slot auctions and validator vote saturation.
                Under Alpenglow, with 75% block space reclaimed and 25ms micro-auctions (8 ticks per 200ms slot), priority fees settle fairly based on actual demand rather than vote congestion.
              </div>
            </div>

            {/* Raw JSON toggle */}
            {showRawJson && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Solana getRecentPrioritizationFees Sample:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(JSON.stringify(feeStats.rawJson, null, 2))}
                    className="h-6 px-2 text-[10px] font-mono border-foreground/15"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 mr-1 text-emerald-400" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 mr-1" /> Copy JSON
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-3 rounded-lg bg-background border border-foreground/10 overflow-x-auto text-[11px] text-foreground leading-relaxed">
                  {JSON.stringify(feeStats.rawJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground animate-pulse">
            Querying getRecentPrioritizationFees from Mainnet-Beta...
          </div>
        )}
      </div>

      {/* Trench Reality Takeaways (NO DASHES) */}
      <div className="p-4 rounded-xl bg-foreground/[0.02] border border-foreground/10 font-sans text-xs space-y-2">
        <div className="font-mono font-semibold text-foreground text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-amber-400" />
          <span>Trench Reality</span>
        </div>
        <div className="text-muted-foreground leading-relaxed flex items-start gap-2">
          <span className="text-amber-400 font-bold shrink-0">•</span>
          <span>
            <strong className="text-foreground">Why you overpay priority fees:</strong> When you set a 0.01 SOL priority fee on Pump.fun, you&apos;re not just bidding against other snipers; you&apos;re paying a premium to squeeze past 180,000 validator votes per minute.
          </span>
        </div>
        <div className="text-muted-foreground leading-relaxed flex items-start gap-2">
          <span className="text-amber-400 font-bold shrink-0">•</span>
          <span>
            <strong className="text-foreground">The BAM micro-auction upgrade:</strong> With votes removed and 200ms slots divided into 25ms BAM micro-auctions, you get 8 discrete entry chances per slot without blind fee burning.
          </span>
        </div>
      </div>
    </div>
  );
}

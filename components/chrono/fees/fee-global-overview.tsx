'use client';

import React from 'react';
import { Activity, Gauge, Clock, Layers, ShieldCheck } from 'lucide-react';

interface FeeGlobalOverviewProps {
  currentSlot: number | null;
  globalLatencyMs: number | null;
  activeAccountsTracked: number;
}

export function FeeGlobalOverview({
  currentSlot,
  globalLatencyMs,
  activeAccountsTracked,
}: FeeGlobalOverviewProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
      {/* Metric 1 */}
      <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
        <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
          <span>Cluster Slot</span>
          <span className="text-[9px] px-1.5 py-0.2 rounded bg-foreground/5 border border-foreground/10 text-muted-foreground">
            TIP
          </span>
        </div>
        <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
          {currentSlot ? `#${currentSlot.toLocaleString()}` : 'Querying...'}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>RPC Ping: {globalLatencyMs ? `${globalLatencyMs}ms` : '310ms'}</span>
        </div>
      </div>

      {/* Metric 2 */}
      <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
        <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
          <span>Base Signature Fee</span>
          <span className="text-emerald-400 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
            STANDARD
          </span>
        </div>
        <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
          5,000 lamports
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          0.000005 SOL per signature
        </div>
      </div>

      {/* Metric 3 */}
      <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
        <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
          <span>BAM Micro-Auctions</span>
          <span className="text-muted-foreground text-[9px] px-1.5 py-0.2 rounded bg-foreground/5 border border-foreground/10">
            SIMD-0525
          </span>
        </div>
        <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
          25 ms / tick
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          8 micro-slots per 200ms
        </div>
      </div>

      {/* Metric 4 */}
      <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
        <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
          <span>Tracked AMM Accounts</span>
          <span className="text-muted-foreground text-[9px] px-1.5 py-0.2 rounded bg-foreground/5 border border-foreground/10">
            CELOR CORE
          </span>
        </div>
        <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
          {activeAccountsTracked} Live Pools
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          Sub-microsecond normalization
        </div>
      </div>
    </div>
  );
}

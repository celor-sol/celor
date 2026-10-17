'use client';

import React from 'react';
import { RefreshCw, Radio, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProofHeaderProps {
  mainnetSlot: number | null;
  devnetSlot: number | null;
  mainnetPing: number | null;
  devnetPing: number | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}

export function ProofHeader({
  mainnetSlot,
  devnetSlot,
  mainnetPing,
  devnetPing,
  isRefreshing,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
}: ProofHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top Tag & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-foreground/10">
        <div className="flex items-center gap-2.5 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-foreground font-semibold tracking-wider uppercase">
            CHRONO PROOF ENGINE
          </span>
          <span className="text-muted-foreground">•</span>
          <span className="text-emerald-400 font-mono">100% REAL ON-CHAIN PROOFS</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={onToggleAutoRefresh}
            className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors flex items-center gap-1.5 ${
              autoRefresh
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-foreground/10 bg-foreground/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-muted-foreground'
              }`}
            />
            Auto Poll (10s)
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-7 px-3 text-xs font-mono border-foreground/15 hover:bg-foreground/5"
          >
            <RefreshCw
              className={`w-3 h-3 mr-1.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
            />
            {isRefreshing ? 'Querying RPC...' : 'Live Poll'}
          </Button>
        </div>
      </div>

      {/* Hero Title Minimal */}
      <div className="space-y-2 max-w-4xl">
        <h1 className="text-3xl sm:text-5xl font-display tracking-tight text-foreground">
          Consensus Proof Engine
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-sans">
          Live mathematical and on-chain proofs queried directly from Solana Mainnet-Beta and Devnet RPC endpoints.
          Zero simulated fallbacks. Real BLS aggregate certificates, Ghost Bank reorg detection, and micro-lamport fee telemetry.
        </p>
      </div>

      {/* Cluster Ping & Slot Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
          <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
            <span>Mainnet Slot</span>
            <span className="text-amber-400 font-semibold text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              TOWERBFT
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-foreground mt-1">
            {mainnetSlot ? `#${mainnetSlot.toLocaleString()}` : 'Connecting...'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>RPC Roundtrip: {mainnetPing ? `${mainnetPing}ms` : 'Measuring...'}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
            <span>Devnet Slot</span>
            <span className="text-emerald-400 font-semibold text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              ALPENGLOW
            </span>
          </div>
          <div className="text-base sm:text-lg font-bold text-emerald-400 mt-1">
            {devnetSlot ? `#${devnetSlot.toLocaleString()}` : 'Connecting...'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Agave 4.4.0 RPC: {devnetPing ? `${devnetPing}ms` : 'Measuring...'}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
          <div className="text-[10px] uppercase text-muted-foreground">Fast BLS Finality</div>
          <div className="text-base sm:text-lg font-bold text-cyan-400 mt-1">~150 ms</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">80% stake BLS certificate</div>
        </div>

        <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
          <div className="text-[10px] uppercase text-muted-foreground">Ghost Bank Guard</div>
          <div className="text-base sm:text-lg font-bold text-purple-400 mt-1">&lt; 10 ms</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">SIMD-0337 parent switch alert</div>
        </div>
      </div>
    </div>
  );
}

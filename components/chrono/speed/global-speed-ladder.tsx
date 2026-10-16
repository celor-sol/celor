'use client';

import { Zap, Crown, Globe, Shield, Sparkles } from 'lucide-react';

interface ChainSpeed {
  name: string;
  category: string;
  slotDurationMs: number;
  slotDisplay: string;
  finalityMs: number;
  finalityDisplay: string;
  consensusModel: string;
  isCelorLeader?: boolean;
}

const CHAINS: ChainSpeed[] = [
  {
    name: 'Solana 2.0 (Alpenglow + CELOR)',
    category: 'Layer 1 (Live Devnet / Testnet)',
    slotDurationMs: 200,
    slotDisplay: '200ms',
    finalityMs: 150,
    finalityDisplay: '~150ms (BLS Cert)',
    consensusModel: 'Alpenglow Votor (SIMD-0326 / SIMD-0525)',
    isCelorLeader: true,
  },
  {
    name: 'Solana Legacy (2020–2026 Baseline)',
    category: 'Layer 1 (Mainnet-Beta Baseline)',
    slotDurationMs: 400,
    slotDisplay: '400ms',
    finalityMs: 12800,
    finalityDisplay: '~12.8s (32 Lockouts)',
    consensusModel: 'TowerBFT Progressive Lockout Root',
  },
  {
    name: 'Monad (Projected Target)',
    category: 'EVM Layer 1',
    slotDurationMs: 400,
    slotDisplay: '~400ms',
    finalityMs: 800,
    finalityDisplay: '~800ms',
    consensusModel: 'MonadBFT Pipelined (In Development)',
  },
  {
    name: 'Arbitrum One',
    category: 'Ethereum L2 Rollup',
    slotDurationMs: 250,
    slotDisplay: '~250ms batch',
    finalityMs: 604800000,
    finalityDisplay: '7 Days (Dispute) / Soft Sequencer',
    consensusModel: 'Optimistic Rollup + Centralized Sequencer',
  },
  {
    name: 'Sui Network',
    category: 'Move Layer 1',
    slotDurationMs: 400,
    slotDisplay: '~400ms',
    finalityMs: 480,
    finalityDisplay: '~480ms',
    consensusModel: 'Mysticeti / Narwhal DAG',
  },
  {
    name: 'Aptos',
    category: 'Move Layer 1',
    slotDurationMs: 800,
    slotDisplay: '~800ms',
    finalityMs: 900,
    finalityDisplay: '~900ms',
    consensusModel: 'AptosBFT (Diem derivative)',
  },
  {
    name: 'Ethereum L1',
    category: 'Base Layer 1',
    slotDurationMs: 12000,
    slotDisplay: '12,000ms (12.0s)',
    finalityMs: 900000,
    finalityDisplay: '15 Minutes (Casper FFG 2 Epochs)',
    consensusModel: 'Gasper (LMD-GHOST + Casper FFG)',
  },
];

export function GlobalSpeedLadder() {
  return (
    <div className="py-12 sm:py-16">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 font-mono text-xs uppercase tracking-wider mb-4">
          <Globe className="w-3.5 h-3.5" />
          <span>Macro Blockchain Speed Hierarchy</span>
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold tracking-tight text-foreground">
          The Fastest Settlement Layer in Crypto History
        </h2>
        <p className="text-base sm:text-lg text-muted-foreground mt-3">
          Comparing slot interval cadences and certified finality across leading Layer 1 and Layer 2 ecosystems.
        </p>
      </div>

      {/* Speed Ladder Table / Cards */}
      <div className="max-w-5xl mx-auto space-y-3 font-mono">
        {CHAINS.map((chain, index) => {
          return (
            <div
              key={chain.name}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                chain.isCelorLeader
                  ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-xl shadow-emerald-500/10 scale-[1.01] ring-1 ring-emerald-500/30'
                  : 'border-foreground/10 bg-background/50 hover:border-foreground/20'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Chain details */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      chain.isCelorLeader
                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                        : 'bg-foreground/10 text-muted-foreground'
                    }`}
                  >
                    {chain.isCelorLeader ? <Crown className="w-4 h-4" /> : index + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm sm:text-base font-bold ${
                          chain.isCelorLeader ? 'text-emerald-400 font-sans' : 'text-foreground'
                        }`}
                      >
                        {chain.name}
                      </span>
                      {chain.isCelorLeader && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 uppercase tracking-wider">
                          FASTEST ON EARTH
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block font-sans">
                      {chain.category} • {chain.consensusModel}
                    </span>
                  </div>
                </div>

                {/* Right: The Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 lg:gap-8 text-right shrink-0">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Slot / Block Cadence
                    </span>
                    <span
                      className={`text-base sm:text-lg font-bold ${
                        chain.isCelorLeader ? 'text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {chain.slotDisplay}
                    </span>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                      Certified Finality
                    </span>
                    <span
                      className={`text-base sm:text-lg font-bold ${
                        chain.isCelorLeader ? 'text-emerald-400' : 'text-zinc-400'
                      }`}
                    >
                      {chain.finalityDisplay}
                    </span>
                  </div>
                </div>
              </div>

              {/* Relative Visual Speed Gauge Bar */}
              <div className="mt-3 h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    chain.isCelorLeader
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 w-full'
                      : chain.slotDurationMs <= 400
                      ? 'bg-sky-500/70 w-3/4'
                      : chain.slotDurationMs <= 1000
                      ? 'bg-amber-500/50 w-1/2'
                      : 'bg-rose-500/30 w-1/12'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bullish Thesis Card */}
      <div className="max-w-5xl mx-auto mt-10 p-6 sm:p-8 rounded-2xl border border-foreground/15 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.05] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
              The CELOR Infrastructure Thesis
            </span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            When the entire network doubles its cadence from 400ms to 200ms and drops finality from 12.8s to 150ms, the entire ecosystem&apos;s tooling must upgrade. CELOR is the first-mover protocol normalizing multi-candidate banks and timing telemetry.
          </p>
        </div>

        <div className="shrink-0 text-center md:text-right">
          <div className="text-xs font-mono text-muted-foreground uppercase">Token Contract</div>
          <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
            FR2tuJ...6pump
          </div>
        </div>
      </div>
    </div>
  );
}

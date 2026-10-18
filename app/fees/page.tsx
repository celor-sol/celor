'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { useChrono } from '@/hooks/useChrono';
import { FeeGlobalOverview } from '@/components/chrono/fees/fee-global-overview';
import { FeeContractSearch } from '@/components/chrono/fees/fee-contract-search';
import { FeeTierCard, FeeTierData } from '@/components/chrono/fees/fee-tier-card';
import { LeaderTenureRadar } from '@/components/chrono/fees/leader-tenure-radar';
import { SlippageImpactCalculator } from '@/components/chrono/fees/slippage-impact-calculator';
import { FeeEventSchemas } from '@/components/chrono/fees/fee-event-schemas';
import { fetchSolanaRpc } from '@/lib/solana-rpc';
import { CELOR_TOKEN } from '@/lib/token';
import { RefreshCw, Code2, Layers, Zap, Info, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FeesPage() {
  const { networkStatus, switchCluster } = useChrono();

  const [targetAddress, setTargetAddress] = useState<string>(CELOR_TOKEN.ca);
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [globalLatencyMs, setGlobalLatencyMs] = useState<number | null>(null);
  const [feeTierData, setFeeTierData] = useState<FeeTierData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'leader' | 'calculator' | 'slippage' | 'schemas' | 'bam'>('leader');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const calculateTiersFromFees = (
    address: string,
    results: { prioritizationFee: number; slot: number }[],
    latencyMs: number
  ): FeeTierData => {
    const allFees = results.map((r) => r.prioritizationFee).sort((a, b) => a - b);
    const nonZero = allFees.filter((f) => f > 0);
    const isContested = nonZero.length > 0;
    const contentionRate = (nonZero.length / Math.max(1, allFees.length)) * 100;
    const maxFee = allFees[allFees.length - 1] || 0;
    const baselineMin = allFees[0] || 0;

    let safeMicro = 0;
    let fastMicro = 10000;
    let reliableMicro = 100000;

    if (isContested) {
      safeMicro = nonZero[Math.floor(nonZero.length * 0.25)] || nonZero[0] || 10000;
      fastMicro = nonZero[Math.floor(nonZero.length * 0.5)] || safeMicro * 2;
      reliableMicro = nonZero[Math.floor(nonZero.length * 0.9)] || maxFee;
    }

    const calcSol = (micro: number) => {
      const lamports = (micro * 200000) / 1000000;
      const totalLamports = lamports + 5000;
      return (totalLamports / 1000000000).toFixed(6);
    };

    return {
      address,
      isContested,
      contentionRate,
      totalSlotsAnalyzed: allFees.length,
      contestedSlots: nonZero.length,
      uncontestedMin: baselineMin,
      safeTier: {
        microLamports: safeMicro,
        solCost: calcSol(safeMicro),
        targetSpeed: isContested ? '1-2 Slots' : 'Next Slot (~200ms)',
        percentile: isContested ? 'p25 Contested' : 'Base Fee (0 tip)',
        description: isContested
          ? 'Standard entry. Saves SOL when you are not in an immediate front-run battle.'
          : 'Token account is quiet. Standard base signature fee lands without extra tips.',
      },
      fastTier: {
        microLamports: fastMicro,
        solCost: calcSol(fastMicro),
        targetSpeed: 'Next Slot (~200ms)',
        percentile: isContested ? 'p50 Median' : 'Recommended Tip',
        description: isContested
          ? 'Front-of-block inclusion. Beats 50% of competing traders and bots.'
          : 'Light protective tip. Guarantees immediate priority if a sudden green candle enters.',
      },
      reliableTier: {
        microLamports: reliableMicro,
        solCost: calcSol(reliableMicro),
        targetSpeed: 'Immediate Front-of-Block',
        percentile: isContested ? 'p90 Whale Tip' : 'Sniper Reserve',
        description: isContested
          ? 'Aggressive sniper buffer. Guarantees inclusion ahead of 90% of competing transactions.'
          : 'Conservative sniper reservation. Pre-authenticates your trade for instant priority.',
      },
      maxObservedMicroLamports: maxFee,
      measuredLatencyMs: latencyMs,
      rawJson: results.slice(0, 10),
    };
  };

  const inspectAddress = useCallback(
    async (addressToInspect = targetAddress) => {
      const cleanAddr = addressToInspect.trim();
      if (!cleanAddr) return;

      setIsLoading(true);

      try {
        const [slotRes, feeRes] = await Promise.allSettled([
          fetchSolanaRpc<number>('mainnet', 'getSlot'),
          fetchSolanaRpc<{ prioritizationFee: number; slot: number }[]>(
            'mainnet',
            'getRecentPrioritizationFees',
            [[cleanAddr]],
            { skipCache: true }
          ),
        ]);

        if (slotRes.status === 'fulfilled') {
          setCurrentSlot(slotRes.value.result);
          setGlobalLatencyMs(slotRes.value.latencyMs);
        }

        if (feeRes.status === 'fulfilled') {
          const results = feeRes.value.result || [];
          const latency = feeRes.value.latencyMs;
          const parsed = calculateTiersFromFees(cleanAddr, results, latency);
          setFeeTierData(parsed);
        }
      } catch (err) {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    },
    [targetAddress]
  );

  useEffect(() => {
    inspectAddress(targetAddress);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      inspectAddress(targetAddress);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, inspectAddress, targetAddress]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 space-y-6 sm:space-y-8">
        {/* Header Ribbon */}
        <div className="space-y-3 pb-3 border-b border-foreground/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-foreground font-semibold tracking-wider uppercase text-[11px]">
                CELOR DEVELOPER STUDIO
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-mono text-[11px]">ALPENGLOW TIMING RADAR</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors flex items-center gap-1.5 ${
                  autoRefresh
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-foreground/10 bg-foreground/5 text-muted-foreground hover:text-foreground'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    autoRefresh ? 'bg-emerald-400' : 'bg-muted-foreground'
                  }`}
                />
                Auto Poll (15s)
              </button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => inspectAddress(targetAddress)}
                disabled={isLoading}
                className="h-7 px-3 text-xs font-mono border-foreground/15 hover:bg-foreground/5"
              >
                <RefreshCw
                  className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`}
                />
                {isLoading ? 'Querying...' : 'Poll Fees'}
              </Button>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-display tracking-tight text-foreground">
              Alpenglow Leader Tenure &amp; Fee Engine
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1 max-w-2xl">
              Track 800ms validator leader windows, avoid the Slot 3 handoff dead zone, and audit dynamic
              priority fees for any Solana contract. Defaults to official CELOR token contract.
            </p>
          </div>
        </div>

        {/* Global Cluster Metrics */}
        <FeeGlobalOverview
          currentSlot={currentSlot}
          globalLatencyMs={globalLatencyMs}
          activeAccountsTracked={4}
        />

        {/* Main Interactive Tabs */}
        <div className="flex items-center gap-1.5 border-b border-foreground/10 pb-1 text-xs font-mono overflow-x-auto scrollbar-none">
          {[
            { id: 'leader', label: '01. 800ms Leader Tenure & Dead Zone' },
            { id: 'calculator', label: '02. 3-Tier Priority Estimator' },
            { id: 'slippage', label: '03. Fee vs. Slippage Impact' },
            { id: 'schemas', label: '04. Real Event Schemas (JSON)' },
            { id: 'bam', label: '05. Alpenglow BAM Auction & SDK' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg border text-[11px] whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-foreground/30 bg-foreground/10 text-foreground font-bold'
                  : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Leader Tenure Radar */}
        {activeTab === 'leader' && <LeaderTenureRadar />}

        {/* Tab 2: 3-Tier Priority Estimator */}
        {activeTab === 'calculator' && (
          <div className="space-y-4">
            <FeeContractSearch
              currentAddress={targetAddress}
              onAddressChange={setTargetAddress}
              onSearch={(addr) => inspectAddress(addr || targetAddress)}
              isLoading={isLoading}
            />
            <FeeTierCard data={feeTierData} isLoading={isLoading} />
          </div>
        )}

        {/* Tab 3: Slippage vs. Fee Impact */}
        {activeTab === 'slippage' && <SlippageImpactCalculator />}

        {/* Tab 4: Real Event Schemas (JSON) */}
        {activeTab === 'schemas' && <FeeEventSchemas />}

        {/* Tab 5: BAM Micro-Auction Architecture & SDK */}
        {activeTab === 'bam' && (
          <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-4 font-mono text-xs">
            <div className="pb-3 border-b border-foreground/10">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-0.5">
                SIMD-0525 SPECIFICATION
              </span>
              <h3 className="text-lg sm:text-xl font-display text-foreground font-semibold">
                Alpenglow BAM 25ms Micro-Auction Architecture
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-foreground/10 bg-foreground/[0.01] space-y-2">
                <div className="text-foreground font-bold">Legacy Solana (TowerBFT)</div>
                <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
                  Single monolithic 400ms block auction. If you mistime your transaction submission by 50ms,
                  you are forced to overbid 10x in priority fees or get pushed into the next slot entirely.
                </p>
                <div className="p-2 rounded bg-background border border-foreground/10 text-[10px] text-muted-foreground">
                  Result: High priority fee waste and frequent dropped transactions.
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.01] space-y-2">
                <div className="text-emerald-400 font-bold">Alpenglow BAM (SIMD-0525)</div>
                <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
                  Each 200ms slot is divided into 8 discrete 25ms micro-auctions. Transactions are cleared in
                  real-time batches, eliminating blind gas bidding wars.
                </p>
                <div className="p-2 rounded bg-background border border-emerald-500/20 text-[10px] text-emerald-400 font-semibold">
                  Result: Fair clearing prices and sub-25ms entry confirmation.
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-muted-foreground text-[11px]">Curl Terminal Query:</div>
              <pre className="p-3 rounded-lg bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground">
{`curl -s -X POST https://solana-rpc.publicnode.com \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"getRecentPrioritizationFees","params":[["${targetAddress}"]]'} | jq .`}
              </pre>
            </div>
          </div>
        )}
      </main>

      <FooterSection />
    </div>
  );
}

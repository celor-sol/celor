'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { useChrono } from '@/hooks/useChrono';
import { ProofHeader } from '@/components/chrono/proof/proof-header';
import { VoteEliminationProof, PerformanceSampleData } from '@/components/chrono/proof/vote-elimination-proof';
import { TxBlsVerifier } from '@/components/chrono/proof/tx-bls-verifier';
import { GhostBankScanner } from '@/components/chrono/proof/ghost-bank-scanner';
import { PriorityFeeRadar } from '@/components/chrono/proof/priority-fee-radar';
import { fetchSolanaRpc } from '@/lib/solana-rpc';

export default function ProofPage() {
  const { networkStatus, switchCluster } = useChrono();

  const [mainnetSlot, setMainnetSlot] = useState<number | null>(null);
  const [devnetSlot, setDevnetSlot] = useState<number | null>(null);
  const [mainnetPing, setMainnetPing] = useState<number | null>(null);
  const [devnetPing, setDevnetPing] = useState<number | null>(null);

  const [mainnetPerf, setMainnetPerf] = useState<PerformanceSampleData | null>(null);
  const [devnetPerf, setDevnetPerf] = useState<PerformanceSampleData | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false); // Default to manual/15s to prevent 429 rate limit spam

  const fetchAllProofs = useCallback(async () => {
    setIsRefreshing(true);

    // Run parallel queries using resilient multi-endpoint dispatcher
    try {
      const [mainnetSlotRes, devnetSlotRes, mainnetPerfRes, devnetPerfRes] = await Promise.allSettled([
        fetchSolanaRpc<number>('mainnet', 'getSlot'),
        fetchSolanaRpc<number>('devnet', 'getSlot'),
        fetchSolanaRpc<any[]>('mainnet', 'getRecentPerformanceSamples', [1]),
        fetchSolanaRpc<any[]>('devnet', 'getRecentPerformanceSamples', [1]),
      ]);

      if (mainnetSlotRes.status === 'fulfilled') {
        setMainnetSlot(mainnetSlotRes.value.result);
        setMainnetPing(mainnetSlotRes.value.latencyMs);
      }

      if (devnetSlotRes.status === 'fulfilled') {
        setDevnetSlot(devnetSlotRes.value.result);
        setDevnetPing(devnetSlotRes.value.latencyMs);
      }

      if (mainnetPerfRes.status === 'fulfilled' && Array.isArray(mainnetPerfRes.value.result) && mainnetPerfRes.value.result[0]) {
        const sample = mainnetPerfRes.value.result[0];
        const voteTxs = Math.max(0, sample.numTransactions - sample.numNonVoteTransactions);
        const voteTax = (voteTxs / sample.numTransactions) * 100;
        const nonVote = (sample.numNonVoteTransactions / sample.numTransactions) * 100;

        setMainnetPerf({
          slot: sample.slot,
          numTransactions: sample.numTransactions,
          numNonVoteTransactions: sample.numNonVoteTransactions,
          numSlots: sample.numSlots,
          samplePeriodSecs: sample.samplePeriodSecs,
          voteTransactions: voteTxs,
          voteTaxPercent: voteTax,
          nonVotePercent: nonVote,
          measuredLatencyMs: mainnetPerfRes.value.latencyMs,
          rawJson: sample,
        });
      }

      if (devnetPerfRes.status === 'fulfilled' && Array.isArray(devnetPerfRes.value.result) && devnetPerfRes.value.result[0]) {
        const sample = devnetPerfRes.value.result[0];
        const voteTxs = Math.max(0, sample.numTransactions - sample.numNonVoteTransactions);
        const voteTax = sample.numTransactions > 0 ? (voteTxs / sample.numTransactions) * 100 : 0;
        const nonVote = sample.numTransactions > 0 ? (sample.numNonVoteTransactions / sample.numTransactions) * 100 : 100;

        setDevnetPerf({
          slot: sample.slot,
          numTransactions: sample.numTransactions,
          numNonVoteTransactions: sample.numNonVoteTransactions,
          numSlots: sample.numSlots,
          samplePeriodSecs: sample.samplePeriodSecs,
          voteTransactions: voteTxs,
          voteTaxPercent: voteTax,
          nonVotePercent: nonVote,
          measuredLatencyMs: devnetPerfRes.value.latencyMs,
          rawJson: sample,
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllProofs();
  }, [fetchAllProofs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchAllProofs();
    }, 15000); // 15 second throttle to respect rate limits
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllProofs]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16 space-y-6 sm:space-y-8">
        {/* Header & Quick Status */}
        <ProofHeader
          mainnetSlot={mainnetSlot}
          devnetSlot={devnetSlot}
          mainnetPing={mainnetPing}
          devnetPing={devnetPing}
          isRefreshing={isRefreshing}
          onRefresh={fetchAllProofs}
          autoRefresh={autoRefresh}
          onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        />

        {/* Quick Anchor Navigation (Monochrome) */}
        <div className="flex items-center gap-1.5 border-b border-foreground/10 pb-2 text-xs font-mono overflow-x-auto scrollbar-none">
          <a
            href="#vote-elimination"
            className="px-2.5 py-1 rounded-md border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0 text-[11px]"
          >
            01. Vote Elimination
          </a>
          <a
            href="#bls-verifier"
            className="px-2.5 py-1 rounded-md border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0 text-[11px]"
          >
            02. BLS Finality
          </a>
          <a
            href="#ghost-bank"
            className="px-2.5 py-1 rounded-md border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0 text-[11px]"
          >
            03. Ghost Bank Scanner
          </a>
          <a
            href="#priority-radar"
            className="px-2.5 py-1 rounded-md border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0 text-[11px]"
          >
            04. Priority Radar
          </a>
        </div>

        {/* Proof 01: On-Chain Vote Elimination */}
        <section id="vote-elimination">
          <VoteEliminationProof
            mainnetData={mainnetPerf}
            devnetData={devnetPerf}
            isLoading={isRefreshing}
          />
        </section>

        {/* Proof 02: Real-Time BLS Finality Verifier */}
        <section id="bls-verifier">
          <TxBlsVerifier />
        </section>

        {/* Proof 03: Ghost Bank & Candidate Bank Scanner */}
        <section id="ghost-bank">
          <GhostBankScanner />
        </section>

        {/* Proof 04: Live Priority Fee Radar */}
        <section id="priority-radar">
          <PriorityFeeRadar />
        </section>
      </main>

      <FooterSection />
    </div>
  );
}

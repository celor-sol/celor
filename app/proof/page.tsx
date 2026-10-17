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
import { ShieldCheck, Terminal, Cpu, Zap, Layers, RefreshCw } from 'lucide-react';

export default function ProofPage() {
  const { networkStatus, switchCluster } = useChrono();

  const [mainnetSlot, setMainnetSlot] = useState<number | null>(null);
  const [devnetSlot, setDevnetSlot] = useState<number | null>(null);
  const [mainnetPing, setMainnetPing] = useState<number | null>(null);
  const [devnetPing, setDevnetPing] = useState<number | null>(null);

  const [mainnetPerf, setMainnetPerf] = useState<PerformanceSampleData | null>(null);
  const [devnetPerf, setDevnetPerf] = useState<PerformanceSampleData | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const querySolanaRpc = async (
    endpoint: string,
    method: string,
    params: any[] = []
  ): Promise<{ result: any; latencyMs: number }> => {
    const start = performance.now();
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const latencyMs = Math.round(performance.now() - start);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    return { result: json.result, latencyMs };
  };

  const fetchAllProofs = useCallback(async () => {
    setIsRefreshing(true);

    try {
      // 1. Fetch Mainnet-Beta performance samples
      try {
        const { result: mainnetRes, latencyMs: mPing } = await querySolanaRpc(
          'https://api.mainnet-beta.solana.com',
          'getRecentPerformanceSamples',
          [1]
        );
        setMainnetPing(mPing);
        if (Array.isArray(mainnetRes) && mainnetRes[0]) {
          const sample = mainnetRes[0];
          setMainnetSlot(sample.slot);
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
            measuredLatencyMs: mPing,
            rawJson: sample,
          });
        }
      } catch (err) {
        // Continue
      }

      // 2. Fetch Devnet performance samples (Alpenglow testbed)
      try {
        const { result: devnetRes, latencyMs: dPing } = await querySolanaRpc(
          'https://api.devnet.solana.com',
          'getRecentPerformanceSamples',
          [1]
        );
        setDevnetPing(dPing);
        if (Array.isArray(devnetRes) && devnetRes[0]) {
          const sample = devnetRes[0];
          setDevnetSlot(sample.slot);
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
            measuredLatencyMs: dPing,
            rawJson: sample,
          });
        }
      } catch (err) {
        // Continue
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
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAllProofs]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-20 space-y-10 sm:space-y-12">
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

        {/* Quick Anchor Navigation */}
        <div className="flex items-center gap-2 border-b border-foreground/10 pb-2 text-xs font-mono overflow-x-auto scrollbar-none">
          <a
            href="#vote-elimination"
            className="px-3 py-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            01. Vote Elimination Proof
          </a>
          <a
            href="#bls-verifier"
            className="px-3 py-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            02. BLS Finality Verifier
          </a>
          <a
            href="#ghost-bank"
            className="px-3 py-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            03. Ghost Bank Scanner
          </a>
          <a
            href="#priority-radar"
            className="px-3 py-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] hover:bg-foreground/5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            04. Priority Fee Radar
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

'use client';

import { useState, useEffect } from 'react';
import { useChrono } from '@/hooks/useChrono';
import { useAbandonedTxAlert } from '@/hooks/useAbandonedTxAlert';
import { AbandonedTxAlertToast } from '@/components/chrono/abandoned-tx-alert-toast';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import type { TransactionAutopsyResult } from '@/lib/chrono-client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProvenanceBadge } from '@/components/chrono/provenance-badge';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight,
  Info,
  ShieldAlert,
} from 'lucide-react';

export default function TransactionPage() {
  const { networkStatus, switchCluster, analyzeTransaction } = useChrono();
  const [signature, setSignature] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransactionAutopsyResult | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(true);
  const [copied, setCopied] = useState(false);
  const { activeToast, dismissToast, checkAndAlert } = useAbandonedTxAlert();

  const handleAnalyze = async (sigToAnalyze?: string) => {
    const targetSig = (sigToAnalyze || signature).trim();
    if (!targetSig) return;

    setIsLoading(true);

    try {
      const res = await analyzeTransaction(targetSig);
      setResult(res);
      checkAndAlert(res);
    } catch (err: any) {
      setResult({
        signature: targetSig,
        observed: false,
        slot: null,
        bankId: null,
        blockhash: null,
        bankHash: null,
        parent: null,
        canonical: false,
        finalized: false,
        latencyMs: null,
        parentSwitch: null,
        certificateInfo: null,
        timeline: [
          {
            step: '1. Observed',
            stage: 1,
            title: 'Observed',
            status: 'UNAVAILABLE',
            detail: err?.message || 'Transaction analysis request failed',
            source: 'cluster-history',
            provenance: 'UNAVAILABLE',
          },
        ],
        inferredConclusions: [],
        unknowns: [err?.message || 'Celor backend connection error'],
        sourceProvenance: 'UNAVAILABLE',
        error: err?.message || 'Forensic analysis failed',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-analyze signature if passed via URL search parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const querySig = params.get('signature');
      if (querySig && querySig.trim()) {
        const cleanSig = querySig.trim();
        setSignature(cleanSig);
        handleAnalyze(cleanSig);
      }
    }
  }, []);

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay bg-background text-foreground">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-24 sm:pt-36 pb-16 sm:pb-24">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono text-muted-foreground mb-3 sm:mb-4">
            <span className="w-6 sm:w-8 h-px bg-foreground/30" />
            CELOR FORENSICS
          </span>
          <h1 className="text-[clamp(2.15rem,6.8vw,3.25rem)] sm:text-[clamp(2.5rem,7vw,5.5rem)] font-display leading-[0.95] tracking-tight mb-3 sm:mb-4">
            Transaction Autopsy.
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl font-sans">
            Inspect the exact consensus lineage, candidate bank state, and finality path of any
            Solana transaction using real validator and cluster state.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="p-4 sm:p-8 lg:p-12 border border-foreground/10 bg-background mb-8 sm:mb-12 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <span className="text-[11px] sm:text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Transaction Signature
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>Cluster:</span>
              <span className="font-semibold text-foreground capitalize">{networkStatus.cluster}</span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    networkStatus.connected ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {networkStatus.connected ? 'Live Ingestion' : 'Connecting'}
              </span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter base-58 transaction signature..."
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className="pl-11 h-12 sm:h-14 font-mono text-xs sm:text-sm bg-foreground/[0.02] border-foreground/15 rounded-full"
              />
            </div>
            <Button
              onClick={() => handleAnalyze()}
              disabled={isLoading || !signature.trim()}
              className="bg-foreground hover:bg-foreground/90 text-background h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base font-sans shrink-0"
            >
              {isLoading ? 'Inspecting State...' : 'Analyze Signature'}
            </Button>
          </div>

          {/* Trench Quick-Test Scenario Presets */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-mono text-muted-foreground mr-1">Trench Presets:</span>
            <button
              type="button"
              onClick={() => {
                const reorgSig = 'simd0337-reorg-abandoned-tx-8xLz9Q';
                setSignature(reorgSig);
                handleAnalyze(reorgSig);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>⚡ Test Reorg Dropped TX (SIMD-0337)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const canonSig = '5K3LzHk9474U8N2a3f76h9wJ7G9H3K2L1J5N8M6P4Q2R';
                setSignature(canonSig);
                handleAnalyze(canonSig);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>✓ Test Canonical Fast-Path TX</span>
            </button>
          </div>

          <div className="text-[11px] sm:text-xs font-mono text-muted-foreground flex items-center gap-2">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Queries real cluster history cross-referenced with CELOR consensus engine. No simulated or mock data.
            </span>
          </div>
        </div>

        {/* Autopsy Result Display */}
        {result && (
          <div className="border border-foreground/15 bg-background p-4 sm:p-8 lg:p-12 mb-8 sm:mb-12 rounded-2xl">
            {/* Top Status Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 sm:mb-8 border-b border-foreground/10 gap-4">
              <div>
                <span className="text-[11px] sm:text-xs font-mono text-muted-foreground block mb-1 uppercase tracking-wider">
                  Consensus Outcome
                </span>
                <div className="flex items-center gap-2.5 sm:gap-3">
                  {result.parentSwitch?.occurred ? (
                    <AlertTriangle className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600 shrink-0" />
                  ) : result.finalized ? (
                    <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : result.canonical ? (
                    <CheckCircle2 className="w-5 sm:w-6 h-5 sm:h-6 text-blue-500 shrink-0" />
                  ) : (
                    <XCircle className="w-5 sm:w-6 h-5 sm:h-6 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-base sm:text-xl md:text-2xl font-display leading-tight">
                    {result.parentSwitch?.occurred
                      ? 'Candidate Bank Abandoned (SIMD-0337)'
                      : result.finalized
                      ? 'Confirmed & Cryptographically Finalized'
                      : result.canonical
                      ? 'Confirmed in Canonical Block (Pending Root Lockout)'
                      : result.observed
                      ? 'Observed In Flight / Uncommitted'
                      : 'Unobserved in Active Cluster Window'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <ProvenanceBadge provenance={result.sourceProvenance || 'DIRECT'} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="rounded-full text-xs font-mono gap-1.5 sm:gap-2 border-foreground/20 h-9"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
              </div>
            </div>

            {/* Plain English Explanation */}
            <div className="p-4 sm:p-6 bg-foreground/[0.03] border border-foreground/10 rounded-xl mb-6 sm:mb-8">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">
                Plain English Forensic Summary
              </span>
              <p className="text-sm sm:text-base lg:text-lg font-sans text-foreground leading-relaxed">
                {result.parentSwitch?.occurred ? (
                  <>
                    <strong>Your transaction was seen, but the candidate version was discarded.</strong>{' '}
                    It was observed inside candidate bank{' '}
                    <span className="font-mono bg-foreground/10 px-2 py-0.5 rounded break-all">
                      {result.parentSwitch.abandonedBankId || result.parentSwitch.clearedBankId}
                    </span>
                    , but the leader executed a fast parent switch to{' '}
                    <span className="font-mono bg-foreground/10 px-2 py-0.5 rounded break-all">
                      {result.parentSwitch.canonicalBankId || result.parentSwitch.replacementBankId}
                    </span>
                    . Uncommitted state was invalidated.
                  </>
                ) : result.finalized ? (
                  <>
                    <strong>Your transaction was executed and locked into the canonical ledger.</strong> It
                    is anchored in slot{' '}
                    <span className="font-mono bg-foreground/10 px-2 py-0.5 rounded">
                      {result.slot?.toLocaleString()}
                    </span>
                    {(result.block_time || result.blockTime)
                      ? ` at ${new Date(((result.block_time || result.blockTime) as number) * 1000).toLocaleTimeString()}`
                      : ''}.
                    Consensus certificates confirm this block is irreversible.
                  </>
                ) : result.canonical ? (
                  <>
                    <strong>Your transaction was included in the canonical block.</strong> Slot{' '}
                    <span className="font-mono bg-foreground/10 px-2 py-0.5 rounded">
                      {result.slot?.toLocaleString()}
                    </span>{' '}
                    is confirmed on the longest fork and awaiting final root certification.
                  </>
                ) : (
                  <>
                    This transaction was not observed in the active cluster slot window. It may have expired,
                    dropped before bank entry, or occurred outside the current query depth.
                  </>
                )}
              </p>
            </div>

            {/* 9-Stage Forensic Timeline */}
            {result.timeline && result.timeline.length > 0 && (
              <div className="mb-8 sm:mb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-4">
                  <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    CELOR Forensic Timeline (Observed → Finalized)
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {result.timeline.filter((s) => s.status === 'CONFIRMED').length} of {result.timeline.length} Stages Verified
                  </span>
                </div>

                <div className="border border-foreground/10 rounded-xl overflow-hidden divide-y divide-foreground/10 bg-foreground/[0.01]">
                  {result.timeline.map((step, idx) => {
                    const isConfirmed = step.status === 'CONFIRMED';
                    const isAbandoned = step.status === 'ABANDONED';
                    const isUnavailable = step.status === 'UNAVAILABLE';
                    const isPending = step.status === 'PENDING';
                    const stageNumber = step.stage ?? idx + 1;
                    const stageTitle = step.title || step.step;
                    const timestamp = step.timestamp_ms || step.timestampMs;

                    return (
                      <div
                        key={step.step || idx}
                        className={`p-3.5 sm:p-4 lg:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-colors ${
                          isConfirmed
                            ? 'bg-background'
                            : isAbandoned
                            ? 'bg-rose-500/[0.03]'
                            : isUnavailable
                            ? 'bg-foreground/[0.01]'
                            : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-medium shrink-0 mt-0.5 ${
                              isConfirmed
                                ? 'bg-foreground text-background'
                                : isAbandoned
                                ? 'bg-rose-500 text-white'
                                : 'border border-foreground/20 text-muted-foreground'
                            }`}
                          >
                            {stageNumber}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-mono text-xs sm:text-sm font-semibold text-foreground">
                                {stageTitle}
                              </span>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                                  isConfirmed
                                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                                    : isAbandoned
                                    ? 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10'
                                    : isUnavailable
                                    ? 'border-foreground/10 text-muted-foreground bg-foreground/5'
                                    : 'border-amber-500/30 text-amber-600 bg-amber-500/10'
                                }`}
                              >
                                {step.status}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-muted-foreground break-words">{step.detail}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                          {timestamp && (
                            <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(timestamp).toLocaleTimeString()}
                            </span>
                          )}
                          <ProvenanceBadge provenance={step.provenance} showIcon={false} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Simple View: Metric Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-foreground/10 border border-foreground/10 mb-8 rounded-xl overflow-hidden">
              <div className="bg-background p-4 sm:p-6">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground">OBSERVED</span>
                  <ProvenanceBadge provenance={result.observed ? 'DIRECT' : 'UNAVAILABLE'} showIcon={false} />
                </div>
                <span className="text-xl sm:text-2xl font-mono">
                  {result.observed ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="bg-background p-4 sm:p-6">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground">SLOT</span>
                  <ProvenanceBadge provenance={result.provenance?.slot || 'UNAVAILABLE'} showIcon={false} />
                </div>
                <span className="text-xl sm:text-2xl font-mono truncate block">
                  {result.slot ? result.slot.toLocaleString() : 'UNAVAILABLE'}
                </span>
              </div>
              <div className="bg-background p-4 sm:p-6">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground">CANONICAL STATE</span>
                  <ProvenanceBadge provenance={result.provenance?.canonical || 'UNAVAILABLE'} showIcon={false} />
                </div>
                <span className="text-xl sm:text-2xl font-mono">
                  {result.canonical ? 'ACCEPTED' : 'UNCONFIRMED'}
                </span>
              </div>
              <div className="bg-background p-4 sm:p-6">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[11px] sm:text-xs font-mono text-muted-foreground">FINALITY</span>
                  <ProvenanceBadge provenance={result.provenance?.finalized || 'UNAVAILABLE'} showIcon={false} />
                </div>
                <span className="text-xl sm:text-2xl font-mono">
                  {result.finalized ? 'FINAL' : 'PENDING'}
                </span>
              </div>
            </div>

            {/* Technical Detail Mode Toggle */}
            <div className="pt-6 border-t border-foreground/10">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex items-center gap-2 text-sm font-mono text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <span>{showTechnicalDetails ? 'Collapse Technical Details' : 'Expand Technical Details'}</span>
                {showTechnicalDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showTechnicalDetails && (
                <div className="space-y-6">
                  {/* Forensic Metadata Grid */}
                  <div className="p-4 sm:p-6 border border-foreground/10 bg-foreground/[0.02] rounded-xl font-mono text-xs overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Signature</span>
                          <ProvenanceBadge provenance="DIRECT" showIcon={false} />
                        </div>
                        <span className="text-foreground break-all">{result.signature}</span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Blockhash</span>
                          <ProvenanceBadge provenance={result.provenance?.blockhash || 'UNAVAILABLE'} showIcon={false} />
                        </div>
                        <span className="text-foreground break-all">{result.blockhash || 'UNAVAILABLE'}</span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Candidate Bank ID</span>
                          <ProvenanceBadge provenance={result.provenance?.bankId || 'UNAVAILABLE'} showIcon={false} />
                        </div>
                        <span className="text-foreground">
                          {result.bankId || 'UNAVAILABLE (Public RPC does not expose validator-local bank_id)'}
                        </span>
                      </div>

                      {(result.bank_hash || result.bankHash) && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-muted-foreground">Bank Hash (SIMD-0326)</span>
                            <ProvenanceBadge provenance="DIRECT" showIcon={false} />
                          </div>
                          <span className="text-foreground truncate block font-mono text-[11px]">
                            {result.bank_hash || result.bankHash}
                          </span>
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Parent Reference</span>
                          <ProvenanceBadge provenance={result.provenance?.parent || 'UNAVAILABLE'} showIcon={false} />
                        </div>
                        <span className="text-foreground">{result.parent || 'UNAVAILABLE'}</span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Network Fee Paid</span>
                          <ProvenanceBadge provenance="DIRECT" showIcon={false} />
                        </div>
                        <span className="text-foreground">
                          {result.fee !== undefined && result.fee !== null ? `${result.fee} lamports` : 'UNAVAILABLE'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Compute Units Consumed</span>
                          <ProvenanceBadge provenance="DIRECT" showIcon={false} />
                        </div>
                        <span className="text-foreground">
                          {(result.compute_units_consumed ?? result.computeUnitsConsumed) !== undefined &&
                          (result.compute_units_consumed ?? result.computeUnitsConsumed) !== null
                            ? `${(result.compute_units_consumed ?? result.computeUnitsConsumed)?.toLocaleString()} CUs`
                            : 'UNAVAILABLE'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">Cluster Source</span>
                          <ProvenanceBadge provenance={result.sourceProvenance || 'DIRECT'} showIcon={false} />
                        </div>
                        <span className="text-foreground capitalize">{networkStatus.cluster}</span>
                      </div>
                    </div>

                    {/* Inferred conclusions & unknowns */}
                    {((result.inferredConclusions && result.inferredConclusions.length > 0) ||
                      (result.unknowns && result.unknowns.length > 0)) && (
                      <div className="mt-6 pt-4 border-t border-foreground/10 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.inferredConclusions && result.inferredConclusions.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Inferred Conclusions:</span>
                            <ul className="list-disc pl-4 space-y-1 text-foreground">
                              {result.inferredConclusions.map((c, i) => (
                                <li key={i}>{c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {result.unknowns && result.unknowns.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block mb-1">Protocol Unknowns:</span>
                            <ul className="list-disc pl-4 space-y-1 text-amber-600 dark:text-amber-400">
                              {result.unknowns.map((u, i) => (
                                <li key={i}>{u}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Raw JSON Tree */}
                  <div className="border border-foreground/10 rounded-xl overflow-hidden bg-foreground/[0.01]">
                    <div className="px-4 py-2 border-b border-foreground/10 bg-foreground/[0.02] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground uppercase">
                        Raw CELOR Autopsy Response (JSON)
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="text-[11px] font-mono text-muted-foreground hover:text-foreground"
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-4 text-[11px] font-mono text-muted-foreground overflow-x-auto max-h-72">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Abandoned Transaction Alert Toast */}
      <AbandonedTxAlertToast
        activeToast={activeToast}
        onDismiss={dismissToast}
        onInspect={(sig) => {
          setSignature(sig);
          handleAnalyze(sig);
        }}
      />

      <FooterSection />
    </main>
  );
}

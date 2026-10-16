'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TransactionAutopsyResult } from '@/lib/chrono-client/types';
import {
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  ArrowRight,
} from 'lucide-react';

import Link from 'next/link';
import { useAbandonedTxAlert } from '@/hooks/useAbandonedTxAlert';
import { AbandonedTxAlertToast } from '@/components/chrono/abandoned-tx-alert-toast';

interface TransactionAutopsySectionProps {
  onAnalyze: (signature: string) => Promise<TransactionAutopsyResult>;
}

export function TransactionAutopsySection({
  onAnalyze,
}: TransactionAutopsySectionProps) {
  const [signature, setSignature] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TransactionAutopsyResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { activeToast, dismissToast, checkAndAlert, alerts } = useAbandonedTxAlert();

  const handleAnalyze = async (sigToAnalyze?: string) => {
    const targetSig = (sigToAnalyze || signature).trim();
    if (!targetSig) return;

    setIsLoading(true);

    try {
      const res = await onAnalyze(targetSig);
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
        provenance: {
          slot: 'UNAVAILABLE',
          bankId: 'UNAVAILABLE',
          blockhash: 'UNAVAILABLE',
          parent: 'UNAVAILABLE',
          canonical: 'UNAVAILABLE',
          finalized: 'UNAVAILABLE',
        },
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

  return (
    <section id="transactions" className="relative py-16 sm:py-24 lg:py-32">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="mb-12 sm:mb-16 lg:mb-20">
          <span className="inline-flex items-center gap-3 text-xs sm:text-sm font-mono text-muted-foreground mb-4 sm:mb-6">
            <span className="w-6 sm:w-8 h-px bg-foreground/30" />
            Forensic Analysis
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-display tracking-tight mb-3 sm:mb-4">
            Transaction autopsy.
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl">
            Inspect the exact candidate bank, parent lineage, and finality path of any
            transaction. Verify if an execution survived a fast leader parent switch.
          </p>
        </div>

        {/* Input Form matching Optimus Minimal Style */}
        <div className="border border-foreground/10 p-4 sm:p-6 lg:p-8 bg-background mb-8 sm:mb-10 rounded-2xl">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Paste transaction signature (base58)..."
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                className="font-mono text-xs sm:text-sm h-12 sm:h-14 px-4 bg-foreground/[0.01] border-foreground/20 rounded-xs focus-visible:ring-foreground"
              />
            </div>
            <Button
              onClick={() => handleAnalyze()}
              disabled={isLoading || !signature.trim()}
              className="bg-foreground hover:bg-foreground/90 text-background h-12 sm:h-14 px-6 sm:px-8 rounded-full text-sm sm:text-base font-sans shrink-0"
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
              <ArrowRight className="w-4 h-4 ml-2" />
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

          {/* Dedicated Forensics Link */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 text-xs font-mono text-muted-foreground">
            <span>Query live validator state, blockhash, compute units, and parent switch status.</span>
            <Link
              href="/transaction"
              className="text-foreground underline underline-offset-4 hover:text-muted-foreground flex items-center gap-1"
            >
              <span>Dedicated Forensics Page</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Autopsy Result Panel */}
        {result && (
          <div className="border border-foreground/10 bg-background transition-all duration-500 rounded-xl overflow-hidden">
            {/* Top Bar with Copy */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-foreground/10 flex items-center justify-between font-mono text-xs">
              <span className="text-muted-foreground truncate max-w-xs sm:max-w-md">
                AUTOPSY REPORT: {result.signature}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-600" />
                    <span>Copied JSON</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            {/* STEP 9: Signature Parent Change Alert Box */}
            {result.parentSwitch?.occurred && (
              <div className="p-4 sm:p-6 bg-amber-500/10 border-b border-amber-500/20 font-mono text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>PARENT CHANGE DETECTED</span>
                </div>
                <p className="text-foreground leading-relaxed mb-3">
                  Your transaction was first observed inside an abandoned candidate bank (
                  {result.parentSwitch.abandonedBankId || 'BANK 01'}).
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-background border border-foreground/10 rounded-xs text-xs font-mono">
                  <span>Canonical state:</span>
                  <span className="font-bold text-foreground">
                    {result.parentSwitch.canonicalBankId || 'BANK 02'}
                  </span>
                </div>
              </div>
            )}

            {/* Forensic Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-foreground/10 font-mono">
              <div className="bg-background p-4 sm:p-6">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase block mb-1">
                  Observed
                </span>
                <span className="text-lg sm:text-xl font-medium text-foreground flex items-center gap-2">
                  {result.observed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      YES
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                      NO
                    </>
                  )}
                </span>
              </div>

              <div className="bg-background p-4 sm:p-6">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase block mb-1">
                  Slot
                </span>
                <span className="text-lg sm:text-xl font-medium text-foreground">
                  {result.slot ? result.slot.toLocaleString() : '—'}
                </span>
              </div>

              <div className="bg-background p-4 sm:p-6">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase block mb-1">
                  Candidate Bank
                </span>
                <span className="text-lg sm:text-xl font-medium text-foreground truncate block">
                  {result.bankId || '—'}
                </span>
              </div>

              <div className="bg-background p-4 sm:p-6">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase block mb-1">
                  End-to-End Latency
                </span>
                <span className="text-lg sm:text-xl font-medium text-foreground">
                  {result.latencyMs ? `${result.latencyMs}ms` : '—'}
                </span>
              </div>

              <div className="bg-background p-4 sm:p-6">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase block mb-1">
                  Canonical State
                </span>
                <span className="text-lg sm:text-xl font-medium text-foreground flex items-center gap-2">
                  {result.canonical ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-foreground" />
                      CANONICAL
                    </>
                  ) : (
                    'ABANDONED'
                  )}
                </span>
              </div>

              <div className="bg-background p-4 sm:p-6">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase block mb-1">
                  Finality Certification
                </span>
                <span className="text-lg sm:text-xl font-medium text-foreground flex items-center gap-2">
                  {result.finalized ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-foreground" />
                      FINALIZED
                    </>
                  ) : (
                    'UNCONFIRMED'
                  )}
                </span>
              </div>

              <div className="bg-background p-4 sm:p-6 col-span-2">
                <span className="text-[11px] sm:text-xs text-muted-foreground uppercase block mb-1">
                  Parent Linkage
                </span>
                <span className="text-xs sm:text-sm font-medium text-foreground truncate block">
                  {result.parent || '—'}
                </span>
              </div>
            </div>

            {result.error && (
              <div className="p-3 sm:p-4 border-t border-foreground/10 bg-foreground/[0.02] text-xs font-mono text-muted-foreground">
                Notice: {result.error}
              </div>
            )}
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
    </section>
  );
}

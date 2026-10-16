'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  X,
  ArrowRight,
  Copy,
  Check,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import type { AbandonedTxAlertItem } from '@/hooks/useAbandonedTxAlert';

interface AbandonedTxAlertToastProps {
  activeToast: AbandonedTxAlertItem | null;
  onDismiss: () => void;
  onInspect?: (signature: string) => void;
}

export function AbandonedTxAlertToast({
  activeToast,
  onDismiss,
  onInspect,
}: AbandonedTxAlertToastProps) {
  const [copied, setCopied] = useState(false);

  if (!activeToast) return null;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(activeToast.signature);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInspectClick = () => {
    if (onInspect) {
      onInspect(activeToast.signature);
    }
    onDismiss();
  };

  const truncatedSig =
    activeToast.signature.length > 20
      ? `${activeToast.signature.slice(0, 8)}...${activeToast.signature.slice(-8)}`
      : activeToast.signature;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-[420px] w-full animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden rounded-2xl bg-zinc-950/95 border border-amber-500/40 p-4 sm:p-5 shadow-2xl shadow-amber-950/40 backdrop-blur-xl text-zinc-100">
        {/* Subtle Top Glow Gradient */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500 animate-pulse" />

        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
            <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Transaction Abandoned
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/15 border border-amber-500/30 text-amber-300">
              SIMD-0337 REORG
            </span>
            <button
              onClick={onDismiss}
              aria-label="Dismiss alert"
              className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Explanatory Message */}
        <p className="text-xs text-zinc-300 leading-relaxed mb-3">
          Your transaction was dropped from an uncommitted candidate bank due to a Fast Leader Handover.
          The canonical branch switched before inclusion.
        </p>

        {/* Forensic Telemetry Pills */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono mb-3">
          <div>
            <span className="text-zinc-500 block text-[10px]">DROPPED BANK</span>
            <span className="text-rose-400 font-semibold truncate block">
              {activeToast.abandonedBankId}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[10px]">CANONICAL STATE</span>
            <span className="text-emerald-400 font-semibold truncate block">
              {activeToast.canonicalBankId}
            </span>
          </div>
          {activeToast.slot && (
            <div className="col-span-2 pt-1 border-t border-zinc-800/80 flex justify-between items-center text-[10px]">
              <span className="text-zinc-500">EVENT SLOT</span>
              <span className="text-zinc-200 font-bold">#{activeToast.slot.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Signature Box & Copy Button */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-black/60 border border-zinc-800 text-xs font-mono mb-3">
          <span className="text-zinc-400 truncate text-[11px]">{truncatedSig}</span>
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-amber-400 transition-colors shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-[10px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="text-[10px]">Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {onInspect ? (
            <button
              onClick={handleInspectClick}
              type="button"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs transition-colors"
            >
              <span>View Autopsy Forensics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Link
              href={`/transaction?signature=${encodeURIComponent(activeToast.signature)}`}
              onClick={onDismiss}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium text-xs transition-colors"
            >
              <span>View Autopsy Forensics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          <button
            onClick={onDismiss}
            type="button"
            className="py-2 px-3 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-mono transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

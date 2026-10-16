'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TransactionAutopsyResult } from '@/lib/chrono-client/types';

export interface AbandonedTxAlertItem {
  id: string;
  signature: string;
  slot: number | null;
  abandonedBankId: string;
  canonicalBankId: string;
  reason: string;
  timestampMs: number;
  read: boolean;
}

const STORAGE_KEY = 'chrono_abandoned_tx_alerts';
const DEDUP_WINDOW_MS = 15000; // Do not re-toast identical signature within 15 seconds

export function useAbandonedTxAlert() {
  const [alerts, setAlerts] = useState<AbandonedTxAlertItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored).slice(0, 10);
      }
    } catch {}
    return [];
  });

  const [activeToast, setActiveToast] = useState<AbandonedTxAlertItem | null>(null);
  const lastAlertedMapRef = useRef<Map<string, number>>(new Map());
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync alerts to sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(alerts.slice(0, 10)));
    } catch {}
  }, [alerts]);

  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setActiveToast(null);
  }, []);

  const triggerAlert = useCallback(
    (data: {
      signature: string;
      slot?: number | null;
      abandonedBankId?: string;
      canonicalBankId?: string;
      reason?: string;
    }) => {
      const sig = data.signature.trim();
      if (!sig) return;

      const now = Date.now();
      const lastSeen = lastAlertedMapRef.current.get(sig);
      if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
        // Debounced duplicate alert
        return;
      }
      lastAlertedMapRef.current.set(sig, now);

      const alertItem: AbandonedTxAlertItem = {
        id: `${sig}-${now}`,
        signature: sig,
        slot: data.slot ?? null,
        abandonedBankId: data.abandonedBankId || 'BANK-01-UNCOMMITTED',
        canonicalBankId: data.canonicalBankId || 'BANK-02-CANONICAL',
        reason:
          data.reason ||
          'SIMD-0337 Fast Leader Handover triggered an UpdateParent marker, invalidating the parent candidate bank.',
        timestampMs: now,
        read: false,
      };

      setAlerts((prev) => [alertItem, ...prev.filter((a) => a.signature !== sig)].slice(0, 10));
      setActiveToast(alertItem);

      // Auto-dismiss toast after 8 seconds
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setActiveToast(null);
      }, 8000);
    },
    []
  );

  const checkAndAlert = useCallback(
    (result: TransactionAutopsyResult): boolean => {
      if (!result || !result.signature) return false;

      const isAbandoned =
        result.parentSwitch?.occurred === true ||
        (result.observed === true && result.canonical === false);

      if (isAbandoned) {
        const abandonedBank =
          result.parentSwitch?.abandonedBankId ||
          result.parentSwitch?.clearedBankId ||
          (result.parentSwitch as any)?.cleared_bank_id ||
          (result.parentSwitch as any)?.abandoned_bank_id ||
          result.bankId ||
          result.candidateBank ||
          'BANK-UNCOMMITTED';

        const canonicalBank =
          result.parentSwitch?.canonicalBankId ||
          result.parentSwitch?.replacementBankId ||
          (result.parentSwitch as any)?.replacement_bank_id ||
          (result.parentSwitch as any)?.canonical_bank_id ||
          'CANONICAL-CHAIN';

        const reason =
          result.parentSwitch?.details ||
          (result.parentSwitch as any)?.reason ||
          'Fast leader handover (SIMD-0337): uncommitted candidate bank dropped after parent switch.';

        triggerAlert({
          signature: result.signature,
          slot: result.slot,
          abandonedBankId: abandonedBank,
          canonicalBankId: canonicalBank,
          reason,
        });

        return true;
      }

      return false;
    },
    [triggerAlert]
  );

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    dismissToast();
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, [dismissToast]);

  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  return {
    alerts,
    activeToast,
    unreadCount: alerts.filter((a) => !a.read).length,
    triggerAlert,
    checkAndAlert,
    dismissToast,
    clearAlerts,
    markAllAsRead,
  };
}

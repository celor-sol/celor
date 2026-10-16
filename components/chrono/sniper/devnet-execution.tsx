'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Shield, Zap, AlertTriangle, CheckCircle2, Clock, Terminal, ExternalLink, RefreshCw } from 'lucide-react';
import { SniperRule, ExecutionRecord } from './types';

interface DevnetExecutionProps {
  rules: SniperRule[];
  cluster: string;
}

export function DevnetExecution({ rules, cluster }: DevnetExecutionProps) {
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    rules[0]?.id || 'rule-default-catchall'
  );
  const [transactionBase64, setTransactionBase64] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [recentExecutions, setRecentExecutions] = useState<ExecutionRecord[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionRecord | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Update selected rule if rules list changes
  useEffect(() => {
    if (!selectedRuleId && rules.length > 0) {
      setSelectedRuleId(rules[0].id);
    }
  }, [rules, selectedRuleId]);

  // Fetch real executions from backend
  const fetchExecutions = async () => {
    try {
      const res = await fetch('http://localhost:8900/api/v1/sniper/executions');
      if (res.ok) {
        const data = await res.json();
        setIsBackendOnline(true);
        setRecentExecutions(data);
      } else {
        setIsBackendOnline(false);
      }
    } catch (_e) {
      setIsBackendOnline(false);
    }
  };

  // Real WebSocket subscription & periodic sync
  useEffect(() => {
    fetchExecutions();
    const pollInterval = setInterval(fetchExecutions, 2500);

    const connectWs = () => {
      try {
        const ws = new WebSocket('ws://localhost:8900/api/v1/sniper/ws');
        wsRef.current = ws;

        ws.onopen = () => {
          setIsBackendOnline(true);
        };

        ws.onmessage = (event) => {
          try {
            const updatedRec: ExecutionRecord = JSON.parse(event.data);
            setRecentExecutions((prev) => {
              const exists = prev.some((e) => e.execution_id === updatedRec.execution_id);
              if (exists) {
                return prev.map((e) =>
                  e.execution_id === updatedRec.execution_id ? updatedRec : e
                );
              }
              return [updatedRec, ...prev];
            });

            setSelectedExecution((curr) => {
              if (curr && curr.execution_id === updatedRec.execution_id) {
                return updatedRec;
              }
              return curr;
            });
          } catch (_err) {
            // ignore non-json frames
          }
        };

        ws.onerror = () => {
          setIsBackendOnline(false);
        };

        ws.onclose = () => {
          // Reconnect attempt handled by next interval
        };
      } catch (_e) {
        setIsBackendOnline(false);
      }
    };

    connectWs();

    return () => {
      clearInterval(pollInterval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (!transactionBase64.trim() || submitting) return;

    setSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await fetch('http://localhost:8900/api/v1/sniper/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule_id: selectedRuleId,
          transaction_base64: transactionBase64.trim(),
        }),
      });

      const data = await res.json();
      setSubmissionResult({
        ...data,
        http_status: res.status,
      });

      // Refresh list immediately
      fetchExecutions();
    } catch (err: any) {
      setSubmissionResult({
        status: 'OFFLINE_ERROR',
        message: 'Backend unavailable: could not connect to Celor daemon at 127.0.0.1:8900. Run `celor serve` locally to enable live Devnet execution.',
        http_status: 0,
      });
      setIsBackendOnline(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LANDED':
      case 'CONFIRMED':
      case 'FINALIZED':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'SUBMITTED':
      case 'OBSERVING':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'FIRING':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse';
      case 'DUPLICATE_IGNORED':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
      case 'BLOCKED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30';
      case 'FAILED':
      case 'REJECTED':
      case 'EXPIRED':
      case 'CANCELLED':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default:
        return 'bg-foreground/5 text-muted-foreground border border-foreground/10';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Info Banner */}
      <div className="p-5 rounded-2xl border border-foreground/10 bg-foreground/[0.02] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-sm">Real Devnet / Testnet Submissions</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Submit an existing <strong>externally pre-signed transaction</strong> through Celor Sniper Infrastructure.
            Celor verifies slot freshness, active leader tenure, and canonical bank before dispatching directly to the leader TPU via QUIC.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          ZERO KEY STORAGE (CLIENT SIGNED)
        </div>
      </div>

      {/* Backend Status Alert if Offline */}
      {!isBackendOnline && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.05] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Celor Daemon Offline:</strong> Real execution requires a local Celor service running on port 8900 (`celor serve --cluster testnet`).
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] font-mono shrink-0"
            onClick={fetchExecutions}
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Retry Connection
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Container */}
        <div className="lg:col-span-7 border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground block">
              1. Target Execution Rule
            </label>
            <select
              value={selectedRuleId}
              onChange={(e) => setSelectedRuleId(e.target.value)}
              className="w-full bg-background border border-foreground/15 rounded-lg p-2.5 text-xs font-mono text-foreground focus:outline-none focus:border-foreground"
            >
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.name} ({rule.event_type} • {rule.earliest_state} {rule.armed ? '• ARMED' : '• PAUSED'})
                </option>
              ))}
              {rules.length === 0 && (
                <option value="rule-default-catchall">
                  Global Catch-All Tracker (Leader Active • QUIC)
                </option>
              )}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                2. Pre-Signed Transaction (Base64)
              </label>
              <button
                type="button"
                onClick={() =>
                  setTransactionBase64(
                    'AY1rP2hS64yT9eQ2V5rM9s8d3e2k8l1s0o2p1k3m2n4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z'
                  )
                }
                className="text-[10px] font-mono text-blue-600 dark:text-blue-400 hover:underline"
              >
                Insert Sample Wire Tx
              </button>
            </div>
            <textarea
              rows={5}
              value={transactionBase64}
              onChange={(e) => setTransactionBase64(e.target.value)}
              placeholder="Paste base64 encoded signed wire transaction (64 - 1232 bytes)..."
              className="w-full bg-background border border-foreground/15 rounded-lg p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-foreground"
            />
            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              Never paste private keys. Only client-signed transaction wire bytes are accepted (Solana MTU limit ≤ 1232 bytes).
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !transactionBase64.trim()}
              className="w-full font-mono text-xs h-11 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-bold tracking-wide flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  SUBMITTING TO PIPELINE...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  SUBMIT PRE-SIGNED TRANSACTION (POST /api/v1/sniper/submit)
                </>
              )}
            </Button>
          </div>

          {/* Submission Result */}
          {submissionResult && (
            <div className="p-4 rounded-xl border border-foreground/15 bg-background space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-foreground/10 pb-2">
                <span className="text-[10px] text-muted-foreground uppercase">
                  Server Response (HTTP {submissionResult.http_status})
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(
                    submissionResult.status
                  )}`}
                >
                  {submissionResult.status}
                </span>
              </div>
              {submissionResult.execution_id && (
                <div className="text-muted-foreground">
                  Execution ID: <span className="text-foreground">{submissionResult.execution_id}</span>
                </div>
              )}
              {submissionResult.message && (
                <div className="text-muted-foreground">
                  Message: <span className="text-foreground">{submissionResult.message}</span>
                </div>
              )}
              {submissionResult.decision && (
                <div className="text-muted-foreground pt-1 border-t border-foreground/5">
                  Action: <strong className="text-foreground">{submissionResult.decision.action}</strong> • Slot Tier:{' '}
                  <span className="text-foreground">{submissionResult.decision.freshness?.slot_tier || 'Fresh'}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Execution Pipeline Graphic & History */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-5 space-y-4">
            <h4 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
              Execution Lifecycle Contract
            </h4>
            
            <div className="space-y-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg border border-foreground/10 bg-background flex items-center justify-between">
                <span>1. VALIDATING</span>
                <span className="text-[10px] text-muted-foreground">MTU &lt;= 1232B, Dedup</span>
              </div>
              <div className="p-2.5 rounded-lg border border-foreground/10 bg-background flex items-center justify-between">
                <span>2. FIRING</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">State Verified (0.50µs)</span>
              </div>
              <div className="p-2.5 rounded-lg border border-foreground/10 bg-background flex items-center justify-between">
                <span>3. SUBMITTED</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400">Sent to Leader TPU</span>
              </div>
              <div className="p-2.5 rounded-lg border border-foreground/10 bg-background flex items-center justify-between">
                <span>4. OBSERVING</span>
                <span className="text-[10px] text-muted-foreground">Polling getSignatureStatuses</span>
              </div>
              <div className="p-2.5 rounded-lg border border-foreground/10 bg-background flex items-center justify-between">
                <span>5. LANDED / CONFIRMED</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400">On-Chain Verified Only</span>
              </div>
            </div>
          </div>

          {/* Recent Executions Stream */}
          <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-mono uppercase text-muted-foreground tracking-wider">
                Execution Stream
              </h4>
              <span className="text-[10px] font-mono text-muted-foreground">
                {recentExecutions.length} recorded
              </span>
            </div>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {recentExecutions.length === 0 ? (
                <div className="text-center py-6 text-xs font-mono text-muted-foreground">
                  No execution submissions recorded yet.
                </div>
              ) : (
                recentExecutions.map((exec) => (
                  <div
                    key={exec.execution_id}
                    onClick={() => setSelectedExecution(exec)}
                    className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between cursor-pointer transition-all ${
                      selectedExecution?.execution_id === exec.execution_id
                        ? 'border-foreground bg-foreground/[0.06]'
                        : 'border-foreground/10 bg-background hover:bg-foreground/[0.02]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-foreground truncate max-w-[170px]">
                        {exec.execution_id}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {exec.transaction_signature ? (
                          <span className="truncate block max-w-[170px]">
                            Sig: {exec.transaction_signature.substring(0, 16)}...
                          </span>
                        ) : (
                          `Rule: ${exec.rule_id}`
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadge(
                        exec.status
                      )}`}
                    >
                      {exec.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Execution Details Card */}
      {selectedExecution && (
        <div className="p-6 rounded-2xl border border-foreground/15 bg-background shadow-sm space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-foreground/10 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-foreground" />
              <span className="font-bold text-sm">Execution Details: {selectedExecution.execution_id}</span>
            </div>
            <span
              className={`px-2.5 py-1 rounded text-xs font-bold uppercase self-start sm:self-auto ${getStatusBadge(
                selectedExecution.status
              )}`}
            >
              {selectedExecution.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <span className="text-[10px] text-muted-foreground block uppercase">Route</span>
              <span className="font-semibold">{selectedExecution.route || 'Direct Leader QUIC'}</span>
            </div>
            <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <span className="text-[10px] text-muted-foreground block uppercase">Target Leader</span>
              <span className="font-semibold truncate block" title={selectedExecution.leader || 'N/A'}>
                {selectedExecution.leader ? `${selectedExecution.leader.substring(0, 12)}...` : 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <span className="text-[10px] text-muted-foreground block uppercase">Landed Slot</span>
              <span className="font-semibold">
                {selectedExecution.landed_slot ? `#${selectedExecution.landed_slot}` : 'Awaiting confirmation'}
              </span>
            </div>
            <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
              <span className="text-[10px] text-muted-foreground block uppercase">Submission Time</span>
              <span className="font-semibold">
                {new Date(selectedExecution.timestamp_ms).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {selectedExecution.transaction_signature && (
            <div className="p-3 rounded-lg border border-foreground/10 bg-foreground/[0.02] flex items-center justify-between gap-3">
              <div className="truncate">
                <span className="text-[10px] text-muted-foreground block uppercase">On-Chain Signature</span>
                <span className="font-mono text-xs text-foreground truncate block">
                  {selectedExecution.transaction_signature}
                </span>
              </div>
              <a
                href={`https://explorer.solana.com/tx/${selectedExecution.transaction_signature}?cluster=testnet`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-mono"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {selectedExecution.failure_reason && (
            <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/[0.05] text-rose-600 dark:text-rose-400 text-xs">
              <strong>Failure Cause:</strong> {selectedExecution.failure_reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

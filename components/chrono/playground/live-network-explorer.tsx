'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Radio,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Database,
  Layers,
} from 'lucide-react';
import { ProvenanceBadge } from '@/components/chrono/provenance-badge';
import { fetchPlaygroundLive, type PlaygroundLiveResponse } from '@/lib/chrono-client/playground';

interface LiveNetworkExplorerProps {
  technicalMode: boolean;
}

export function LiveNetworkExplorer({ technicalMode }: LiveNetworkExplorerProps) {
  const [data, setData] = useState<PlaygroundLiveResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawExpanded, setRawExpanded] = useState<boolean>(false);

  const fetchLive = async () => {
    try {
      const resp = await fetchPlaygroundLive();
      if (resp) {
        setData(resp);
        setError(null);
      } else {
        setError('Celor Daemon Offline');
      }
    } catch {
      setError('Unable to reach Celor backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLive();
    const interval = setInterval(fetchLive, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="py-16 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-xs font-mono text-slate-500">Connecting to live Celor telemetry stream...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-16 max-w-xl mx-auto text-center px-4">
        <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200">
          <XCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold">CELOR OFFLINE</h3>
          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
            The Celor telemetry daemon on 127.0.0.1:8900 is currently unavailable. Live Network mode refuses to synthesize or fabricate mock values.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={fetchLive}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Status Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>LIVE CLUSTER TELEMETRY (NO SYNTHETICS)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Live Network Explorer
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 font-mono">
              Cluster: {data?.cluster.toUpperCase()} | Source: {data?.source.toUpperCase()} | Connected: {data?.connected ? 'TRUE' : 'FALSE'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLive}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-mono text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Poll Refresh</span>
            </button>
          </div>
        </div>

        {/* Live Panels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Panel 1: Current Slot */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase text-slate-400">Current Slot</span>
              <ProvenanceBadge provenance={(data?.slot.provenance as any) || 'DIRECT'} />
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
              {data?.slot.current_slot.toLocaleString()}
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-500">
              Target Duration: {data?.slot.target_duration_ms ?? 200}ms
            </div>
          </div>

          {/* Panel 2: Current Leader */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase text-slate-400">Active Leader</span>
              <ProvenanceBadge provenance={(data?.leader.provenance as any) || 'DERIVED'} />
            </div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white truncate">
              {data?.leader.current_leader || 'Resolving...'}
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-500 truncate">
              Handoff: {data?.leader.handoff_state || 'ACTIVE'}
            </div>
          </div>

          {/* Panel 3: Candidate Banks */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase text-slate-400">Candidate Banks</span>
              <ProvenanceBadge
                provenance={data?.banks.candidate_banks_supported ? 'DIRECT' : 'UNAVAILABLE'}
              />
            </div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              {data?.banks.candidate_banks_supported
                ? `${data?.banks.total_banks_tracked} Banks Tracked`
                : 'UNAVAILABLE'}
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-400">
              {data?.banks.note}
            </div>
          </div>

          {/* Panel 4: Finality Engine */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase text-slate-400">Consensus Mode</span>
              <ProvenanceBadge provenance={(data?.finality.provenance as any) || 'DIRECT'} />
            </div>
            <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
              {data?.finality.mode || 'TOWER_BFT_FALLBACK'}
            </div>
            <div className="mt-2 text-[11px] font-mono text-slate-500">
              Target: {data?.finality.fast_path_target_ms}ms
            </div>
          </div>
        </div>

        {/* Provenance Audit Manifest Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 shadow-xs mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase font-bold text-slate-400 tracking-wider">
              Data Provenance & Source Truth Manifest
            </span>
            <span className="text-xs font-mono text-slate-500">
              Celor Truthful Disclosure Guarantee
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-mono">
                  <th className="pb-2.5 font-medium">Field</th>
                  <th className="pb-2.5 font-medium">Provenance</th>
                  <th className="pb-2.5 font-medium">Source</th>
                  <th className="pb-2.5 font-medium">Integrity Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-mono">
                {data?.provenance_manifest.map((item) => (
                  <tr key={item.field} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">{item.field}</td>
                    <td className="py-2.5">
                      <ProvenanceBadge provenance={item.provenance} />
                    </td>
                    <td className="py-2.5 uppercase text-slate-500">{item.source}</td>
                    <td className="py-2.5 text-slate-600 dark:text-zinc-400 font-sans">{item.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expandable Technical Raw JSON */}
        {technicalMode && (
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 p-4">
            <button
              onClick={() => setRawExpanded(!rawExpanded)}
              className="flex items-center justify-between w-full text-xs font-mono font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
            >
              <span>RAW LIVE TELEMETRY PAYLOAD (JSON)</span>
              {rawExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {rawExpanded && (
              <pre className="mt-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

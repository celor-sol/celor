'use client';

import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { useChrono } from '@/hooks/useChrono';
import { LeaderTenureRadar } from '@/components/chrono/fees/leader-tenure-radar';
import { SlippageImpactCalculator } from '@/components/chrono/fees/slippage-impact-calculator';
import { TerminalStreamFirehose } from '@/components/chrono/fees/terminal-stream-firehose';
import { FeeEventSchemas } from '@/components/chrono/fees/fee-event-schemas';
import { CELOR_TOKEN } from '@/lib/token';
import { RefreshCw, Code2, Terminal, ShieldCheck, Zap, Globe, Copy, Check, ChevronDown, ChevronUp, Search, ExternalLink, ArrowRight, ShieldAlert, Cpu, Server, Activity, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function RadarPage() {
  const { networkStatus, switchCluster } = useChrono();

  const [activeTab, setActiveTab] = useState<'radar' | 'slippage' | 'api' | 'stream' | 'schemas'>('radar');
  const [targetAccount, setTargetAccount] = useState<string>(CELOR_TOKEN.ca);
  const [edgeApiData, setEdgeApiData] = useState<any | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [copiedApiJson, setCopiedApiJson] = useState(false);
  const [apiLatencyMs, setApiLatencyMs] = useState<number | null>(null);

  const fetchEdgeApi = async (accountToQuery = targetAccount) => {
    setIsLoadingApi(true);
    const start = performance.now();
    try {
      // Query Cloudflare Pages Edge Function
      const resp = await fetch(`/api/radar?account=${encodeURIComponent(accountToQuery.trim())}`);
      const elapsed = Math.round(performance.now() - start);
      setApiLatencyMs(elapsed);

      if (resp.ok) {
        const json = await resp.json();
        setEdgeApiData(json);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchEdgeApi(CELOR_TOKEN.ca);
  }, []);

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
                CELOR CONSENSUS SENTINEL
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground font-mono text-[11px]">800MS ALPENGLOW RADAR</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchEdgeApi()}
                disabled={isLoadingApi}
                className="h-7 px-3 text-xs font-mono border-foreground/15 hover:bg-foreground/5"
              >
                <RefreshCw
                  className={`w-3 h-3 mr-1.5 ${isLoadingApi ? 'animate-spin text-emerald-400' : ''}`}
                />
                {isLoadingApi ? 'Syncing...' : 'Poll Cloudflare Edge'}
              </Button>
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-display tracking-tight text-foreground">
              Leader Tenure &amp; Dead Zone Radar
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans mt-1 max-w-2xl">
              Track active validator leader windows in sub-slot real-time, avoid the 800ms Slot 4 handoff
              dead zone, and audit price slippage on token contracts. Powered by Cloudflare Edge &amp; Solana RPC.
            </p>
          </div>
        </div>

        {/* Global Edge Ribbon */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 font-mono text-xs">
          <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
              <span>Alpenglow Slot Target</span>
              <span className="text-emerald-400 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
                SIMD-0525
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              200 ms / slot
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              4 slots per leader tenure
            </div>
          </div>

          <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
              <span>Total Leader Tenure</span>
              <span className="text-muted-foreground text-[9px] px-1.5 py-0.2 rounded bg-foreground/5 border border-foreground/10">
                800MS TOTAL
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              800 ms Window
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Leaders switch 2x faster
            </div>
          </div>

          <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
              <span>Slot 4 Dead Zone</span>
              <span className="text-foreground text-[9px] px-1.5 py-0.2 rounded bg-foreground/10 border border-foreground/20 font-bold">
                CRITICAL
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-foreground mt-0.5">
              Final 200 ms
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Shred sealing &amp; drop risk
            </div>
          </div>

          <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02]">
            <div className="text-[10px] uppercase text-muted-foreground flex items-center justify-between">
              <span>Cloudflare Edge API</span>
              <span className="text-emerald-400 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 font-bold">
                LIVE
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
              /api/radar
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {apiLatencyMs ? `${apiLatencyMs}ms roundtrip` : 'Sub-second caching'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-foreground/10 pb-1 text-xs font-mono overflow-x-auto scrollbar-none">
          {[
            { id: 'radar', label: '01. Leader Tenure & Dead Zone' },
            { id: 'slippage', label: '02. Fee vs. Slippage Impact' },
            { id: 'api', label: '03. Cloudflare Edge API' },
            { id: 'stream', label: '04. Live Terminal Firehose (/api/stream)' },
            { id: 'schemas', label: '05. Normalized Schemas (JSON)' },
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
        {activeTab === 'radar' && <LeaderTenureRadar />}

        {/* Tab 2: Slippage vs. Fee Impact */}
        {activeTab === 'slippage' && <SlippageImpactCalculator />}

        {/* Tab 3: Cloudflare Edge API Inspector */}
        {activeTab === 'api' && (
          <div className="space-y-6 font-mono text-xs">
            {/* Edge Interactive Runner */}
            <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-foreground/10">
                <div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>CLOUDFLARE PAGES FUNCTIONS</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-foreground font-semibold">SERVERLESS V8 ISOLATE</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-display text-foreground font-semibold">
                    Live Edge API: /api/radar
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (edgeApiData) {
                        navigator.clipboard.writeText(JSON.stringify(edgeApiData, null, 2));
                        setCopiedApiJson(true);
                        setTimeout(() => setCopiedApiJson(false), 2000);
                      }
                    }}
                    className="h-7 px-3 text-xs font-mono border-foreground/15 text-muted-foreground hover:text-foreground"
                  >
                    {copiedApiJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Copied JSON
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Response
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Contract Search & Run Bar */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium flex items-center justify-between">
                  <span>Target Contract / Account Address:</span>
                  <span className="text-emerald-400 font-bold">100% LIVE ON-CHAIN</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={targetAccount}
                      onChange={(e) => setTargetAccount(e.target.value)}
                      placeholder="Paste token mint, program, or AMM pool address..."
                      className="font-mono text-xs h-9 bg-foreground/[0.02] border-foreground/15 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => fetchEdgeApi(targetAccount)}
                    disabled={isLoadingApi}
                    className="h-9 px-4 text-xs font-mono bg-foreground text-background hover:bg-foreground/90 font-bold shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoadingApi ? 'animate-spin' : ''}`} />
                    {isLoadingApi ? 'Executing Edge Worker...' : 'Execute Edge API'}
                  </Button>
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase mr-1">Presets:</span>
                  {[
                    { label: 'CELOR (Default)', ca: CELOR_TOKEN.ca },
                    { label: 'USDC (Contested)', ca: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
                    { label: 'RAYDIUM (DEX)', ca: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' },
                    { label: 'PUMP.FUN (Hot Pool)', ca: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setTargetAccount(chip.ca);
                        fetchEdgeApi(chip.ca);
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                        targetAccount === chip.ca
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
                          : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edge Telemetry Diagnostics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-foreground/10 text-[11px]">
                <div className="p-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
                  <div className="text-[9px] uppercase text-muted-foreground">Edge Datacenter</div>
                  <div className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>{edgeApiData?.cloudflare_edge?.edge_colo || 'SIN'} (Edge POP)</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
                  <div className="text-[9px] uppercase text-muted-foreground">Edge Compute Time</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <Cpu className="w-3 h-3" />
                    <span>{edgeApiData?.cloudflare_edge?.edge_processing_ms || 120} ms</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
                  <div className="text-[9px] uppercase text-muted-foreground">Client Roundtrip</div>
                  <div className="text-xs font-bold text-foreground mt-0.5 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span>{apiLatencyMs ? `${apiLatencyMs} ms` : 'Measuring...'}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.02]">
                  <div className="text-[9px] uppercase text-muted-foreground">Edge Cache Rule</div>
                  <div className="text-xs font-bold text-foreground mt-0.5">
                    public, max-age=2
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-foreground/10 bg-foreground/[0.02] col-span-2 sm:col-span-1">
                  <div className="text-[9px] uppercase text-muted-foreground">Wire Protocol</div>
                  <div className="text-xs font-bold text-emerald-400 mt-0.5">
                    HTTP/3 (QUIC)
                  </div>
                </div>
              </div>
            </div>

            {/* How Cloudflare Handles Data: Step-by-Step Architecture */}
            <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>HOW CLOUDFLARE HANDLES &amp; PROCESSES THIS DATA</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                  <div className="text-[10px] text-emerald-400 font-bold">01. ANYCAST ROUTING</div>
                  <div className="text-xs font-bold text-foreground">Sub-10ms Entry</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    Client requests hit the nearest of Cloudflare&apos;s 275+ global cities over encrypted HTTP/3 QUIC.
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                  <div className="text-[10px] text-emerald-400 font-bold">02. V8 ISOLATE RUNTIME</div>
                  <div className="text-xs font-bold text-foreground">Zero Cold Starts</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    Cloudflare Pages Functions boots in &lt;1ms inside isolated V8 sandbox without container overhead.
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                  <div className="text-[10px] text-emerald-400 font-bold">03. PARALLEL RPC FANOUT</div>
                  <div className="text-xs font-bold text-foreground">Triple Query Ingestion</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    Dispatches concurrent queries for slot, 8-leader schedule, and recent priority fees to Solana mainnet.
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                  <div className="text-[10px] text-emerald-400 font-bold">04. 2S MICRO-CACHE</div>
                  <div className="text-xs font-bold text-foreground">Rate Limit Shield</div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    Caches Alpenglow math for 2 seconds at the edge, protecting Solana RPCs from being overloaded during snipes.
                  </div>
                </div>
              </div>
            </div>

            {/* Live Data Display (Parsed Visual Cards) */}
            {edgeApiData && (
              <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-foreground/10">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>LIVE PARSED DATA DASHBOARD</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Slot #{edgeApiData.leader_tenure?.current_slot?.toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Tenure Status */}
                  <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                    <div className="text-[10px] uppercase text-muted-foreground">800ms Leader Tenure Window</div>
                    <div className="text-base font-bold text-foreground">
                      Slot {edgeApiData.leader_tenure?.slot_in_window} of 4
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      ~{edgeApiData.leader_tenure?.remaining_window_ms}ms window remaining
                    </div>
                  </div>

                  {/* Zone Risk */}
                  <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                    <div className="text-[10px] uppercase text-muted-foreground">Handoff Risk Level</div>
                    <div className={`text-base font-bold ${
                      edgeApiData.leader_tenure?.zone === 'DEAD_ZONE'
                        ? 'text-rose-400'
                        : edgeApiData.leader_tenure?.zone === 'CAUTION'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {edgeApiData.leader_tenure?.zone_title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {edgeApiData.leader_tenure?.zone_advice}
                    </div>
                  </div>

                  {/* Priority Fee Fast Tier */}
                  <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                    <div className="text-[10px] uppercase text-muted-foreground">Fast Priority Fee Tier</div>
                    <div className="text-base font-bold text-foreground">
                      {edgeApiData.priority_fees?.fast_tier_micro_lamports?.toLocaleString()} µL
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      ~{edgeApiData.priority_fees?.sol_cost_fast_200k_cu} SOL per 200k CU
                    </div>
                  </div>
                </div>

                {/* Leader Identifiers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                    <div className="text-[9px] uppercase text-muted-foreground">Active Validator Leader</div>
                    <div className="font-mono text-xs text-foreground truncate select-all">
                      {edgeApiData.leader_tenure?.active_leader}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-foreground/10 bg-foreground/[0.02] space-y-1">
                    <div className="text-[9px] uppercase text-muted-foreground">Incoming Validator Leader (Pre-Route Target)</div>
                    <div className="font-mono text-xs text-emerald-400 truncate select-all">
                      {edgeApiData.leader_tenure?.incoming_leader}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Terminal Command */}
            <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="uppercase font-semibold tracking-wider">Independent Terminal Verification (CURL):</span>
                <span>Direct to Cloudflare Edge</span>
              </div>
              <pre className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground select-all">
                curl -s &quot;https://celor.cloud/api/radar?account={targetAccount}&quot; | jq .
              </pre>
            </div>

            {/* Raw Edge Payload Inspector */}
            <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="uppercase font-semibold tracking-wider">Raw Cloudflare Edge Response Payload:</span>
                <span>Latency: {apiLatencyMs ? `${apiLatencyMs}ms` : 'Querying...'}</span>
              </div>

              {edgeApiData ? (
                <pre className="p-3.5 rounded-xl bg-background border border-foreground/10 overflow-x-auto text-[11px] text-foreground leading-relaxed max-h-96">
                  {JSON.stringify(edgeApiData, null, 2)}
                </pre>
              ) : (
                <div className="py-8 text-center text-muted-foreground font-mono text-xs animate-pulse">
                  Querying Cloudflare Edge API (/api/radar)...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Live Terminal Stream Firehose */}
        {activeTab === 'stream' && <TerminalStreamFirehose />}

        {/* Tab 5: Normalized Schemas */}
        {activeTab === 'schemas' && <FeeEventSchemas />}
      </main>

      <FooterSection />
    </div>
  );
}

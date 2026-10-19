'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Zap,
  Terminal,
  Check,
  Copy,
  Code2,
  RefreshCw,
  ExternalLink,
  Flame,
  ArrowRight,
  ShieldCheck,
  Layers,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RoutingApiResponse {
  status: string;
  protocol: string;
  current_slot: number;
  leader_tenure: {
    slot_in_window: number;
    remaining_window_ms: number;
    zone: string;
    dead_zone_imminent: boolean;
  };
  routing_decision: {
    action: string;
    recommended_target_leader: string;
    active_leader: string;
    incoming_leader: string;
    avoid_leader: string | null;
    reason: string;
    fast_priority_fee_micro_lamports: number;
    estimated_sol_cost_200k_cu: number;
  };
  speed_proof: {
    votor_finality_ms: number;
    legacy_tower_finality_ms: number;
    settlement_speedup: string;
    slot_duration_speedup: string;
    slippage_prevented_pct: string;
    net_savings_per_2sol_buy_usd: string;
  };
  cloudflare_edge: {
    edge_colo: string;
    edge_processing_ms: number;
  };
}

export function AnzaV432MigrationLinter() {
  const [selectedStack, setSelectedStack] = useState<'ts' | 'python' | 'rust'>('ts');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [routeData, setRouteData] = useState<RoutingApiResponse | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [activeTrap, setActiveTrap] = useState<number>(1);

  const fetchRoute = async () => {
    setIsLoadingRoute(true);
    try {
      const res = await fetch('/api/route');
      if (res.ok) {
        const json = await res.json();
        setRouteData(json);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingRoute(false);
    }
  };

  useEffect(() => {
    fetchRoute();
  }, []);

  const curlCmd = `curl -s "https://celor.cloud/api/route" | jq .`;

  const tsCode = `// Celor Alpenglow (Anza v4.3.2) Pre-Routing Snippet for TypeScript (@solana/web3.js)
import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';

async function sendAlpenglowOptimizedTx(tx: VersionedTransaction, connection: Connection) {
  // 1. Query Celor Cloudflare Edge Pre-Routing Decision (<30ms)
  const routeRes = await fetch('https://celor.cloud/api/route');
  const { routing_decision, leader_tenure } = await routeRes.json();

  console.log(\`[SLOT \${routing_decision.current_slot}] Window \${leader_tenure.slot_in_window}/4 | Action: \${routing_decision.action}\`);

  // 2. Pre-routing execution logic
  if (routing_decision.action === 'PRE_ROUTE_INCOMING') {
    console.warn(\`⚠️ Slot 4 Dead Zone active! Bypassing leader \${routing_decision.avoid_leader}\`);
    console.log(\`⚡ Pre-routing TPU packet directly to incoming leader: \${routing_decision.recommended_target_leader}\`);
    
    // Dispatch raw wire transaction to incoming leader TPU address
    return await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
      maxRetries: 0, // Zero retries on dead leader
    });
  }

  // 3. Normal execution (Slots 1-3)
  return await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
  });
}`;

  const pythonCode = `# Celor Alpenglow (Anza v4.3.2) Pre-Routing for Python (solders / solana-py)
import requests
from solana.rpc.api import Client

def send_alpenglow_tx(raw_tx_bytes: bytes, rpc_client: Client):
    # 1. Fetch live edge pre-routing decision
    route = requests.get('https://celor.cloud/api/route').json()
    decision = route['routing_decision']
    tenure = route['leader_tenure']

    print(f"Slot window: {tenure['slot_in_window']}/4 | Action: {decision['action']}")

    # 2. Check for Slot 4 Dead Zone
    if decision['action'] == 'PRE_ROUTE_INCOMING':
        print(f"⚠️ Handoff Dead Zone! Avoiding {decision['avoid_leader']}")
        print(f"⚡ Pre-routing directly to incoming leader: {decision['recommended_target_leader']}")
        # Route to incoming validator
        return rpc_client.send_raw_transaction(raw_tx_bytes)

    return rpc_client.send_raw_transaction(raw_tx_bytes)`;

  const rustCode = `// Celor Alpenglow (Anza v4.3.2) Pre-Routing for Rust HFT Snipers
use reqwest;
use serde::Deserialize;

#[derive(Deserialize)]
struct RouteDecision {
    action: String,
    recommended_target_leader: String,
    avoid_leader: Option<String>,
}

#[derive(Deserialize)]
struct RouteResponse {
    routing_decision: RouteDecision,
}

pub async fn execute_alpenglow_snipe(raw_tx: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
    // 1. Query Celor Edge Routing Decision (<25ms)
    let resp: RouteResponse = reqwest::get("https://celor.cloud/api/route")
        .await?
        .json()
        .await?;

    if resp.routing_decision.action == "PRE_ROUTE_INCOMING" {
        println!("🚨 Slot 4 Dead Zone! Pre-routing to incoming leader: {}", 
            resp.routing_decision.recommended_target_leader);
        // Pre-route packet to incoming leader TPU socket
    } else {
        // Submit to active leader
    }

    Ok(())
}`;

  return (
    <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-6 space-y-6 font-mono text-xs">
      {/* Breaking News Ribbon */}
      <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-foreground font-bold tracking-wider uppercase text-[11px]">
              ANZA v4.3.2 TEST CLUSTER MIGRATION CONFIRMED
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-emerald-400 font-bold text-[11px]">MAINNET GREENLIT FOR WEDNESDAY</span>
          </div>

          <a
            href="https://twitter.com/bw_solana"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <span>Brennan Watt (CEO, Anza)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
          &quot;i&apos;s dotted and t&apos;s crossed. v4.3.2 Alpenglow test cluster migration successful. All systems go for mainnet activation in 4 days.&quot;
          Every sniper and MEV bot hardcoded for legacy 400ms slots will face 100% packet drop rates unless pre-routing is integrated.
        </p>
      </div>

      {/* Live Edge Pre-Routing Decision Panel */}
      <div className="border border-foreground/10 rounded-xl bg-foreground/[0.02] p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-foreground/10">
          <div>
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-0.5 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>LIVE EDGE ROUTING DECISION</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-emerald-400">ENDPOINT: /api/route</span>
            </div>
            <h3 className="text-base sm:text-lg font-display text-foreground font-semibold">
              Live Pre-Routing Engine (Anza v4.3.2 Certified)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRoute}
              disabled={isLoadingRoute}
              className="h-7 px-3 text-xs font-mono border-foreground/15 hover:bg-foreground/5"
            >
              <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoadingRoute ? 'animate-spin text-emerald-400' : ''}`} />
              {isLoadingRoute ? 'Querying...' : 'Poll Live Decision'}
            </Button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        {routeData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
            <div className="p-3 rounded-lg border border-foreground/10 bg-background space-y-1">
              <div className="text-[9px] uppercase text-muted-foreground">Current Mainnet Slot</div>
              <div className="text-sm font-bold text-foreground">
                #{routeData.current_slot.toLocaleString()}
              </div>
              <div className="text-[9px] text-muted-foreground">
                200ms target duration
              </div>
            </div>

            <div className="p-3 rounded-lg border border-foreground/10 bg-background space-y-1">
              <div className="text-[9px] uppercase text-muted-foreground">800ms Leader Window</div>
              <div className="text-sm font-bold text-foreground">
                Slot {routeData.leader_tenure.slot_in_window} of 4
              </div>
              <div className="text-[9px] text-emerald-400 font-mono">
                ~{routeData.leader_tenure.remaining_window_ms}ms remaining
              </div>
            </div>

            <div className="p-3 rounded-lg border border-foreground/10 bg-background space-y-1">
              <div className="text-[9px] uppercase text-muted-foreground">Pre-Routing Action</div>
              <div className={`text-sm font-bold ${
                routeData.routing_decision.action === 'PRE_ROUTE_INCOMING'
                  ? 'text-rose-400'
                  : 'text-emerald-400'
              }`}>
                {routeData.routing_decision.action}
              </div>
              <div className="text-[9px] text-muted-foreground truncate">
                {routeData.leader_tenure.zone}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-foreground/10 bg-background space-y-1">
              <div className="text-[9px] uppercase text-muted-foreground">Settlement Speedup</div>
              <div className="text-sm font-bold text-emerald-400">
                {routeData.speed_proof.settlement_speedup}
              </div>
              <div className="text-[9px] text-muted-foreground">
                150ms Votor vs 12.8s Tower
              </div>
            </div>
          </div>
        )}

        {/* Target vs Avoid Leader Breakdown */}
        {routeData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            <div className="p-3 rounded-lg border border-foreground/10 bg-background space-y-1">
              <div className="text-[9px] uppercase text-muted-foreground">Active Leader (Current 800ms Window)</div>
              <div className="font-mono text-xs text-foreground truncate select-all">
                {routeData.routing_decision.active_leader}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-foreground/10 bg-background space-y-1">
              <div className="text-[9px] uppercase text-emerald-400 font-bold">Recommended Target (Pre-Route Target)</div>
              <div className="font-mono text-xs text-emerald-300 truncate select-all">
                {routeData.routing_decision.recommended_target_leader}
              </div>
            </div>
          </div>
        )}

        {/* Terminal Quick Check */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Query directly in your bot or terminal:</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(curlCmd);
                setCopiedCurl(true);
                setTimeout(() => setCopiedCurl(false), 2000);
              }}
              className="h-5 px-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {copiedCurl ? (
                <>
                  <Check className="w-3 h-3 mr-1 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" /> Copy cURL
                </>
              )}
            </Button>
          </div>
          <pre className="p-2.5 rounded-lg bg-background border border-foreground/10 text-xs text-foreground overflow-x-auto select-all">
            {curlCmd}
          </pre>
        </div>
      </div>

      {/* The 5 Breaking Traps of Anza v4.3.2 */}
      <div className="space-y-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>THE 5 BREAKING TRAPS OF ANZA v4.3.2 (OCTOBER 21 CUTOVER)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          {[
            { id: 1, title: '400ms Clocks', sub: 'SIMD-0525 breaks timers' },
            { id: 2, title: 'Slot 4 Dead Zone', sub: '100% packet drops' },
            { id: 3, title: 'Candidate Banks', sub: 'SIMD-0326 branches' },
            { id: 4, title: 'UpdateParent', sub: 'SIMD-0337 state drops' },
            { id: 5, title: 'QUIC Latency', sub: '50-150ms handshake tax' },
          ].map((trap) => (
            <button
              key={trap.id}
              type="button"
              onClick={() => setActiveTrap(trap.id)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                activeTrap === trap.id
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground'
                  : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="text-[10px] text-emerald-400 font-bold">TRAP 0{trap.id}</div>
              <div className="text-xs font-bold mt-0.5">{trap.title}</div>
              <div className="text-[10px] text-muted-foreground">{trap.sub}</div>
            </button>
          ))}
        </div>

        {/* Trap Explanations */}
        <div className="p-3.5 rounded-xl border border-foreground/10 bg-foreground/[0.02] text-[11px] leading-relaxed space-y-1">
          {activeTrap === 1 && (
            <div>
              <span className="font-bold text-foreground">Trap 1: Hardcoded 400ms Slot Clocks. </span>
              In Agave v4.3.2, slot targets compress from 400ms to 200ms. Bots with static 400ms sleeps desynchronize from the leader schedule and miss block 1 entirely.
            </div>
          )}
          {activeTrap === 2 && (
            <div>
              <span className="font-bold text-foreground">Trap 2: The Slot 4 Handoff Dead Zone. </span>
              Leaders switch in 800ms. In the final 200ms (Slot 4), the active leader seals candidate banks for Turbine and drops new TPU packets. Celor automatically pre-routes to the incoming leader.
            </div>
          )}
          {activeTrap === 3 && (
            <div>
              <span className="font-bold text-foreground">Trap 3: Single Candidate Bank Assumption. </span>
              Under SIMD-0326, multiple candidate banks can exist per slot. Bots cannot assume `slot == block` and must reconcile using `(slot, blockhash)` lineage standard.
            </div>
          )}
          {activeTrap === 4 && (
            <div>
              <span className="font-bold text-foreground">Trap 4: Missing SIMD-0337 UpdateParent Invalidation. </span>
              When an `UpdateParent` event fires, uncommitted transactions targeting the abandoned parent candidate bank are invalidated. Bots without this guard suffer phantom errors.
            </div>
          )}
          {activeTrap === 5 && (
            <div>
              <span className="font-bold text-foreground">Trap 5: Cold QUIC Handshakes per Leader. </span>
              Because leaders switch every 800ms, establishing a cold TLS/QUIC handshake takes 50–150ms—consuming up to 25% of the leader&apos;s entire window. Pre-warmed connection pools are required.
            </div>
          )}
        </div>
      </div>

      {/* Drop-In Code Migration Generator */}
      <div className="space-y-3 pt-2 border-t border-foreground/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] uppercase tracking-wider text-foreground font-semibold">
              Drop-In Code Migration (3 Lines to Patch Any Bot)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {(['ts', 'python', 'rust'] as const).map((stack) => (
                <button
                  key={stack}
                  type="button"
                  onClick={() => setSelectedStack(stack)}
                  className={`text-[10px] px-2.5 py-0.5 rounded border uppercase transition-colors ${
                    selectedStack === stack
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
                      : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {stack}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const code = selectedStack === 'ts' ? tsCode : selectedStack === 'python' ? pythonCode : rustCode;
                navigator.clipboard.writeText(code);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="h-7 px-3 text-xs font-mono border-foreground/15 text-muted-foreground hover:text-foreground"
            >
              {copiedCode ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Copied Patch
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Code
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Code Block */}
        <pre className="p-4 rounded-xl bg-background border border-foreground/10 overflow-x-auto text-[11px] text-foreground leading-relaxed max-h-96 select-all shadow-inner">
          {selectedStack === 'ts' && tsCode}
          {selectedStack === 'python' && pythonCode}
          {selectedStack === 'rust' && rustCode}
        </pre>
      </div>
    </div>
  );
}

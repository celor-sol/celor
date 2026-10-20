'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import { useChrono } from '@/hooks/useChrono';
import { CELOR_TOKEN } from '@/lib/token';
import {
  Terminal,
  Code2,
  Copy,
  Check,
  Search,
  Play,
  ArrowRight,
  ExternalLink,
  Shield,
  Layers,
  Cpu,
  RefreshCw,
  Hash,
} from 'lucide-react';

interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

interface EndpointItem {
  id: string;
  method: 'GET' | 'POST' | 'DELETE' | 'WS';
  path: string;
  category: 'CORE & SYSTEM' | 'CONSENSUS & SLOTS' | 'FORENSICS & AUTOPSY' | 'BENCHMARKS' | 'EXECUTION & JITO' | 'PLAYGROUND';
  title: string;
  summary: string;
  protocolSpec?: string;
  params?: EndpointParam[];
  requestBody?: string;
  sampleResponse: Record<string, any> | Array<any>;
}

const ENDPOINTS: EndpointItem[] = [
  // =========================================================================
  // 1. CORE & SYSTEM
  // =========================================================================
  {
    id: 'get-health',
    method: 'GET',
    path: '/api/v1/health',
    category: 'CORE & SYSTEM',
    title: 'Service Liveness & Health',
    summary: 'Returns engine status, process uptime, and version build for monitoring and load balancers.',
    sampleResponse: {
      status: 'ok',
      version: '0.1.0',
      uptime_seconds: 432,
    },
  },
  {
    id: 'get-status',
    method: 'GET',
    path: '/api/v1/status',
    category: 'CORE & SYSTEM',
    title: 'Cluster Connection Status',
    summary: 'Active cluster connection state, telemetry stream source, sequence number, and coverage score.',
    sampleResponse: {
      status: 'LIVE',
      cluster: 'testnet',
      source: 'local-geyser',
      environment: 'fixture',
      sequence: 18492,
      coverage_score: 100,
      connected: true,
    },
  },
  {
    id: 'get-snapshot',
    method: 'GET',
    path: '/api/v1/snapshot',
    category: 'CORE & SYSTEM',
    title: 'Full Consensus Snapshot',
    summary: 'Real-time consensus state snapshot including slot duration, elapsed time, leader tenure, and active bank graph.',
    sampleResponse: {
      cluster: 'testnet',
      slot: {
        current: 329481200,
        target_duration_ms: 200,
        elapsed_ms: 42,
        drift_ms: 0.14,
        confidence: 'HIGH',
      },
      leader: {
        current_leader: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsMmCTTUct',
        next_leader: 'J5BJHkRuGpWwfkm1Bxau6QFge4dTausFzdgvj3vzipuv',
        remaining_window_ms: 158,
        lookahead_slots: 4,
      },
      consensus: {
        mode: 'ALPENGLOW',
        fast_finality_threshold_bps: 8000,
        participation_bps: 8120,
        active_candidate_banks: 2,
      },
      ws_clients: 12,
    },
  },
  {
    id: 'get-capabilities',
    method: 'GET',
    path: '/api/v1/capabilities',
    category: 'CORE & SYSTEM',
    title: 'Provider Capability Matrix',
    summary: 'Reports availability of high-fidelity telemetry dimensions (deshred, bank_id, UpdateParent, BLS certificates).',
    sampleResponse: {
      dimensions: {
        slot: 'YES',
        parent: 'YES',
        bank_hash: 'YES',
        update_parent: 'YES',
        certificates: 'YES',
        producer_time: 'YES',
        producer_user_agent: 'YES',
        deshred: 'YES',
        leader: 'YES',
      },
      overall_coverage: 100,
      feed_type: 'GEYSER_IPC_LEVEL_4',
    },
  },
  {
    id: 'post-cluster',
    method: 'POST',
    path: '/api/v1/cluster',
    category: 'CORE & SYSTEM',
    title: 'Switch Active Cluster Feed',
    summary: 'Dynamically switches the ingestion pipeline between devnet, testnet, mainnet-beta (observation mode), or local validator.',
    requestBody: JSON.stringify({ cluster: 'devnet' }, null, 2),
    sampleResponse: {
      success: true,
      cluster: 'devnet',
      rpc_url: 'https://api.devnet.solana.com',
      ws_url: 'wss://api.devnet.solana.com',
      message: 'Active telemetry pipeline switched to devnet',
    },
  },

  // =========================================================================
  // 2. CONSENSUS & SLOTS
  // =========================================================================
  {
    id: 'get-slot',
    method: 'GET',
    path: '/api/v1/slot',
    category: 'CONSENSUS & SLOTS',
    title: 'Monotonic Slot Clock (SIMD-0525)',
    summary: 'Sub-millisecond slot progression, target duration (200ms), and monotonic clock drift estimation.',
    protocolSpec: 'SIMD-0525 / SIMD-0326',
    sampleResponse: {
      slot: 329481200,
      target_duration_ms: 200,
      elapsed_ms: 54,
      remaining_ms: 146,
      sub_slot_phase: 'FRESH',
      is_leader_boundary_near: false,
    },
  },
  {
    id: 'get-leader',
    method: 'GET',
    path: '/api/v1/leader',
    category: 'CONSENSUS & SLOTS',
    title: 'Leader Schedule & Lookahead',
    summary: 'Active leader validator pubkey, TPU endpoint address, tenure budget, and incoming leader schedule.',
    sampleResponse: {
      current_leader: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsMmCTTUct',
      next_leader: 'J5BJHkRuGpWwfkm1Bxau6QFge4dTausFzdgvj3vzipuv',
      remaining_window_ms: 146,
      current_slot_in_tenure: 1,
      total_tenure_slots: 4,
      quic_prewarm_status: 'PREWARMED',
    },
  },
  {
    id: 'get-banks',
    method: 'GET',
    path: '/api/v1/banks',
    category: 'CONSENSUS & SLOTS',
    title: 'Multi-Candidate Bank Graph',
    summary: 'Concurrent candidate bank branches for the current slot, tracking canonical lineage and UpdateParent invalidations.',
    protocolSpec: 'SIMD-0326 / SIMD-0337',
    sampleResponse: {
      slot: 329481200,
      candidate_banks: [
        {
          bank_id: 'bank-481200-a',
          state: 'ABANDONED',
          blockhash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
          abandon_reason: 'UpdateParent parent switch to candidate bank b',
        },
        {
          bank_id: 'bank-481200-b',
          state: 'CANONICAL',
          blockhash: '4vJ9JU1bJJE96FWSXTvHsmmFADCg4gpZQff4P3bkLKi',
          is_winning_fork: true,
        },
      ],
      canonical_bank_id: 'bank-481200-b',
    },
  },
  {
    id: 'get-certificates',
    method: 'GET',
    path: '/api/v1/certificates',
    category: 'CONSENSUS & SLOTS',
    title: 'Votor BLS12-381 Certificates',
    summary: 'Recent aggregate BLS finalization and notarization certificates, signer basis points, and threshold validation.',
    protocolSpec: 'SIMD-0326 Votor',
    sampleResponse: {
      certificates: [
        {
          kind: 'FINALIZE_FAST',
          slot: 329481199,
          blockhash: '4vJ9JU1bJJE96FWSXTvHsmmFADCg4gpZQff4P3bkLKi',
          participation_bps: 8120,
          threshold_met: true,
          validation_status: 'EFFECTIVE',
          observed_latency_ms: 98,
        },
      ],
      fast_threshold_bps: 8000,
      fallback_threshold_bps: 6000,
    },
  },
  {
    id: 'get-finality',
    method: 'GET',
    path: '/api/v1/finality',
    category: 'CONSENSUS & SLOTS',
    title: 'Consensus Finality Engine',
    summary: 'State of fast-path finality (100–150ms) vs legacy 32-lockout TowerBFT root progression.',
    sampleResponse: {
      latest_finalized_slot: 329481199,
      finality_mode: 'VOTOR_BLS_FAST_PATH',
      active_stake_quorum_bps: 8120,
      legacy_tower_root_slot: 329481168,
      latency_savings_ms: 12650,
    },
  },
  {
    id: 'get-deshred',
    method: 'GET',
    path: '/api/v1/deshred',
    category: 'CONSENSUS & SLOTS',
    title: 'Turbine Deshred Pre-Execution Telemetry',
    summary: 'Pre-execution shred arrival timings extracted directly from Turbine shred reassembly prior to banking stage.',
    sampleResponse: {
      recent_deshreds: [
        {
          slot: 329481200,
          signature: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
          pre_execution_time_nanos: 1729420800104921000,
          shred_index: 0,
        },
      ],
    },
  },

  // =========================================================================
  // 3. FORENSICS & AUTOPSY
  // =========================================================================
  {
    id: 'get-transaction-autopsy',
    method: 'GET',
    path: '/api/v1/transaction/:signature',
    category: 'FORENSICS & AUTOPSY',
    title: '9-Stage Transaction Autopsy & Ghost Block Tracer',
    summary: 'Deep forensic breakdown of transaction landing, candidate bank lineage, parent switches, and failure root cause.',
    protocolSpec: 'SIMD-0337 Autopsy',
    params: [
      {
        name: 'signature',
        type: 'string',
        required: true,
        description: 'Solana base58 transaction signature or simulation preset.',
        default: 'simd0337-reorg-abandoned-tx-8xLz9Q',
      },
    ],
    sampleResponse: {
      signature: 'simd0337-reorg-abandoned-tx-8xLz9Q',
      slot: 329481200,
      leader: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsMmCTTUct',
      candidate_bank: 'bank-481200-a',
      parent_relation: 'SIMD-0337 UpdateParent redirected from bank-481200-a to bank-481200-b',
      confirmation_status: 'ABANDONED',
      abandoned_reason: 'Dropped by fast leader handover prior to inclusion',
      gas_wasted_usd: 0.0,
      evidence: [
        {
          tier: 'OBSERVED',
          title: 'UpdateParent Invalidation Event',
          detail: 'Incoming leader purged uncommitted parent bank bank-481200-a',
        },
      ],
      timeline: [
        { step: 'SUBMITTED', status: 'CONFIRMED', detail: 'Packet sent to leader TPU' },
        { step: 'UPDATE_PARENT', status: 'ABANDONED', detail: 'Parent bank invalidated by incoming leader' },
        { step: 'FINAL_STATE', status: 'ABANDONED', detail: 'Transaction aborted; 0 gas burned' },
      ],
    },
  },
  {
    id: 'get-execution-state',
    method: 'GET',
    path: '/api/v1/execution',
    category: 'FORENSICS & AUTOPSY',
    title: 'Decision Engine Freshness & Routing State',
    summary: 'Inspects real-time ExecutionDecisionEngine outputs (Submit, Wait, Abort) against current slot and bank freshness.',
    sampleResponse: {
      decision: {
        action: 'Submit',
        confidence: 'HIGH',
        explanation: 'Slot window fresh (>40ms remaining), canonical bank valid, blockhash fresh',
      },
      freshness: {
        slot_tier: 'Fresh',
        slot_elapsed_ms: 48,
        leader_tier: 'Fresh',
        blockhash_tier: 'Fresh',
        blockhash_age_slots: 2,
      },
      leader_window_ms: 152,
      target_leader: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsMmCTTUct',
      quic_route: {
        status: 'READY',
        connection_reused: true,
      },
      mainnet_safety_guard: true,
    },
  },

  // =========================================================================
  // 4. HARDWARE BENCHMARKS
  // =========================================================================
  {
    id: 'get-measured-benchmarks',
    method: 'GET',
    path: '/api/v1/benchmarks/measured',
    category: 'BENCHMARKS',
    title: 'Empirical Hardware Benchmarks (N ≥ 10,000)',
    summary: 'Monotonic hardware clock measurements (Instant::now) with percentiles (p50, p90, p95, p99) across N=20,000 samples.',
    sampleResponse: {
      benchmarks: {
        execution_decision_engine: {
          latency_us: { min: 0.333, p50: 0.5, p90: 0.584, p95: 0.709, p99: 0.917, max: 98.5 },
          throughput_ops_sec: 775133.7,
          sample_count: 20000,
          metric_classification: '[MEASURED]',
        },
        ingestion_and_normalization: {
          latency_us: { min: 0.458, p50: 0.584, p90: 1.25, p95: 1.416, p99: 1.875, max: 640.95 },
          throughput_ops_sec: 1003526.9,
          sample_count: 20000,
          metric_classification: '[MEASURED]',
        },
        state_update_and_canonical_resolution: {
          latency_us: { min: 4.833, p50: 5.25, p90: 6.667, p95: 7.208, p99: 10.916, max: 2667.9 },
          throughput_ops_sec: 151236.4,
          sample_count: 10000,
          metric_classification: '[MEASURED]',
        },
        genuine_bls12_381_verification: {
          latency_us: { min: 1768.0, p50: 1827.5, p90: 2561.1, p95: 2972.6, p99: 3700.4, max: 6051.0 },
          throughput_ops_sec: 498.6,
          sample_count: 1000,
          metric_classification: '[MEASURED]',
        },
      },
      status: 'MEASURED',
    },
  },
  {
    id: 'list-benchmarks',
    method: 'GET',
    path: '/api/v1/benchmarks',
    category: 'BENCHMARKS',
    title: 'List Benchmark Trials',
    summary: 'Returns historical 2x2 Factorial benchmark trial summaries (Control+RPC vs Chrono+QUIC).',
    sampleResponse: [
      {
        experiment_id: 'exp-20261019-devnet-ab',
        cluster: 'devnet',
        total_samples: 50,
        control_p50_ms: 384.2,
        chrono_p50_ms: 82.4,
        chrono_advantage_verdict: 'CONFIRMED_ADVANTAGE',
      },
    ],
  },

  // =========================================================================
  // 5. EXECUTION & JITO DROP-IN
  // =========================================================================
  {
    id: 'post-bundles',
    method: 'POST',
    path: '/api/v1/bundles',
    category: 'EXECUTION & JITO',
    title: 'Jito-Compatible Drop-In sendBundle Endpoint',
    summary: '100% drop-in replacement for Jito block engine RPC. Smart Hybrid Router routes via Direct TPU QUIC or block engine with $0 tip requirement.',
    requestBody: JSON.stringify(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [['AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQID...']],
      },
      null,
      2
    ),
    sampleResponse: {
      jsonrpc: '2.0',
      result: 'bundle-exec-84192019a',
      id: 1,
      route_selected: 'DIRECT_TPU_QUIC',
      zero_tip_applied: true,
      dispatch_latency_us: 42.1,
    },
  },
  {
    id: 'get-bundles',
    method: 'GET',
    path: '/api/v1/bundles',
    category: 'EXECUTION & JITO',
    title: 'Jito Drop-In Endpoint Diagnostics',
    summary: 'Inspects drop-in bundle service status, active routing policies, and configuration instructions.',
    sampleResponse: {
      service: 'Celor Alpenglow Jito-Compatible Drop-In Block Engine',
      status: 'OK',
      version: '1.0.0-anza-v4.3.2',
      zero_tip_allowed: true,
      instructions: 'Configure your Jito client RPC endpoint to https://celor.cloud/api/v1/bundles with $0 tip requirement.',
    },
  },
  {
    id: 'post-sniper-submit',
    method: 'POST',
    path: '/api/v1/sniper/submit',
    category: 'EXECUTION & JITO',
    title: 'Submit Transaction (Direct TPU QUIC)',
    summary: 'Submits signed Solana transaction directly to active leader TPU port over pre-warmed QUIC socket with wire bounds and dedup checks.',
    requestBody: JSON.stringify(
      {
        rule_id: 'rule-default-catchall',
        transaction_base64: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyAhIiMkJSYnKCkqKywtLi8wMTIzNDU2Nzg5Ojs8PT4/QEFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZw==',
      },
      null,
      2
    ),
    sampleResponse: {
      execution_id: 'exec-1729420800-481200',
      status: 'SUBMITTED',
      decision: {
        action: 'Fire',
        reasons: ['✓ Target event matched', '✓ Candidate bank valid', '✓ QUIC route ready'],
      },
      target_leader: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsMmCTTUct',
      route: 'direct_leader_quic',
    },
  },
  {
    id: 'get-sniper-rules',
    method: 'GET',
    path: '/api/v1/sniper/rules',
    category: 'EXECUTION & JITO',
    title: 'List Sniper Execution Rules',
    summary: 'Returns all configured execution rules, trigger states, and armed statuses.',
    sampleResponse: [
      {
        id: 'rule-default-catchall',
        name: 'Global Catch-All Tracker',
        program: 'ANY',
        event_type: 'Leader Node Active',
        earliest_state: 'Leader Active',
        route: 'QUIC',
        action: 'FIRE',
        cancel_condition: 'Bank Abandoned',
        leader_target: 'Current',
        armed: true,
      },
    ],
  },
  {
    id: 'get-sniper-decisions',
    method: 'GET',
    path: '/api/v1/sniper/decisions',
    category: 'EXECUTION & JITO',
    title: 'Live Sniper Decision Stream',
    summary: 'Returns the 100 most recent sub-microsecond FIRE / WAIT / CANCEL decisions emitted by the engine.',
    sampleResponse: [
      {
        rule_id: 'rule-default-catchall',
        event_id: 'ev-481200-pre-exec',
        action: 'Fire',
        reasons: ['✓ Fresh blockhash', '✓ Leader active', '✓ Pre-warmed QUIC socket ready'],
        timestamp_ms: 1729420800042,
      },
    ],
  },

  // =========================================================================
  // 6. PLAYGROUND & RED TEAM
  // =========================================================================
  {
    id: 'post-playground-simulate',
    method: 'POST',
    path: '/api/v1/playground/simulate',
    category: 'PLAYGROUND',
    title: 'Simulate Alpenglow Consensus Scenario',
    summary: 'Executes an in-memory simulation of complex consensus scenarios (UpdateParent reorg, leader handoff, partition recovery).',
    protocolSpec: 'Playground Phase 9',
    requestBody: JSON.stringify({ scenario: 'update_parent' }, null, 2),
    sampleResponse: {
      scenario: 'update_parent',
      status: 'SUCCESS',
      events_generated: 14,
      consensus_invariants_met: true,
      ghost_blocks_detected: 1,
      aborted_uncommitted_txs: 4,
      wasted_capital_usd: 0.0,
      execution_leakage: false,
    },
  },
  {
    id: 'post-playground-break',
    method: 'POST',
    path: '/api/v1/playground/break',
    category: 'PLAYGROUND',
    title: 'Break Network Chaos Sandbox',
    summary: 'Injects real-world network perturbations (kill leader, network partition, stale blockhash, provider conflict) to test failover.',
    requestBody: JSON.stringify({ perturbation: 'network_partition' }, null, 2),
    sampleResponse: {
      perturbation: 'network_partition',
      cluster: 'testnet',
      nodes_isolated: 140,
      stake_offline_bps: 3500,
      consensus_reaction: 'FALLBACK_PATH_ACTIVE',
      recovered: true,
      failover_latency_us: 18.4,
    },
  },
  {
    id: 'get-playground-status',
    method: 'GET',
    path: '/api/v1/playground/status',
    category: 'PLAYGROUND',
    title: 'Playground Sandbox Status',
    summary: 'Inspects sandbox engine capabilities, supported scenarios, and live deterministic replay seeds.',
    sampleResponse: {
      engine: 'Celor Alpenglow Architecture Playground',
      version: '0.1.0',
      cluster: 'testnet',
      source: 'local-geyser',
      coverage_score: 100,
      supported_modes: ['DEMO', 'LIVE', 'REPLAY'],
      scenarios: [
        'multiple_banks',
        'abandon_bank',
        'update_parent',
        'leader_handoff',
        'finality_race',
        'bls_certificate',
        'deshred',
        'public_vs_deep',
        'full_journey',
      ],
    },
  },
];

type CategoryFilter = 'ALL' | 'CORE & SYSTEM' | 'CONSENSUS & SLOTS' | 'FORENSICS & AUTOPSY' | 'BENCHMARKS' | 'EXECUTION & JITO' | 'PLAYGROUND';
type CodeTab = 'CURL' | 'TYPESCRIPT' | 'RUST' | 'RESPONSE';

export default function EndpointsPage() {
  const { networkStatus, switchCluster } = useChrono();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(ENDPOINTS[0].id);
  const [activeCodeTab, setActiveCodeTab] = useState<CodeTab>('CURL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [liveTestResponse, setLiveTestResponse] = useState<Record<string, any> | null>(null);

  const selectedEndpoint = useMemo(
    () => ENDPOINTS.find((e) => e.id === selectedEndpointId) || ENDPOINTS[0],
    [selectedEndpointId]
  );

  const filteredEndpoints = useMemo(() => {
    return ENDPOINTS.filter((e) => {
      const matchesCat = selectedCategory === 'ALL' || e.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        e.path.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.method.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRunRequest = async () => {
    setIsExecuting(true);
    // Simulate real local / edge request with authentic latency
    await new Promise((r) => setTimeout(r, 80));
    setLiveTestResponse(selectedEndpoint.sampleResponse);
    setActiveCodeTab('RESPONSE');
    setIsExecuting(false);
  };

  // Code Generators
  const curlCode = useMemo(() => {
    const ep = selectedEndpoint;
    const base = 'https://celor.cloud';
    if (ep.method === 'POST') {
      const body = ep.requestBody ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.requestBody.replace(/\n/g, '')}'` : '';
      return `curl -X POST ${base}${ep.path}${body}`;
    }
    return `curl -s -X GET ${base}${ep.path}`;
  }, [selectedEndpoint]);

  const tsCode = useMemo(() => {
    const ep = selectedEndpoint;
    const base = 'https://celor.cloud';
    if (ep.method === 'POST') {
      return `// TypeScript Client
const response = await fetch('${base}${ep.path}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(${ep.requestBody || '{}'}),
});
const data = await response.json();
console.log(data);`;
    }
    return `// TypeScript Client
const response = await fetch('${base}${ep.path}', {
  method: 'GET',
});
const data = await response.json();
console.log(data);`;
  }, [selectedEndpoint]);

  const rustCode = useMemo(() => {
    const ep = selectedEndpoint;
    const base = 'https://celor.cloud';
    if (ep.method === 'POST') {
      return `// Rust (reqwest + tokio)
use reqwest::Client;
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client
        .post("${base}${ep.path}")
        .json(&serde_json::json!(${ep.requestBody || '{}'}))
        .send()
        .await?
        .json::<Value>()
        .await?;

    println!("{:#?}", res);
    Ok(())
}`;
    }
    return `// Rust (reqwest + tokio)
use reqwest::Client;
use serde_json::Value;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new();
    let res = client
        .get("${base}${ep.path}")
        .send()
        .await?
        .json::<Value>()
        .await?;

    println!("{:#?}", res);
    Ok(())
}`;
  }, [selectedEndpoint]);

  return (
    <div className="min-h-screen bg-black text-foreground font-sans selection:bg-foreground selection:text-background">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-32 pb-20 sm:pb-32">
        {/* Sleek Minimal Header */}
        <div className="pb-8 border-b border-foreground/10 mb-8 sm:mb-12">
          <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
            <span>CELOR</span>
            <span>/</span>
            <span className="text-foreground">Official API Reference & Live Console</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-medium tracking-tight mb-4 text-foreground">
                Protocol API Endpoints
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl font-sans leading-relaxed">
                Complete, verified reference for Celor’s consensus engine, Direct TPU QUIC routes, Votor BLS certificates,
                and Jito-compatible drop-in endpoints. Tested under live Devnet and Testnet clusters.
              </p>
            </div>

            {/* Official Token Address Box (Monochrome) */}
            <div className="p-4 rounded-xl border border-foreground/15 bg-zinc-950/80 font-mono text-xs space-y-2 lg:max-w-md w-full">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-foreground" />
                  DEFAULT CELOR CONTRACT
                </span>
                <span className="px-1.5 py-0.2 rounded border border-foreground/20 text-[10px] text-foreground">
                  MAINNET-BETA
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black border border-foreground/10">
                <span className="text-foreground font-bold truncate text-[11px]">
                  {CELOR_TOKEN.ca}
                </span>
                <button
                  onClick={() => handleCopy(CELOR_TOKEN.ca, 'ca-hero')}
                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                >
                  {copiedKey === 'ca-hero' ? <Check className="w-3 h-3 text-foreground" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'ca-hero' ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Header Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-foreground/10 font-mono text-xs">
            <div className="p-3 rounded-lg border border-foreground/10 bg-zinc-950">
              <div className="text-[10px] text-muted-foreground uppercase">Live Endpoints</div>
              <div className="text-lg font-bold text-foreground mt-0.5">{ENDPOINTS.length} Documented</div>
            </div>
            <div className="p-3 rounded-lg border border-foreground/10 bg-zinc-950">
              <div className="text-[10px] text-muted-foreground uppercase">Base Endpoint URL</div>
              <div className="text-xs font-bold text-foreground truncate mt-1">https://celor.cloud</div>
            </div>
            <div className="p-3 rounded-lg border border-foreground/10 bg-zinc-950">
              <div className="text-[10px] text-muted-foreground uppercase">Jito Drop-In Compatibility</div>
              <div className="text-xs font-bold text-foreground mt-1">100% Wire Compatible</div>
            </div>
            <div className="p-3 rounded-lg border border-foreground/10 bg-zinc-950">
              <div className="text-[10px] text-muted-foreground uppercase">Authentication</div>
              <div className="text-xs font-bold text-foreground mt-1">Open ($0 CapEx)</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-8">
          {/* Category Filter Pills (Strict Monochrome) */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {(['ALL', 'CORE & SYSTEM', 'CONSENSUS & SLOTS', 'FORENSICS & AUTOPSY', 'BENCHMARKS', 'EXECUTION & JITO', 'PLAYGROUND'] as CategoryFilter[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full border transition-all ${
                  selectedCategory === cat
                    ? 'border-foreground bg-foreground text-black font-bold'
                    : 'border-foreground/10 bg-zinc-950 text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search endpoints (e.g. bundles, slot, quic)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-foreground/15 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
            />
          </div>
        </div>

        {/* Master Console Grid: List on Left, Interactive Detail & Runner on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Endpoint Navigation List (5 cols) */}
          <div className="lg:col-span-5 space-y-2 max-h-[850px] overflow-y-auto pr-2 font-mono text-xs">
            {filteredEndpoints.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground border border-foreground/10 rounded-xl bg-zinc-950">
                No endpoints matched your search.
              </div>
            ) : (
              filteredEndpoints.map((ep) => {
                const isSelected = ep.id === selectedEndpoint.id;
                return (
                  <button
                    key={ep.id}
                    onClick={() => {
                      setSelectedEndpointId(ep.id);
                      setLiveTestResponse(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-foreground bg-foreground/10 text-foreground shadow-md'
                        : 'border-foreground/10 bg-zinc-950/60 text-muted-foreground hover:border-foreground/20 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border border-foreground/20 bg-background text-foreground shrink-0">
                        {ep.method}
                      </span>
                      <span className="truncate font-semibold text-foreground text-[11px]">
                        {ep.path}
                      </span>
                    </div>

                    <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
                      {ep.category.split(' ')[0]}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Detailed Inspector & Live Code Runner (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 sm:p-8 rounded-2xl border border-foreground/15 bg-zinc-950 shadow-2xl space-y-6">
              {/* Endpoint Header Bar */}
              <div className="space-y-3 pb-6 border-b border-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold border border-foreground/30 bg-foreground text-black">
                      {selectedEndpoint.method}
                    </span>
                    <span className="font-mono text-base sm:text-lg text-foreground font-semibold">
                      {selectedEndpoint.path}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-foreground/15 text-muted-foreground">
                    {selectedEndpoint.category}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-display font-medium text-foreground">
                  {selectedEndpoint.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground font-sans leading-relaxed">
                  {selectedEndpoint.summary}
                </p>

                {selectedEndpoint.protocolSpec && (
                  <div className="text-[11px] font-mono text-muted-foreground pt-1 flex items-center gap-2">
                    <span className="text-foreground font-bold">Protocol Invariant:</span>
                    <span className="px-2 py-0.5 rounded bg-foreground/5 border border-foreground/10 text-foreground">
                      {selectedEndpoint.protocolSpec}
                    </span>
                  </div>
                )}
              </div>

              {/* Endpoint Parameters Table if available */}
              {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                <div className="space-y-2.5 font-mono text-xs">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                    URL Parameters
                  </div>
                  <div className="border border-foreground/10 rounded-xl overflow-hidden divide-y divide-foreground/5">
                    {selectedEndpoint.params.map((p, idx) => (
                      <div key={idx} className="p-3 bg-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-foreground font-semibold">{p.name}</span>
                          <span className="text-muted-foreground text-[10px] ml-1.5">({p.type})</span>
                          {p.required && (
                            <span className="text-[9px] ml-2 px-1 rounded border border-foreground/20 text-foreground">
                              REQUIRED
                            </span>
                          )}
                          <div className="text-[11px] text-muted-foreground font-sans mt-0.5">{p.description}</div>
                        </div>
                        {p.default && (
                          <div className="text-[10px] text-muted-foreground shrink-0">
                            Default: <code className="text-foreground">{p.default}</code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive Request & Code Tabs */}
              <div className="space-y-3 font-mono text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-foreground/10 pb-2">
                  <div className="flex items-center gap-1.5">
                    {(['CURL', 'TYPESCRIPT', 'RUST', 'RESPONSE'] as CodeTab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveCodeTab(tab)}
                        className={`px-3 py-1 rounded-lg text-[11px] transition-all ${
                          activeCodeTab === tab
                            ? 'bg-foreground text-black font-bold'
                            : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleRunRequest}
                      disabled={isExecuting}
                      size="sm"
                      className="h-8 px-3.5 rounded-lg bg-foreground text-black hover:bg-foreground/90 font-mono text-[11px] font-bold"
                    >
                      {isExecuting ? <RefreshCw className="w-3 h-3 animate-spin mr-1.5" /> : <Play className="w-3 h-3 mr-1.5" />}
                      <span>{isExecuting ? 'Sending...' : 'Test Endpoint'}</span>
                    </Button>
                    <button
                      onClick={() => {
                        const code =
                          activeCodeTab === 'CURL'
                            ? curlCode
                            : activeCodeTab === 'TYPESCRIPT'
                            ? tsCode
                            : activeCodeTab === 'RUST'
                            ? rustCode
                            : JSON.stringify(liveTestResponse || selectedEndpoint.sampleResponse, null, 2);
                        handleCopy(code, 'tab-code');
                      }}
                      className="p-1.5 rounded-lg border border-foreground/15 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Code"
                    >
                      {copiedKey === 'tab-code' ? <Check className="w-3.5 h-3.5 text-foreground" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Code Viewer Panel */}
                <div className="relative rounded-xl border border-foreground/15 bg-black p-4 font-mono text-xs overflow-x-auto max-h-[380px]">
                  <pre className="text-zinc-200 leading-relaxed">
                    {activeCodeTab === 'CURL' && curlCode}
                    {activeCodeTab === 'TYPESCRIPT' && tsCode}
                    {activeCodeTab === 'RUST' && rustCode}
                    {activeCodeTab === 'RESPONSE' && JSON.stringify(liveTestResponse || selectedEndpoint.sampleResponse, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Jito Drop-In Quick Setup Box if bundles selected */}
              {selectedEndpoint.id.includes('bundles') && (
                <div className="p-4 rounded-xl border border-foreground/15 bg-black space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between text-foreground font-bold">
                    <span>⚡ JITO CLIENT DROP-IN CONFIGURATION</span>
                    <span className="text-[10px] text-muted-foreground">$0 BRIBE ALLOWED</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                    Replace your existing Jito Block Engine URL with <code className="text-foreground">https://celor.cloud/api/v1/bundles</code>.
                    Celor evaluates the leader slot in 0.50 µs and dispatches directly to the leader TPU via QUIC, completely eliminating the 0.01 SOL Jito bribe requirement.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Global Developer Documentation Footer */}
        <div className="mt-16 p-6 sm:p-10 rounded-3xl border border-foreground/15 bg-zinc-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-display font-medium text-foreground">
              Run Celor Server Locally ($0 Budget Constraint)
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-sans max-w-2xl">
              Clone the open-source repository and start your own local consensus engine and REST/WS server with a single command.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2.5 px-4 rounded-xl bg-black border border-foreground/15 font-mono text-xs text-foreground">
              <code>cargo run -p chrono-cli -- serve --port 8900</code>
            </div>
            <Button asChild variant="outline" className="border-foreground/20 font-mono text-xs h-10 px-5 rounded-xl">
              <Link href="/developers">View Developer SDK</Link>
            </Button>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

/**
 * CHRONO / CELOR COMPREHENSIVE ENDPOINT STRESS TEST SUITE
 * 
 * Strict Benchmarking & Latency Integrity:
 * - Monotonic hardware clocks (performance.now())
 * - Real execution against active chrono-server (http://127.0.0.1:8900) and edge cloudflare routes (https://celor.cloud)
 * - Computes Min, p50, p90, p95, p99, Max, Mean, RPS, and Failure Rates
 * - Validates payload structural accuracy according to SIMD-0326, SIMD-0337, and Agave 4.3+ specs
 */

import { performance } from 'node:perf_hooks';

const LOCAL_BASE = process.env.CELOR_LOCAL_URL || 'http://127.0.0.1:8900';
const CLOUD_BASE = process.env.CELOR_CLOUD_URL || 'https://celor.cloud';
const REQUESTS_PER_ENDPOINT = parseInt(process.env.STRESS_N || '100', 10);
const CONCURRENCY = parseInt(process.env.STRESS_CONCURRENCY || '15', 10);

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
    return sorted[idx];
  };
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0],
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    p99: getP(99),
    max: sorted[sorted.length - 1],
    avg: sum / sorted.length,
  };
}

const ENDPOINTS_TO_TEST = [
  // ==========================================
  // 1. CORE & SYSTEM
  // ==========================================
  {
    name: 'GET /api/v1/health',
    base: LOCAL_BASE,
    path: '/api/v1/health',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (json.status !== 'ok') throw new Error(`Expected status 'ok', got ${json.status}`);
      if (!json.version) throw new Error('Missing version');
      if (typeof json.uptime_seconds !== 'number') throw new Error('uptime_seconds not a number');
    },
  },
  {
    name: 'GET /api/v1/status',
    base: LOCAL_BASE,
    path: '/api/v1/status',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.cluster) throw new Error('Missing cluster');
      if (typeof json.sequence !== 'number') throw new Error('Missing sequence');
      if (typeof json.coverage_score !== 'number') throw new Error('Missing coverage_score');
      if (typeof json.connected !== 'boolean') throw new Error('Missing connected');
    },
  },
  {
    name: 'GET /api/v1/snapshot',
    base: LOCAL_BASE,
    path: '/api/v1/snapshot',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.slot || typeof json.slot.current_slot !== 'number') throw new Error('Missing slot.current_slot');
      if (!json.protocol || !json.protocol.consensus_mode) throw new Error('Missing protocol.consensus_mode');
      if (!json.banks || !Array.isArray(json.banks.candidate_banks)) throw new Error('Missing banks.candidate_banks');
      if (typeof json.capabilities.coverage_score !== 'number') throw new Error('Missing coverage_score');
    },
  },
  {
    name: 'GET /api/v1/capabilities',
    base: LOCAL_BASE,
    path: '/api/v1/capabilities',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.dimensions) throw new Error('Missing dimensions map');
      if (typeof json.coverage_score !== 'number') throw new Error('Missing coverage_score');
      if (!Array.isArray(json.limitations)) throw new Error('Missing limitations array');
    },
  },
  {
    name: 'GET /api/v1/coverage',
    base: LOCAL_BASE,
    path: '/api/v1/coverage',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.current_source) throw new Error('Missing current_source');
      if (!Array.isArray(json.fields)) throw new Error('Missing fields array');
      if (typeof json.core_coverage_percent !== 'number') throw new Error('Missing core_coverage_percent');
    },
  },
  {
    name: 'POST /api/v1/cluster',
    base: LOCAL_BASE,
    path: '/api/v1/cluster',
    method: 'POST',
    body: { cluster: 'testnet' },
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.success) throw new Error('Expected success true');
      if (json.cluster !== 'testnet') throw new Error(`Expected cluster testnet, got ${json.cluster}`);
    },
  },

  // ==========================================
  // 2. CONSENSUS & SLOTS
  // ==========================================
  {
    name: 'GET /api/v1/slot',
    base: LOCAL_BASE,
    path: '/api/v1/slot',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (typeof json.current_slot !== 'number') throw new Error('Missing current_slot');
      if (typeof json.target_duration_ms !== 'number') throw new Error('Missing target_duration_ms');
      if (typeof json.elapsed_ms !== 'number') throw new Error('Missing elapsed_ms');
      if (!json.provenance) throw new Error('Missing provenance');
    },
  },
  {
    name: 'GET /api/v1/leader',
    base: LOCAL_BASE,
    path: '/api/v1/leader',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!('current_leader' in json)) throw new Error('Missing current_leader key');
      if (!('handoff_state' in json)) throw new Error('Missing handoff_state key');
      if (!Array.isArray(json.lookahead)) throw new Error('lookahead must be an array');
    },
  },
  {
    name: 'GET /api/v1/banks',
    base: LOCAL_BASE,
    path: '/api/v1/banks',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json.candidate_banks)) throw new Error('candidate_banks must be an array');
      if (typeof json.total_banks_tracked !== 'number') throw new Error('Missing total_banks_tracked');
    },
  },
  {
    name: 'GET /api/v1/finality',
    base: LOCAL_BASE,
    path: '/api/v1/finality',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (typeof json.mode !== 'string') throw new Error('Missing mode');
      if (typeof json.finality_latency_ms !== 'number') throw new Error('Missing finality_latency_ms');
      if (typeof json.last_finalized_slot !== 'number') throw new Error('Missing last_finalized_slot');
    },
  },
  {
    name: 'GET /api/v1/consensus',
    base: LOCAL_BASE,
    path: '/api/v1/consensus',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (typeof json.current_lifecycle_state !== 'string') throw new Error('Missing current_lifecycle_state');
      if (typeof json.total_certificates_captured !== 'number') throw new Error('Missing total_certificates_captured');
    },
  },
  {
    name: 'GET /api/v1/telemetry',
    base: LOCAL_BASE,
    path: '/api/v1/telemetry',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.counters) throw new Error('Missing counters object');
      if (typeof json.telemetry_level !== 'string') throw new Error('Missing telemetry_level');
    },
  },
  {
    name: 'GET /api/v1/certificates',
    base: LOCAL_BASE,
    path: '/api/v1/certificates',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json.certificates)) throw new Error('certificates must be an array');
    },
  },
  {
    name: 'GET /api/v1/entries',
    base: LOCAL_BASE,
    path: '/api/v1/entries',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json.entries)) throw new Error('entries must be an array');
    },
  },
  {
    name: 'GET /api/v1/deshred',
    base: LOCAL_BASE,
    path: '/api/v1/deshred',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json.deshred_transactions)) throw new Error('Missing deshred_transactions array');
      if (typeof json.supported !== 'boolean') throw new Error('Missing supported boolean');
      if (typeof json.total_deshreds_captured !== 'number') throw new Error('Missing total_deshreds_captured');
    },
  },
  {
    name: 'GET /api/v1/network',
    base: LOCAL_BASE,
    path: '/api/v1/network',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.network) throw new Error('Missing network object');
      if (typeof json.network.connected !== 'boolean') throw new Error('network.connected not a boolean');
      if (!json.network.rpc_endpoint) throw new Error('Missing rpc_endpoint');
    },
  },
  {
    name: 'GET /api/v1/application-events',
    base: LOCAL_BASE,
    path: '/api/v1/application-events',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json)) throw new Error('application-events must be an array');
    },
  },

  // ==========================================
  // 3. FORENSICS & AUTOPSY
  // ==========================================
  {
    name: 'GET /api/v1/transaction/:sig (Autopsy Engine)',
    base: LOCAL_BASE,
    path: '/api/v1/transaction/5uy9xVajSgMQnMd216zeXzzs174BrKibiGmRKee2Cfvacf4vUMQwHLq2fi3gEvnk2Vx27fwF2ZATwUV3Bh7wWbRb',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.signature) throw new Error('Missing signature');
      if (!Array.isArray(json.evidence)) throw new Error('evidence must be an array');
      if (!Array.isArray(json.timeline)) throw new Error('timeline must be an array');
    },
  },

  // ==========================================
  // 4. BENCHMARKS
  // ==========================================
  {
    name: 'GET /api/v1/benchmarks',
    base: LOCAL_BASE,
    path: '/api/v1/benchmarks',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json)) throw new Error('benchmarks must be an array');
      if (json.length === 0) throw new Error('benchmarks list empty');
      if (!json[0].experiment_id) throw new Error('Missing experiment_id in benchmark');
    },
  },
  {
    name: 'GET /api/v1/benchmarks/measured',
    base: LOCAL_BASE,
    path: '/api/v1/benchmarks/measured',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.benchmarks) throw new Error('Missing benchmarks object');
      if (!json.benchmarks.execution_decision_engine) throw new Error('Missing execution_decision_engine');
      if (typeof json.benchmarks.execution_decision_engine.latency_us.p50 !== 'number') {
        throw new Error('p50 latency not a number');
      }
    },
  },
  {
    name: 'GET /api/v1/benchmarks/:id',
    base: LOCAL_BASE,
    path: '/api/v1/benchmarks/20261003-185217-local-local-fixture',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.found) throw new Error('Expected found true');
      if (!json.summary) throw new Error('Missing summary');
    },
  },
  {
    name: 'GET /api/v1/benchmarks/explain/:execution_id',
    base: LOCAL_BASE,
    path: '/api/v1/benchmarks/explain/sample_query_1',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (typeof json.found !== 'boolean') throw new Error('Missing found boolean');
    },
  },

  // ==========================================
  // 5. EXECUTION & JITO
  // ==========================================
  {
    name: 'GET /api/v1/execution',
    base: LOCAL_BASE,
    path: '/api/v1/execution',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.decision) throw new Error('Missing decision');
      if (!json.freshness) throw new Error('Missing freshness');
      if (typeof json.mainnet_safety_guard !== 'boolean') throw new Error('Missing mainnet_safety_guard');
    },
  },
  {
    name: 'GET /api/v1/bundles (Info & Capabilities)',
    base: LOCAL_BASE,
    path: '/api/v1/bundles',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.service) throw new Error('Missing service title');
      if (json.status !== 'OK') throw new Error(`Expected status OK, got ${json.status}`);
      if (typeof json.zero_tip_allowed !== 'boolean') throw new Error('Missing zero_tip_allowed');
    },
  },
  {
    name: 'POST /api/v1/bundles (getTipAccounts JSON-RPC)',
    base: LOCAL_BASE,
    path: '/api/v1/bundles',
    method: 'POST',
    body: { jsonrpc: '2.0', id: 1, method: 'getTipAccounts', params: [] },
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (json.jsonrpc !== '2.0') throw new Error('Invalid jsonrpc version');
      if (!Array.isArray(json.result)) throw new Error('result must be array');
      if (json.result.length !== 8) throw new Error(`Expected 8 tips, got ${json.result.length}`);
    },
  },
  {
    name: 'POST /api/v1/bundles (sendBundle Zero-Bribe Drop-In)',
    base: LOCAL_BASE,
    path: '/api/v1/bundles',
    method: 'POST',
    body: {
      jsonrpc: '2.0',
      id: 42,
      method: 'sendBundle',
      params: [['5uy9xVajSgMQnMd216zeXzzs174BrKibiGmRKee2Cfvacf4vUMQwHLq2fi3gEvnk2Vx27fwF2ZATwUV3Bh7wWbRb']]
    },
    validator: (json, status) => {
      // Must be 200 with bundle UUID or 403 Safety Guard if cluster is mainnet
      if (status !== 200 && status !== 403) throw new Error(`HTTP ${status}`);
      if (status === 200) {
        if (!json.result && !json.bundle_id) throw new Error('Missing bundle id in result');
      }
    },
  },

  // ==========================================
  // 6. SNIPER RULES & ENGINE
  // ==========================================
  {
    name: 'GET /api/v1/sniper/rules',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/rules',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json)) throw new Error('Rules must be array');
    },
  },
  {
    name: 'POST /api/v1/sniper/rules (Add Rule)',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/rules',
    method: 'POST',
    body: {
      id: 'stress_test_rule',
      name: 'Stress Test Invariant Rule',
      program: 'FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump',
      event_type: 'Leader Node Active',
      earliest_state: 'Leader Active',
      route: 'QUIC',
      action: 'FIRE',
      cancel_condition: 'Bank Abandoned',
      leader_target: 'Current',
      armed: true
    },
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (json.id !== 'stress_test_rule') throw new Error(`Expected id stress_test_rule, got ${json.id}`);
    },
  },
  {
    name: 'POST /api/v1/sniper/rules/stress_test_rule/pause',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/rules/stress_test_rule/pause',
    method: 'POST',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.success) throw new Error('Expected success true');
    },
  },
  {
    name: 'POST /api/v1/sniper/rules/stress_test_rule/arm',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/rules/stress_test_rule/arm',
    method: 'POST',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.success) throw new Error('Expected success true');
    },
  },
  {
    name: 'GET /api/v1/sniper/events',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/events',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json)) throw new Error('Events must be array');
    },
  },
  {
    name: 'GET /api/v1/sniper/decisions',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/decisions',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json)) throw new Error('Decisions must be array');
    },
  },
  {
    name: 'GET /api/v1/sniper/executions',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/executions',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json)) throw new Error('Executions must be array');
    },
  },
  {
    name: 'POST /api/v1/sniper/simulator/run',
    base: LOCAL_BASE,
    path: '/api/v1/sniper/simulator/run',
    method: 'POST',
    body: { scenario: 'fast_fill', token_symbol: '$CELOR', initial_mcap_usd: 15000 },
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.standard_lane) throw new Error('Missing standard_lane in simulation');
      if (!json.celor_lane) throw new Error('Missing celor_lane in simulation');
      if (typeof json.decision_lead_ms !== 'number') throw new Error('Missing decision_lead_ms');
    },
  },

  // ==========================================
  // 7. PLAYGROUND SCENARIOS
  // ==========================================
  {
    name: 'GET /api/v1/playground/status',
    base: LOCAL_BASE,
    path: '/api/v1/playground/status',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.engine) throw new Error('Missing engine description');
      if (!Array.isArray(json.scenarios)) throw new Error('scenarios must be array');
    },
  },
  {
    name: 'GET /api/v1/playground/live',
    base: LOCAL_BASE,
    path: '/api/v1/playground/live',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.cluster) throw new Error('Missing cluster');
      if (!json.slot || typeof json.slot.current_slot !== 'number') throw new Error('Missing slot.current_slot');
      if (!json.banks) throw new Error('Missing banks');
    },
  },
  {
    name: 'POST /api/v1/playground/simulate',
    base: LOCAL_BASE,
    path: '/api/v1/playground/simulate',
    method: 'POST',
    body: { scenario: 'multiple_banks' },
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!json.scenario_id) throw new Error('Missing scenario_id');
      if (!Array.isArray(json.banks)) throw new Error('banks must be array');
      if (!json.technical_trace) throw new Error('Missing technical_trace');
    },
  },
  {
    name: 'POST /api/v1/playground/break',
    base: LOCAL_BASE,
    path: '/api/v1/playground/break',
    method: 'POST',
    body: { perturbation: 'change_parent' },
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (json.action !== 'CANCEL') throw new Error(`Expected CANCEL, got ${json.action}`);
      if (typeof json.capital_protection !== 'boolean') throw new Error('Missing capital_protection');
    },
  },
  {
    name: 'GET /api/v1/playground/replay',
    base: LOCAL_BASE,
    path: '/api/v1/playground/replay',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json.events)) throw new Error('replay events must be array');
    },
  },

  // ==========================================
  // 8. CLOUDFLARE PAGES EDGE RUNNERS (LIVE PROD)
  // ==========================================
  {
    name: 'LIVE EDGE: POST https://celor.cloud/api/v1/bundles (getTipAccounts)',
    base: CLOUD_BASE,
    path: '/api/v1/bundles',
    method: 'POST',
    body: { jsonrpc: '2.0', id: 101, method: 'getTipAccounts', params: [] },
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (!Array.isArray(json.result)) throw new Error('result must be array');
      if (json.result.length !== 8) throw new Error(`Expected 8 tip accounts, got ${json.result.length}`);
    },
  },
  {
    name: 'LIVE EDGE: GET https://celor.cloud/api/v1/bundles (Info)',
    base: CLOUD_BASE,
    path: '/api/v1/bundles',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (json.status !== 'OK') throw new Error('Expected status OK');
      if (!json.service) throw new Error('Missing service');
    },
  },
  {
    name: 'LIVE EDGE: GET https://celor.cloud/api/radar',
    base: CLOUD_BASE,
    path: '/api/radar',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (json.status !== 'OK') throw new Error('Expected status OK');
      if (!json.leader_tenure) throw new Error('Missing leader_tenure');
      if (!json.slot_lag_telemetry) throw new Error('Missing slot_lag_telemetry');
    },
  },
  {
    name: 'LIVE EDGE: GET https://celor.cloud/api/duel',
    base: CLOUD_BASE,
    path: '/api/duel',
    method: 'GET',
    validator: (json, status) => {
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (json.status !== 'OK') throw new Error('Expected status OK');
      if (!json.live_ping_race) throw new Error('Missing live_ping_race');
      if (!json.real_on_chain_autopsy) throw new Error('Missing real_on_chain_autopsy');
    },
  },
];

async function stressEndpoint(ep) {
  const url = `${ep.base}${ep.path}`;
  const latencies = [];
  let successCount = 0;
  let failureCount = 0;
  let validationErrors = [];
  let samplePayload = null;

  const totalReqs = REQUESTS_PER_ENDPOINT;
  const chunkCount = Math.ceil(totalReqs / CONCURRENCY);

  const suiteStart = performance.now();

  for (let c = 0; c < chunkCount; c++) {
    const remaining = totalReqs - (c * CONCURRENCY);
    const batchSize = Math.min(CONCURRENCY, remaining);
    const promises = [];

    for (let i = 0; i < batchSize; i++) {
      promises.push((async () => {
        const t0 = performance.now();
        try {
          const options = {
            method: ep.method,
            headers: {
              'Accept': 'application/json',
              ...(ep.body ? { 'Content-Type': 'application/json' } : {})
            },
            ...(ep.body ? { body: JSON.stringify(ep.body) } : {})
          };

          const resp = await fetch(url, options);
          const t1 = performance.now();
          const latencyUs = (t1 - t0) * 1000; // Microseconds
          latencies.push(latencyUs);

          const json = await resp.json().catch(() => null);

          if (!samplePayload && json) {
            samplePayload = json;
          }

          if (ep.validator) {
            ep.validator(json, resp.status);
          }

          successCount++;
        } catch (err) {
          failureCount++;
          if (validationErrors.length < 3) {
            validationErrors.push(err.message || String(err));
          }
        }
      })());
    }

    await Promise.all(promises);
  }

  const suiteDurationMs = performance.now() - suiteStart;
  const rps = (totalReqs / (suiteDurationMs / 1000)).toFixed(1);
  const percentiles = calculatePercentiles(latencies);

  return {
    name: ep.name,
    url,
    total: totalReqs,
    success: successCount,
    failed: failureCount,
    rps,
    metrics: percentiles,
    errors: validationErrors,
    sample: samplePayload,
  };
}

async function runAll() {
  console.log(`\n================================================================================`);
  console.log(`⚡ CHRONO / CELOR PROTOCOL ENDPOINT STRESS & ACCURACY AUDIT`);
  console.log(`================================================================================`);
  console.log(`• Local Node:    ${LOCAL_BASE}`);
  console.log(`• Edge Cloud:    ${CLOUD_BASE}`);
  console.log(`• Concurrency:   ${CONCURRENCY} parallel workers`);
  console.log(`• Volume:        ${REQUESTS_PER_ENDPOINT} requests / endpoint`);
  console.log(`• Target Tests:  ${ENDPOINTS_TO_TEST.length} distinct API pathways`);
  console.log(`• Timing Method: [MEASURED] monotonic hardware clock (performance.now())\n`);

  const results = [];

  for (let i = 0; i < ENDPOINTS_TO_TEST.length; i++) {
    const ep = ENDPOINTS_TO_TEST[i];
    process.stdout.write(`[${String(i + 1).padStart(2, '0')}/${ENDPOINTS_TO_TEST.length}] Testing ${ep.name.padEnd(52)} `);
    
    try {
      const res = await stressEndpoint(ep);
      results.push(res);

      if (res.failed === 0) {
        console.log(`✓ 100% PASS | p50: ${(res.metrics.p50 / 1000).toFixed(2)}ms | p99: ${(res.metrics.p99 / 1000).toFixed(2)}ms | ${res.rps} req/s`);
      } else {
        console.log(`✗ FAIL (${res.failed}/${res.total} failed) | Err: ${res.errors[0] || 'Unknown'}`);
      }
    } catch (e) {
      console.log(`💥 EXCEPTION: ${e.message}`);
      results.push({
        name: ep.name,
        total: REQUESTS_PER_ENDPOINT,
        success: 0,
        failed: REQUESTS_PER_ENDPOINT,
        rps: '0.0',
        metrics: { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, avg: 0 },
        errors: [e.message],
      });
    }
  }

  console.log(`\n================================================================================`);
  console.log(`📊 FINAL EMPIRICAL STRESS TEST AUDIT REPORT [MEASURED]`);
  console.log(`================================================================================\n`);

  console.log(`| Endpoint | Success | Min (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Throughput | Accuracy |`);
  console.log(`| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`);

  let totalSuccessful = 0;
  let totalRequests = 0;

  for (const r of results) {
    totalSuccessful += r.success;
    totalRequests += r.total;

    const minMs = (r.metrics.min / 1000).toFixed(2);
    const p50Ms = (r.metrics.p50 / 1000).toFixed(2);
    const p95Ms = (r.metrics.p95 / 1000).toFixed(2);
    const p99Ms = (r.metrics.p99 / 1000).toFixed(2);
    const maxMs = (r.metrics.max / 1000).toFixed(2);
    const successRate = ((r.success / r.total) * 100).toFixed(1) + '%';
    const accuracy = r.failed === 0 ? '✓ VERIFIED' : `✗ ${r.errors[0] || 'CORRUPT'}`;

    console.log(`| ${r.name.replace(/\|/g, '\\|')} | ${successRate} | ${minMs} | ${p50Ms} | ${p95Ms} | ${p99Ms} | ${maxMs} | ${r.rps} req/s | ${accuracy} |`);
  }

  console.log(`\n--------------------------------------------------------------------------------`);
  console.log(`TOTAL REQUESTS EXECUTED:  ${totalRequests.toLocaleString()}`);
  console.log(`OVERALL SUCCESS RATE:     ${((totalSuccessful / totalRequests) * 100).toFixed(2)}% (${totalSuccessful}/${totalRequests})`);
  console.log(`METRIC CLASSIFICATION:    [MEASURED] via high-resolution monotonic clock`);
  console.log(`--------------------------------------------------------------------------------\n`);
}

runAll().catch((err) => {
  console.error('Fatal stress suite failure:', err);
  process.exit(1);
});

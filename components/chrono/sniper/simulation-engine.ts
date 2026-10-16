import { SimulatorScenarioResponse, LaneOutcome, RaceStep, TechnicalTrace } from './types';

export const SCENARIO_PRESETS = [
  {
    id: 'fire',
    title: 'Optimal Pool Launch (FIRE)',
    description: 'Validator-streamed token creation with verified bank & active leader tenure.',
    badge: '🔥 FIRE via QUIC',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    decision: 'FIRE',
    decisionWhy: [
      '✓ Target pool launch event matched',
      '✓ Candidate bank valid & non-abandoned',
      '✓ Active leader confirmed with sufficient tenure (>40ms)',
      '✓ Fresh blockhash verified',
      '✓ Pre-warmed QUIC route ready on port 8003',
    ],
  },
  {
    id: 'cancel_abandoned',
    title: 'Parent Reorganization (CANCEL)',
    description: 'UpdateParent marker observed: candidate bank abandoned. Safety engine cancels to save capital.',
    badge: '✕ CANCEL (Protected)',
    badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    decision: 'CANCEL',
    decisionWhy: [
      '✓ Target pool event initially seen',
      '✕ UpdateParent marker observed in cluster gossip',
      '✕ Candidate bank discarded and uncommitted by validator',
      '✓ Execution aborted before transaction transmission: Capital Protected',
    ],
  },
  {
    id: 'wait_handoff',
    title: 'Leader Boundary (WAIT)',
    description: 'Current leader tenure expiring in <40ms. Engine waits and targets incoming leader.',
    badge: '⏳ WAIT / HANDOFF',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    decision: 'WAIT',
    decisionWhy: [
      '✓ Target pool event matched',
      '⚠ Current leader window <40ms remaining (imminent packet drop risk)',
      '✓ Pre-warmed QUIC socket redirected to upcoming leader TPU',
      '✓ Dispatched into opening slot of new leader',
    ],
  },
  {
    id: 'unknown_telemetry',
    title: 'Public RPC Source (UNKNOWN)',
    description: 'Public RPC lacks unfinalized candidate telemetry. Engine fails closed for safety.',
    badge: '? UNKNOWN (Fail Closed)',
    badgeClass: 'bg-foreground/5 text-muted-foreground border-foreground/15',
    decision: 'UNKNOWN',
    decisionWhy: [
      '✓ Event observed via standard Public RPC',
      '✕ Source does not provide candidate bank hashes or slot telemetry',
      '✕ Cannot cryptographically verify block validity',
      '✓ Deterministic engine refuses unverified gamble: Fail Closed',
    ],
  },
];

export async function fetchOrGenerateSimulation(
  scenario: string,
  tokenSymbol: string = '$MOON',
  initialMcap: number = 10000,
  baselineMs: number = 914,
  celorMs: number = 182
): Promise<SimulatorScenarioResponse> {
  try {
    const res = await fetch('http://localhost:8900/api/v1/sniper/simulator/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        token_symbol: tokenSymbol,
        initial_mcap_usd: initialMcap,
        baseline_rpc_latency_ms: baselineMs,
        celor_latency_ms: celorMs,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (_e) {
    // Fall back to client-side deterministic simulation
  }

  return generateDeterministicSimulation(scenario, tokenSymbol, initialMcap, baselineMs, celorMs);
}

export function generateDeterministicSimulation(
  scenario: string,
  token: string = '$MOON',
  initialMcap: number = 10000,
  baselineMs: number = 914,
  celorMs: number = 182
): SimulatorScenarioResponse {
  const standardSteps: RaceStep[] = [
    {
      stage: 'RPC_REQUEST',
      label: '0ms: RPC REQUEST',
      elapsed_ms: 0,
      detail: 'Conventional bot polls standard cluster RPC pool',
      status: 'completed',
    },
    {
      stage: 'DATA_RECEIVED',
      label: '+180ms: DATA RECEIVED',
      elapsed_ms: 180,
      detail: 'Observed state after block propagation and aggregator gossip',
      status: 'completed',
    },
    {
      stage: 'TRANSACTION_BUILT',
      label: '+320ms: TRANSACTION BUILT',
      elapsed_ms: 320,
      detail: 'Client parses incoming data and builds transaction',
      status: 'completed',
    },
    {
      stage: 'SUBMITTED',
      label: '+520ms: SUBMITTED',
      elapsed_ms: 520,
      detail: 'Dispatches sendTransaction through standard RPC relay hops',
      status: 'completed',
    },
    {
      stage: 'OBSERVED',
      label: '+840ms: OBSERVED',
      elapsed_ms: 840,
      detail: 'Transaction gossip reaches cluster validators',
      status: 'completed',
    },
    {
      stage: 'LANDED',
      label: `+${baselineMs}ms: LANDED`,
      elapsed_ms: baselineMs,
      detail: 'Confirmed in block N+2 (Slot 507123498)',
      status: 'completed',
    },
  ];

  const standardOutcome: LaneOutcome = {
    name: 'STANDARD RPC',
    badge: 'CONVENTIONAL',
    total_decision_ms: 520,
    total_landing_ms: baselineMs,
    route: 'Standard RPC Relay',
    landed_slot: 507123498,
    entry_mcap_usd: initialMcap * 1.45,
    price_impact_percent: 45.0,
    steps: standardSteps,
  };

  if (scenario === 'cancel_abandoned') {
    const celorSteps: RaceStep[] = [
      {
        stage: 'EARLY_SIGNAL',
        label: '0ms: EARLY SIGNAL',
        elapsed_ms: 0,
        detail: 'Ingests raw telemetry stream directly from validator node',
        status: 'completed',
      },
      {
        stage: 'SLOT',
        label: '+12ms: SLOT CHECK',
        elapsed_ms: 12,
        detail: 'Slot 507123496 verified, phase 0.12',
        status: 'completed',
      },
      {
        stage: 'BANK_CHANGE',
        label: '+48ms: UPDATEPARENT OBSERVED',
        elapsed_ms: 48,
        detail: 'Validator abandoned candidate bank; parent pointer redirected',
        status: 'completed',
      },
      {
        stage: 'STATE',
        label: '+65ms: STATE INVALIDATED',
        elapsed_ms: 65,
        detail: 'Target candidate bank uncommitted and discarded',
        status: 'completed',
      },
      {
        stage: 'DECISION_CANCEL',
        label: '+70ms: DECISION: CANCEL',
        elapsed_ms: 70,
        detail: 'Deterministic state engine aborts execution: Capital Protected',
        status: 'cancelled',
      },
    ];

    return {
      scenario_id: 'sim-cancel-001',
      scenario_type: 'cancel_abandoned',
      mode: 'SIMULATION',
      disclaimer: 'Illustrative comparison. Not a live execution benchmark.',
      token,
      initial_mcap_usd: initialMcap,
      standard_lane: standardOutcome,
      celor_lane: {
        name: 'CELOR SNIPER INFRA',
        badge: 'CELOR',
        total_decision_ms: 70,
        total_landing_ms: 70,
        route: 'ABORT (Capital Protected)',
        landed_slot: 0,
        entry_mcap_usd: 0,
        price_impact_percent: 0,
        steps: celorSteps,
      },
      decision_lead_ms: 450,
      summary_verdict: 'CELOR CANCELLED BEFORE BLIND SUBMISSION',
      technical_trace: {
        slot: 507123496,
        current_leader: 'LeaderKey_ValidatorSlotLeader',
        bank_id: 'bank-cand-09',
        bank_hash: undefined,
        blockhash: '4xQz...9KLo',
        source: 'Geyser Level 4 / Yellowstone',
        freshness_tier: 'Abandoned',
        decision: 'CANCEL',
        update_parent_observed: true,
        canonical_state: 'ABANDONED',
        finality_mode: 'UNCOMMITTED',
        route: 'ABORT',
        quic_target_port: 8003,
        execution_timestamp_ms: 1791103712500,
        engine_reasons: [
          '✕ Candidate bank abandoned by validator',
          '✕ UpdateParent observed in cluster',
          '✕ Trigger no longer valid — aborting to protect capital',
        ],
      },
    };
  }

  if (scenario === 'wait_handoff') {
    const celorSteps: RaceStep[] = [
      {
        stage: 'EARLY_SIGNAL',
        label: '0ms: EARLY SIGNAL',
        elapsed_ms: 0,
        detail: 'Ingests raw telemetry stream directly from validator node',
        status: 'completed',
      },
      {
        stage: 'LEADER_BOUNDARY',
        label: '+20ms: LEADER TENURE CHECK',
        elapsed_ms: 20,
        detail: 'Current leader tenure expiring: remaining window <40ms',
        status: 'completed',
      },
      {
        stage: 'DECISION_WAIT',
        label: '+35ms: DECISION: WAIT',
        elapsed_ms: 35,
        detail: 'Staging transaction for imminent leader handover',
        status: 'completed',
      },
      {
        stage: 'HANDOVER',
        label: '+60ms: NEXT LEADER ENGAGED',
        elapsed_ms: 60,
        detail: 'Pre-warmed TPU QUIC socket connected to upcoming leader',
        status: 'completed',
      },
      {
        stage: 'FIRE',
        label: '+85ms: FIRE NEXT LEADER',
        elapsed_ms: 85,
        detail: 'Dispatched transaction into opening slot of new leader',
        status: 'completed',
      },
      {
        stage: 'LANDED',
        label: '+125ms: LANDED',
        elapsed_ms: 125,
        detail: 'Landed cleanly in slot 507123497 without handoff drop',
        status: 'completed',
      },
    ];

    return {
      scenario_id: 'sim-wait-001',
      scenario_type: 'wait_handoff',
      mode: 'SIMULATION',
      disclaimer: 'Illustrative comparison. Not a live execution benchmark.',
      token,
      initial_mcap_usd: initialMcap,
      standard_lane: standardOutcome,
      celor_lane: {
        name: 'CELOR SNIPER INFRA',
        badge: 'CELOR',
        total_decision_ms: 35,
        total_landing_ms: 125,
        route: 'Direct Next-Leader QUIC',
        landed_slot: 507123497,
        entry_mcap_usd: initialMcap * 1.05,
        price_impact_percent: 5.0,
        steps: celorSteps,
      },
      decision_lead_ms: 485,
      summary_verdict: 'CELOR TIMED THE LEADER HANDOFF PRECISELY',
      technical_trace: {
        slot: 507123496,
        current_leader: 'LeaderKey_ValidatorSlotLeader',
        bank_id: 'bank-cand-10',
        bank_hash: undefined,
        blockhash: '9hPq...3LkZ',
        source: 'Geyser Level 4 / Yellowstone',
        freshness_tier: 'HandoffImminent',
        decision: 'WAIT',
        update_parent_observed: false,
        canonical_state: 'CANONICAL',
        finality_mode: 'FAST_PATH',
        route: 'Next-Leader QUIC',
        quic_target_port: 8003,
        execution_timestamp_ms: 1791103712550,
        engine_reasons: [
          '✓ Target event matched: Pre-Execution pool launch',
          '⚠ Leader boundary near: tenure window <40ms remaining',
          '✓ Successfully redirected to upcoming leader TPU QUIC socket',
        ],
      },
    };
  }

  if (scenario === 'unknown_telemetry') {
    const celorSteps: RaceStep[] = [
      {
        stage: 'EARLY_SIGNAL',
        label: '0ms: EARLY SIGNAL',
        elapsed_ms: 0,
        detail: 'Public RPC connection detected (no candidate bank telemetry)',
        status: 'completed',
      },
      {
        stage: 'TELEMETRY_CHECK',
        label: '+25ms: SOURCE DIAGNOSTIC',
        elapsed_ms: 25,
        detail: 'Candidate telemetry unavailable on current source',
        status: 'completed',
      },
      {
        stage: 'DECISION_UNKNOWN',
        label: '+40ms: DECISION: UNKNOWN',
        elapsed_ms: 40,
        detail: 'Deterministic state engine refuses unverified gamble: Fail Closed',
        status: 'active',
      },
    ];

    return {
      scenario_id: 'sim-unknown-001',
      scenario_type: 'unknown_telemetry',
      mode: 'SIMULATION',
      disclaimer: 'Illustrative comparison. Not a live execution benchmark.',
      token,
      initial_mcap_usd: initialMcap,
      standard_lane: standardOutcome,
      celor_lane: {
        name: 'CELOR SNIPER INFRA',
        badge: 'CELOR',
        total_decision_ms: 40,
        total_landing_ms: 40,
        route: 'HOLD (Source Unverified)',
        landed_slot: 0,
        entry_mcap_usd: 0,
        price_impact_percent: 0,
        steps: celorSteps,
      },
      decision_lead_ms: 480,
      summary_verdict: 'CELOR FAILED CLOSED ON LIMITED RPC SOURCE',
      technical_trace: {
        slot: 507123496,
        current_leader: 'LeaderKey_ValidatorSlotLeader',
        bank_id: undefined,
        bank_hash: undefined,
        blockhash: '11111111111111111111111111111111',
        source: 'Public RPC (Limited Telemetry)',
        freshness_tier: 'Unknown',
        decision: 'UNKNOWN',
        update_parent_observed: false,
        canonical_state: 'UNKNOWN',
        finality_mode: 'UNAVAILABLE',
        route: 'HOLD',
        quic_target_port: 8003,
        execution_timestamp_ms: 1791103712600,
        engine_reasons: [
          '✕ Candidate telemetry unavailable on current source',
          '✕ Public RPC does not expose pre-finality bank hashes',
          '✕ Engine safely defaulted to UNKNOWN state',
        ],
      },
    };
  }

  // Default: fire
  const celorSteps: RaceStep[] = [
    {
      stage: 'EARLY_SIGNAL',
      label: '0ms: EARLY SIGNAL',
      elapsed_ms: 0,
      detail: 'Direct shred / Geyser telemetry received before RPC gossip',
      status: 'completed',
    },
    {
      stage: 'SLOT',
      label: '+12ms: SLOT CHECK',
      elapsed_ms: 12,
      detail: 'Slot 507123496 verified, phase 0.12 (within budget)',
      status: 'completed',
    },
    {
      stage: 'LEADER',
      label: '+35ms: LEADER CHECK',
      elapsed_ms: 35,
      detail: 'Active leader confirmed, remaining tenure 320ms',
      status: 'completed',
    },
    {
      stage: 'BANK',
      label: '+78ms: BANK VALIDATION',
      elapsed_ms: 78,
      detail: 'Candidate bank valid, blockhash correlated across providers',
      status: 'completed',
    },
    {
      stage: 'STATE',
      label: '+120ms: STATE CHECK',
      elapsed_ms: 120,
      detail: 'Pre-execution pool creation verified against rules',
      status: 'completed',
    },
    {
      stage: 'FIRE',
      label: '+145ms: DECISION: FIRE',
      elapsed_ms: 145,
      detail: 'Deterministic engine matched: FIRE via Direct Leader QUIC',
      status: 'completed',
    },
    {
      stage: 'QUIC',
      label: '+162ms: DIRECT LEADER QUIC',
      elapsed_ms: 162,
      detail: 'Dispatched signed transaction to active leader TPU (port 8003)',
      status: 'completed',
    },
    {
      stage: 'LANDED',
      label: `+${celorMs}ms: LANDED`,
      elapsed_ms: celorMs,
      detail: 'Landed in target block #507123496 (Block N)',
      status: 'completed',
    },
  ];

  return {
    scenario_id: 'sim-fire-001',
    scenario_type: 'fire',
    mode: 'SIMULATION',
    disclaimer: 'Illustrative comparison. Not a live execution benchmark.',
    token,
    initial_mcap_usd: initialMcap,
    standard_lane: standardOutcome,
    celor_lane: {
      name: 'CELOR SNIPER INFRA',
      badge: 'CELOR',
      total_decision_ms: 145,
      total_landing_ms: celorMs,
      route: 'Direct Leader QUIC',
      landed_slot: 507123496,
      entry_mcap_usd: initialMcap * 1.01,
      price_impact_percent: 1.0,
      steps: celorSteps,
    },
    decision_lead_ms: 520 - 145,
    summary_verdict: 'CELOR GOT THE DECISION FIRST',
    technical_trace: {
      slot: 507123496,
      current_leader: 'LeaderKey_ValidatorSlotLeader',
      bank_id: 'bank-cand-01',
      bank_hash: '7KxM...4NpR',
      blockhash: '5kUNG3npQx73uhGzo5MYMj6FLtuz52CjmCXWrqF24hbGYZs87Ld6ZxbmXeprv667',
      source: 'Geyser Level 4 / Yellowstone',
      freshness_tier: 'Fresh',
      decision: 'FIRE',
      update_parent_observed: false,
      canonical_state: 'CANONICAL',
      finality_mode: 'FAST_PATH_CERT',
      route: 'Direct Leader QUIC (Port 8003)',
      quic_target_port: 8003,
      execution_timestamp_ms: 1791103712490,
      engine_reasons: [
        '✓ Target event matched: Pre-Execution pool launch',
        '✓ Candidate bank valid and verified',
        '✓ Active leader identified (remaining tenure 320ms)',
        '✓ Fresh blockhash verified',
        '✓ Direct leader QUIC route pre-warmed and ready',
      ],
    },
  };
}

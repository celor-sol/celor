export interface RaceStep {
  stage: string;
  label: string;
  elapsed_ms: number;
  detail: string;
  status: 'completed' | 'active' | 'cancelled' | 'pending';
}

export interface LaneOutcome {
  name: string;
  badge: string;
  total_decision_ms: number;
  total_landing_ms: number;
  route: string;
  landed_slot: number;
  entry_mcap_usd: number;
  price_impact_percent: number;
  steps: RaceStep[];
}

export interface TechnicalTrace {
  slot: number;
  current_leader: string;
  bank_id?: string;
  bank_hash?: string;
  blockhash: string;
  source: string;
  freshness_tier: string;
  decision: string;
  update_parent_observed: boolean;
  canonical_state: string;
  finality_mode: string;
  route: string;
  quic_target_port: number;
  execution_timestamp_ms: number;
  engine_reasons: string[];
}

export interface SimulatorScenarioResponse {
  scenario_id: string;
  scenario_type: 'fire' | 'cancel_abandoned' | 'wait_handoff' | 'unknown_telemetry' | string;
  mode: string;
  disclaimer: string;
  token: string;
  initial_mcap_usd: number;
  standard_lane: LaneOutcome;
  celor_lane: LaneOutcome;
  decision_lead_ms: number;
  summary_verdict: string;
  technical_trace: TechnicalTrace;
}

export interface SniperRule {
  id: string;
  name: string;
  program: string;
  event_type: string;
  earliest_state: string;
  route: string;
  action: string;
  cancel_condition: string;
  leader_target: string;
  armed: boolean;
}

export interface ExecutionRecord {
  execution_id: string;
  rule_id: string;
  status: string;
  transaction_base64: string;
  transaction_signature?: string;
  timestamp_ms: number;
  submitted_at?: number;
  observed_at?: number;
  landed_slot?: number;
  confirmation_status?: string;
  finalized_at?: number;
  failure_reason?: string;
  route?: string;
  leader?: string;
  source?: string;
}

use chrono_bench::decision::{ExecutionDecisionEngine, RoutingAction};
use chrono_bench::freshness::FreshnessState;
use chrono_core::events::{ChronoEvent, ChronoEventKind};
use chrono_core::types::Slot;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SniperAction {
    Fire,
    Wait,
    Cancel,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SniperTriggerEvent {
    pub event_id: String,
    pub event_type: String,
    pub slot: Slot,
    pub signature: Option<String>,
    pub blockhash: Option<String>,
    pub bank_id: Option<String>,
    pub parent: Option<String>,
    pub leader: Option<String>,
    pub program_id: Option<String>,
    pub source: String,
    pub provenance: String,
    pub observed_at: u64,
    pub observed_at_nanos: Option<u64>,
    pub sequence: u64,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SniperRule {
    pub id: String,
    pub name: String,
    pub program: String,
    pub event_type: String,
    pub earliest_state: String,
    pub route: String,
    pub action: String,
    pub cancel_condition: String,
    pub leader_target: String,
    pub armed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SniperDecision {
    pub rule_id: String,
    pub event_id: String,
    pub action: SniperAction,
    pub reasons: Vec<String>,
    pub trigger_event: SniperTriggerEvent,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRecord {
    pub execution_id: String,
    pub rule_id: String,
    pub status: String,
    pub transaction_base64: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_signature: Option<String>,
    pub timestamp_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub submitted_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub observed_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub landed_slot: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub confirmation_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finalized_at: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub failure_reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub route: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub leader: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
}

#[derive(Debug, Clone)]
pub struct DedupEntry {
    pub execution_id: String,
    pub timestamp_ms: u64,
}

pub struct SniperEngine {
    rules: Mutex<HashMap<String, SniperRule>>,
    history: Mutex<VecDeque<SniperDecision>>,
    live_events: Mutex<VecDeque<SniperTriggerEvent>>,
    executions: Mutex<VecDeque<ExecutionRecord>>,
    dedup_cache: Mutex<HashMap<String, DedupEntry>>,
}

impl SniperEngine {
    pub fn new() -> Self {
        let mut rules = HashMap::new();
        
        rules.insert(
            "rule-default-catchall".to_string(),
            SniperRule {
                id: "rule-default-catchall".to_string(),
                name: "Global Catch-All Tracker".to_string(),
                program: "ANY".to_string(),
                event_type: "Leader Node Active".to_string(),
                earliest_state: "Leader Active".to_string(),
                route: "QUIC".to_string(),
                action: "FIRE".to_string(),
                cancel_condition: "Bank Abandoned".to_string(),
                leader_target: "Current".to_string(),
                armed: true,
            },
        );

        Self {
            rules: Mutex::new(rules),
            history: Mutex::new(VecDeque::with_capacity(100)),
            live_events: Mutex::new(VecDeque::with_capacity(100)),
            executions: Mutex::new(VecDeque::with_capacity(100)),
            dedup_cache: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for SniperEngine {
    fn default() -> Self {
        Self::new()
    }
}

impl SniperEngine {
    pub fn get_rules(&self) -> Vec<SniperRule> {
        let rules = self.rules.lock().unwrap();
        rules.values().cloned().collect()
    }

    pub fn add_rule(&self, rule: SniperRule) {
        let mut rules = self.rules.lock().unwrap();
        rules.insert(rule.id.clone(), rule);
    }

    pub fn update_rule(&self, id: &str, armed: bool) -> Option<SniperRule> {
        let mut rules = self.rules.lock().unwrap();
        if let Some(rule) = rules.get_mut(id) {
            rule.armed = armed;
            Some(rule.clone())
        } else {
            None
        }
    }

    pub fn delete_rule(&self, id: &str) -> bool {
        let mut rules = self.rules.lock().unwrap();
        rules.remove(id).is_some()
    }

    pub fn get_live_events(&self) -> Vec<SniperTriggerEvent> {
        let events = self.live_events.lock().unwrap();
        events.iter().cloned().collect()
    }

    pub fn get_recent_decisions(&self) -> Vec<SniperDecision> {
        let history = self.history.lock().unwrap();
        history.iter().cloned().collect()
    }

    /// Check if transaction was already submitted within deduplication window.
    /// If found, returns Some(existing_execution_id).
    /// If not found, records it and returns None.
    pub fn check_or_record_dedup(&self, dedup_key: &str, execution_id: &str, window_ms: u64) -> Option<String> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let mut cache = self.dedup_cache.lock().unwrap();

        // Evict expired entries older than 30s
        cache.retain(|_, v| now.saturating_sub(v.timestamp_ms) < 30_000);

        if let Some(entry) = cache.get(dedup_key) {
            if now.saturating_sub(entry.timestamp_ms) <= window_ms {
                return Some(entry.execution_id.clone());
            }
        }

        cache.insert(
            dedup_key.to_string(),
            DedupEntry {
                execution_id: execution_id.to_string(),
                timestamp_ms: now,
            },
        );
        None
    }

    pub fn record_execution(&self, execution_id: &str, rule_id: &str, status: &str, tx_base64: &str) {
        self.record_execution_with_details(execution_id, rule_id, status, tx_base64, None, None, None, None);
    }

    #[allow(clippy::too_many_arguments)]
    pub fn record_execution_with_details(
        &self,
        execution_id: &str,
        rule_id: &str,
        status: &str,
        tx_base64: &str,
        signature: Option<&str>,
        route: Option<&str>,
        leader: Option<&str>,
        source: Option<&str>,
    ) {
        let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;
        let record = ExecutionRecord {
            execution_id: execution_id.to_string(),
            rule_id: rule_id.to_string(),
            status: status.to_string(),
            transaction_base64: tx_base64.to_string(),
            transaction_signature: signature.map(|s| s.to_string()),
            timestamp_ms: now,
            submitted_at: if status == "SUBMITTED" { Some(now) } else { None },
            observed_at: None,
            landed_slot: None,
            confirmation_status: None,
            finalized_at: None,
            failure_reason: None,
            route: route.map(|r| r.to_string()),
            leader: leader.map(|l| l.to_string()),
            source: source.map(|s| s.to_string()),
        };
        let mut execs = self.executions.lock().unwrap();
        if execs.len() >= 100 {
            execs.pop_front();
        }
        execs.push_back(record);
    }

    pub fn get_execution(&self, execution_id: &str) -> Option<ExecutionRecord> {
        let execs = self.executions.lock().unwrap();
        execs.iter().find(|r| r.execution_id == execution_id).cloned()
    }

    pub fn update_execution_status(&self, execution_id: &str, status: &str) {
        let mut execs = self.executions.lock().unwrap();
        if let Some(record) = execs.iter_mut().find(|r| r.execution_id == execution_id) {
            record.status = status.to_string();
        }
    }

    pub fn update_execution_submitted(
        &self,
        execution_id: &str,
        status: &str,
        signature: Option<&str>,
        submitted_at: u64,
        route: Option<&str>,
        leader: Option<&str>,
    ) {
        let mut execs = self.executions.lock().unwrap();
        if let Some(record) = execs.iter_mut().find(|r| r.execution_id == execution_id) {
            record.status = status.to_string();
            if let Some(sig) = signature {
                record.transaction_signature = Some(sig.to_string());
            }
            record.submitted_at = Some(submitted_at);
            if let Some(rt) = route {
                record.route = Some(rt.to_string());
            }
            if let Some(ldr) = leader {
                record.leader = Some(ldr.to_string());
            }
        }
    }

    pub fn update_execution_landed(&self, execution_id: &str, slot: Option<u64>, observed_at: u64) {
        let mut execs = self.executions.lock().unwrap();
        if let Some(record) = execs.iter_mut().find(|r| r.execution_id == execution_id) {
            record.status = "LANDED".to_string();
            record.landed_slot = slot;
            record.observed_at = Some(observed_at);
        }
    }

    pub fn update_execution_confirmed(&self, execution_id: &str, conf_status: &str) {
        let mut execs = self.executions.lock().unwrap();
        if let Some(record) = execs.iter_mut().find(|r| r.execution_id == execution_id) {
            record.status = "CONFIRMED".to_string();
            record.confirmation_status = Some(conf_status.to_string());
        }
    }

    pub fn update_execution_finalized(&self, execution_id: &str, finalized_at: u64) {
        let mut execs = self.executions.lock().unwrap();
        if let Some(record) = execs.iter_mut().find(|r| r.execution_id == execution_id) {
            record.status = "FINALIZED".to_string();
            record.finalized_at = Some(finalized_at);
        }
    }

    pub fn update_execution_failed(&self, execution_id: &str, status: &str, reason: &str) {
        let mut execs = self.executions.lock().unwrap();
        if let Some(record) = execs.iter_mut().find(|r| r.execution_id == execution_id) {
            record.status = status.to_string();
            record.failure_reason = Some(reason.to_string());
        }
    }

    pub fn get_executions(&self) -> Vec<ExecutionRecord> {
        let execs = self.executions.lock().unwrap();
        execs.iter().cloned().collect()
    }

    pub fn process_event(&self, event: &ChronoEvent, freshness: &FreshnessState) -> Option<SniperDecision> {
        let mut trigger = None;

        // Try to match specific event types for sniper triggers
        match &event.kind {
            ChronoEventKind::DeshredObserved { slot, signature, pre_execution_timestamp_nanos, .. } => {
                trigger = Some(SniperTriggerEvent {
                    event_id: format!("{}-{}", event.event_id, signature),
                    event_type: "Pre-Execution".to_string(),
                    slot: *slot,
                    signature: Some(signature.clone()),
                    blockhash: None,
                    bank_id: None,
                    parent: None,
                    leader: freshness.current_leader.clone(),
                    program_id: Some("Unknown".to_string()),
                    source: event.provider.to_string(),
                    provenance: "DIRECT".to_string(),
                    observed_at: event.received_time_ms,
                    observed_at_nanos: *pre_execution_timestamp_nanos,
                    sequence: event.event_id,
                    state: "PRE-EXECUTION".to_string(),
                });
            }
            ChronoEventKind::BankObserved { identity, parent, state: _ } => {
                trigger = Some(SniperTriggerEvent {
                    event_id: format!("{}-{}", event.event_id, identity.bank_id.as_ref().map(|b| b.0).unwrap_or(0)),
                    event_type: "Candidate Bank".to_string(),
                    slot: identity.slot,
                    signature: None,
                    blockhash: identity.blockhash.as_ref().map(|b| b.to_string()),
                    bank_id: identity.bank_id.as_ref().map(|b| b.to_string()),
                    parent: Some(match parent {
                        chrono_core::types::ParentReference::SlotOnly(s) => s.0.to_string(),
                        chrono_core::types::ParentReference::KnownBlockhash(b) => b.0.clone(),
                        chrono_core::types::ParentReference::Genesis => "Genesis".to_string(),
                        chrono_core::types::ParentReference::Unknown => "Unknown".to_string(),
                    }),
                    leader: freshness.current_leader.clone(),
                    program_id: None,
                    source: event.provider.to_string(),
                    provenance: "DIRECT".to_string(),
                    observed_at: event.received_time_ms,
                    observed_at_nanos: None,
                    sequence: event.event_id,
                    state: "CANDIDATE".to_string(),
                });
            }
            ChronoEventKind::UpdateParent { slot, cleared_bank_id, parent_slot, source, .. } => {
                trigger = Some(SniperTriggerEvent {
                    event_id: format!("{}-{}", event.event_id, slot.0),
                    event_type: "UpdateParent".to_string(),
                    slot: *slot,
                    signature: None,
                    blockhash: None,
                    bank_id: cleared_bank_id.as_ref().map(|b| b.to_string()),
                    parent: Some(parent_slot.0.to_string()),
                    leader: freshness.current_leader.clone(),
                    program_id: None,
                    source: source.clone(),
                    provenance: "DIRECT".to_string(),
                    observed_at: event.received_time_ms,
                    observed_at_nanos: None,
                    sequence: event.event_id,
                    state: "ABANDONED".to_string(),
                });
            }
            ChronoEventKind::LeaderObserved { leader } => {
                let leader_str = leader.to_string();
                trigger = Some(SniperTriggerEvent {
                    event_id: format!("{}-{}", event.event_id, leader_str.chars().take(8).collect::<String>()),
                    event_type: "Leader Node Active".to_string(),
                    slot: chrono_core::Slot(0),
                    signature: None,
                    blockhash: None,
                    bank_id: None,
                    parent: None,
                    leader: Some(leader_str),
                    program_id: None,
                    source: event.provider.to_string(),
                    provenance: "INFERRED".to_string(),
                    observed_at: event.received_time_ms,
                    observed_at_nanos: None,
                    sequence: event.event_id,
                    state: "LEADER ACTIVE".to_string(),
                });
            }
            _ => {}
        }

        if let Some(t) = trigger {
            // Store in live events buffer
            {
                let mut evs = self.live_events.lock().unwrap();
                if evs.len() >= 100 {
                    evs.pop_front();
                }
                evs.push_back(t.clone());
            }

            // Evaluate against rules
            let rules = self.rules.lock().unwrap();
            for rule in rules.values() {
                if !rule.armed {
                    continue;
                }

                // Simple matching logic
                let mut matched = false;
                if rule.earliest_state == "Pre-Execution" && t.state == "PRE-EXECUTION" {
                    matched = true;
                }
                if rule.earliest_state == "Candidate" && (t.state == "CANDIDATE" || t.state == "PRE-EXECUTION") {
                    matched = true;
                }
                if rule.earliest_state == "Leader Active" && (t.state == "LEADER ACTIVE" || t.state == "CANDIDATE" || t.state == "PRE-EXECUTION") {
                    matched = true;
                }
                if t.state == "ABANDONED" {
                    matched = true;
                }

                if matched {
                    let mut reasons = Vec::new();
                    let mut action = SniperAction::Unknown;

                    if t.state == "ABANDONED" {
                        action = SniperAction::Cancel;
                        reasons.push("✕ Candidate bank abandoned".to_string());
                        reasons.push("✕ UpdateParent observed".to_string());
                        reasons.push("✕ Trigger no longer valid".to_string());
                    } else {
                        // Evaluate ExecutionDecisionEngine
                        let execution_decision = ExecutionDecisionEngine::evaluate_chrono(freshness, true);
                        match execution_decision.action {
                            RoutingAction::Submit => {
                                action = SniperAction::Fire;
                                reasons.push("✓ Target event matched".to_string());
                                reasons.push("✓ Candidate bank valid".to_string());
                                reasons.push("✓ Leader active".to_string());
                                reasons.push("✓ Fresh blockhash".to_string());
                                reasons.push("✓ QUIC route ready".to_string());
                            }
                            RoutingAction::Wait { wait_ms, .. } => {
                                action = SniperAction::Wait;
                                reasons.push("✓ Target event matched".to_string());
                                reasons.push(format!("⚠ Leader boundary near (wait {}ms)", wait_ms));
                                reasons.push("⚠ Next leader preparing".to_string());
                            }
                            RoutingAction::Abort { reason } => {
                                action = SniperAction::Cancel;
                                reasons.push(format!("✕ Execution engine aborted: {}", reason));
                            }
                            RoutingAction::Unknown { reason } => {
                                action = SniperAction::Unknown;
                                reasons.push(format!("✕ Insufficient evidence: {}", reason));
                            }
                            RoutingAction::Retry { .. } => {}
                        }
                    }

                    let decision = SniperDecision {
                        rule_id: rule.id.clone(),
                        event_id: t.event_id.clone(),
                        action,
                        reasons,
                        trigger_event: t.clone(),
                        timestamp_ms: t.observed_at,
                    };

                    let mut history = self.history.lock().unwrap();
                    if history.len() >= 100 {
                        history.pop_front();
                    }
                    history.push_back(decision.clone());

                    return Some(decision);
                }
            }
        }
        None
    }

    /// Deterministic, reproducible Trench Race simulation runner.
    /// Used for illustrative comparisons in DEMO mode.
    pub fn run_simulation(&self, req: &SimulatorScenarioRequest) -> SimulatorScenarioResponse {
        let scenario = req.scenario.to_lowercase();
        let token = req.token_symbol.clone().unwrap_or_else(|| "$MOON".to_string());
        let initial_mcap = req.initial_mcap_usd.unwrap_or(10_000.0);
        let baseline_ms = req.baseline_rpc_latency_ms.unwrap_or(914);
        let celor_ms = req.celor_latency_ms.unwrap_or(182);

        let standard_steps = vec![
            RaceStep {
                stage: "RPC_REQUEST".to_string(),
                label: "0ms: RPC REQUEST".to_string(),
                elapsed_ms: 0,
                detail: "Conventional bot polls standard cluster RPC pool".to_string(),
                status: "completed".to_string(),
            },
            RaceStep {
                stage: "DATA_RECEIVED".to_string(),
                label: "+180ms: DATA RECEIVED".to_string(),
                elapsed_ms: 180,
                detail: "Observed state after block propagation and aggregator gossip".to_string(),
                status: "completed".to_string(),
            },
            RaceStep {
                stage: "TRANSACTION_BUILT".to_string(),
                label: "+320ms: TRANSACTION BUILT".to_string(),
                elapsed_ms: 320,
                detail: "Client parses incoming data and builds transaction".to_string(),
                status: "completed".to_string(),
            },
            RaceStep {
                stage: "SUBMITTED".to_string(),
                label: "+520ms: SUBMITTED".to_string(),
                elapsed_ms: 520,
                detail: "Dispatches sendTransaction through standard RPC relay hops".to_string(),
                status: "completed".to_string(),
            },
            RaceStep {
                stage: "OBSERVED".to_string(),
                label: "+840ms: OBSERVED".to_string(),
                elapsed_ms: 840,
                detail: "Transaction gossip reaches cluster validators".to_string(),
                status: "completed".to_string(),
            },
            RaceStep {
                stage: "LANDED".to_string(),
                label: format!("+{}ms: LANDED", baseline_ms),
                elapsed_ms: baseline_ms,
                detail: "Confirmed in block N+2 (Slot 507123498)".to_string(),
                status: "completed".to_string(),
            },
        ];

        let standard_outcome = LaneOutcome {
            name: "STANDARD RPC".to_string(),
            badge: "CONVENTIONAL".to_string(),
            total_decision_ms: 520,
            total_landing_ms: baseline_ms,
            route: "Standard RPC Relay".to_string(),
            landed_slot: 507123498,
            entry_mcap_usd: initial_mcap * 1.45,
            price_impact_percent: 45.0,
            steps: standard_steps,
        };

        match scenario.as_str() {
            "cancel_abandoned" => {
                let celor_steps = vec![
                    RaceStep {
                        stage: "EARLY_SIGNAL".to_string(),
                        label: "0ms: EARLY SIGNAL".to_string(),
                        elapsed_ms: 0,
                        detail: "Ingests raw telemetry stream directly from validator node".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "SLOT".to_string(),
                        label: "+12ms: SLOT CHECK".to_string(),
                        elapsed_ms: 12,
                        detail: "Slot 507123496 verified, phase 0.12".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "BANK_CHANGE".to_string(),
                        label: "+48ms: UPDATEPARENT OBSERVED".to_string(),
                        elapsed_ms: 48,
                        detail: "Validator abandoned candidate bank; parent pointer redirected".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "STATE".to_string(),
                        label: "+65ms: STATE INVALIDATED".to_string(),
                        elapsed_ms: 65,
                        detail: "Target candidate bank uncommitted and discarded".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "DECISION_CANCEL".to_string(),
                        label: "+70ms: DECISION: CANCEL".to_string(),
                        elapsed_ms: 70,
                        detail: "Deterministic state engine aborts execution: Capital Protected".to_string(),
                        status: "cancelled".to_string(),
                    },
                ];

                SimulatorScenarioResponse {
                    scenario_id: "sim-cancel-001".to_string(),
                    scenario_type: "cancel_abandoned".to_string(),
                    mode: "SIMULATION".to_string(),
                    disclaimer: "Illustrative comparison. Not a live execution benchmark.".to_string(),
                    token,
                    initial_mcap_usd: initial_mcap,
                    standard_lane: standard_outcome,
                    celor_lane: LaneOutcome {
                        name: "CELOR SNIPER INFRA".to_string(),
                        badge: "CELOR".to_string(),
                        total_decision_ms: 70,
                        total_landing_ms: 70,
                        route: "ABORT (Capital Protected)".to_string(),
                        landed_slot: 0,
                        entry_mcap_usd: 0.0,
                        price_impact_percent: 0.0,
                        steps: celor_steps,
                    },
                    decision_lead_ms: 450,
                    summary_verdict: "CELOR CANCELLED BEFORE BLIND SUBMISSION".to_string(),
                    technical_trace: TechnicalTrace {
                        slot: 507123496,
                        current_leader: "LeaderKey_ValidatorSlotLeader".to_string(),
                        bank_id: Some("bank-cand-09".to_string()),
                        bank_hash: None,
                        blockhash: "4xQz...9KLo".to_string(),
                        source: "Geyser Level 4 / Yellowstone".to_string(),
                        freshness_tier: "Abandoned".to_string(),
                        decision: "CANCEL".to_string(),
                        update_parent_observed: true,
                        canonical_state: "ABANDONED".to_string(),
                        finality_mode: "UNCOMMITTED".to_string(),
                        route: "ABORT".to_string(),
                        quic_target_port: 8003,
                        execution_timestamp_ms: 1791103712500,
                        engine_reasons: vec![
                            "✕ Candidate bank abandoned by validator".to_string(),
                            "✕ UpdateParent observed in cluster".to_string(),
                            "✕ Trigger no longer valid — aborting to protect capital".to_string(),
                        ],
                    },
                }
            }
            "wait_handoff" => {
                let celor_steps = vec![
                    RaceStep {
                        stage: "EARLY_SIGNAL".to_string(),
                        label: "0ms: EARLY SIGNAL".to_string(),
                        elapsed_ms: 0,
                        detail: "Ingests raw telemetry stream directly from validator node".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "LEADER_BOUNDARY".to_string(),
                        label: "+20ms: LEADER TENURE CHECK".to_string(),
                        elapsed_ms: 20,
                        detail: "Current leader tenure expiring: remaining window <40ms".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "DECISION_WAIT".to_string(),
                        label: "+35ms: DECISION: WAIT".to_string(),
                        elapsed_ms: 35,
                        detail: "Staging transaction for imminent leader handover".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "HANDOVER".to_string(),
                        label: "+60ms: NEXT LEADER ENGAGED".to_string(),
                        elapsed_ms: 60,
                        detail: "Pre-warmed TPU QUIC socket connected to upcoming leader".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "FIRE".to_string(),
                        label: "+85ms: FIRE NEXT LEADER".to_string(),
                        elapsed_ms: 85,
                        detail: "Dispatched transaction into opening slot of new leader".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "LANDED".to_string(),
                        label: "+125ms: LANDED".to_string(),
                        elapsed_ms: 125,
                        detail: "Landed cleanly in slot 507123497 without handoff drop".to_string(),
                        status: "completed".to_string(),
                    },
                ];

                SimulatorScenarioResponse {
                    scenario_id: "sim-wait-001".to_string(),
                    scenario_type: "wait_handoff".to_string(),
                    mode: "SIMULATION".to_string(),
                    disclaimer: "Illustrative comparison. Not a live execution benchmark.".to_string(),
                    token,
                    initial_mcap_usd: initial_mcap,
                    standard_lane: standard_outcome,
                    celor_lane: LaneOutcome {
                        name: "CELOR SNIPER INFRA".to_string(),
                        badge: "CELOR".to_string(),
                        total_decision_ms: 35,
                        total_landing_ms: 125,
                        route: "Direct Next-Leader QUIC".to_string(),
                        landed_slot: 507123497,
                        entry_mcap_usd: initial_mcap * 1.05,
                        price_impact_percent: 5.0,
                        steps: celor_steps,
                    },
                    decision_lead_ms: 485,
                    summary_verdict: "CELOR TIMED THE LEADER HANDOFF PRECISELY".to_string(),
                    technical_trace: TechnicalTrace {
                        slot: 507123496,
                        current_leader: "LeaderKey_ValidatorSlotLeader".to_string(),
                        bank_id: Some("bank-cand-10".to_string()),
                        bank_hash: None,
                        blockhash: "9hPq...3LkZ".to_string(),
                        source: "Geyser Level 4 / Yellowstone".to_string(),
                        freshness_tier: "HandoffImminent".to_string(),
                        decision: "WAIT".to_string(),
                        update_parent_observed: false,
                        canonical_state: "CANONICAL".to_string(),
                        finality_mode: "FAST_PATH".to_string(),
                        route: "Next-Leader QUIC".to_string(),
                        quic_target_port: 8003,
                        execution_timestamp_ms: 1791103712550,
                        engine_reasons: vec![
                            "✓ Target event matched: Pre-Execution pool launch".to_string(),
                            "⚠ Leader boundary near: tenure window <40ms remaining".to_string(),
                            "✓ Successfully redirected to upcoming leader TPU QUIC socket".to_string(),
                        ],
                    },
                }
            }
            "unknown_telemetry" => {
                let celor_steps = vec![
                    RaceStep {
                        stage: "EARLY_SIGNAL".to_string(),
                        label: "0ms: EARLY SIGNAL".to_string(),
                        elapsed_ms: 0,
                        detail: "Public RPC connection detected (no candidate bank telemetry)".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "TELEMETRY_CHECK".to_string(),
                        label: "+25ms: SOURCE DIAGNOSTIC".to_string(),
                        elapsed_ms: 25,
                        detail: "Candidate telemetry unavailable on current source".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "DECISION_UNKNOWN".to_string(),
                        label: "+40ms: DECISION: UNKNOWN".to_string(),
                        elapsed_ms: 40,
                        detail: "Deterministic state engine refuses unverified gamble: Fail Closed".to_string(),
                        status: "active".to_string(),
                    },
                ];

                SimulatorScenarioResponse {
                    scenario_id: "sim-unknown-001".to_string(),
                    scenario_type: "unknown_telemetry".to_string(),
                    mode: "SIMULATION".to_string(),
                    disclaimer: "Illustrative comparison. Not a live execution benchmark.".to_string(),
                    token,
                    initial_mcap_usd: initial_mcap,
                    standard_lane: standard_outcome,
                    celor_lane: LaneOutcome {
                        name: "CELOR SNIPER INFRA".to_string(),
                        badge: "CELOR".to_string(),
                        total_decision_ms: 40,
                        total_landing_ms: 40,
                        route: "HOLD (Source Unverified)".to_string(),
                        landed_slot: 0,
                        entry_mcap_usd: 0.0,
                        price_impact_percent: 0.0,
                        steps: celor_steps,
                    },
                    decision_lead_ms: 480,
                    summary_verdict: "CELOR FAILED CLOSED ON LIMITED RPC SOURCE".to_string(),
                    technical_trace: TechnicalTrace {
                        slot: 507123496,
                        current_leader: "LeaderKey_ValidatorSlotLeader".to_string(),
                        bank_id: None,
                        bank_hash: None,
                        blockhash: "11111111111111111111111111111111".to_string(),
                        source: "Public RPC (Limited Telemetry)".to_string(),
                        freshness_tier: "Unknown".to_string(),
                        decision: "UNKNOWN".to_string(),
                        update_parent_observed: false,
                        canonical_state: "UNKNOWN".to_string(),
                        finality_mode: "UNAVAILABLE".to_string(),
                        route: "HOLD".to_string(),
                        quic_target_port: 8003,
                        execution_timestamp_ms: 1791103712600,
                        engine_reasons: vec![
                            "✕ Candidate telemetry unavailable on current source".to_string(),
                            "✕ Public RPC does not expose pre-finality bank hashes".to_string(),
                            "✕ Engine safely defaulted to UNKNOWN state".to_string(),
                        ],
                    },
                }
            }
            _ => {
                // Default: "fire" (Optimal Trench Launch)
                let celor_steps = vec![
                    RaceStep {
                        stage: "EARLY_SIGNAL".to_string(),
                        label: "0ms: EARLY SIGNAL".to_string(),
                        elapsed_ms: 0,
                        detail: "Direct shred / Geyser telemetry received before RPC gossip".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "SLOT".to_string(),
                        label: "+12ms: SLOT CHECK".to_string(),
                        elapsed_ms: 12,
                        detail: "Slot 507123496 verified, phase 0.12 (well within slot budget)".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "LEADER".to_string(),
                        label: "+35ms: LEADER CHECK".to_string(),
                        elapsed_ms: 35,
                        detail: "Active leader confirmed, remaining tenure 320ms".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "BANK".to_string(),
                        label: "+78ms: BANK VALIDATION".to_string(),
                        elapsed_ms: 78,
                        detail: "Candidate bank valid, blockhash correlated across providers".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "STATE".to_string(),
                        label: "+120ms: STATE CHECK".to_string(),
                        elapsed_ms: 120,
                        detail: "Pre-execution pool creation verified against rules".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "FIRE".to_string(),
                        label: "+145ms: DECISION: FIRE".to_string(),
                        elapsed_ms: 145,
                        detail: "Deterministic engine matched: FIRE via Direct Leader QUIC".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "QUIC".to_string(),
                        label: "+162ms: DIRECT LEADER QUIC".to_string(),
                        elapsed_ms: 162,
                        detail: "Dispatched signed transaction to active leader TPU (port 8003)".to_string(),
                        status: "completed".to_string(),
                    },
                    RaceStep {
                        stage: "LANDED".to_string(),
                        label: format!("+{}ms: LANDED", celor_ms),
                        elapsed_ms: celor_ms,
                        detail: "Landed in target block #507123496 (Block N)".to_string(),
                        status: "completed".to_string(),
                    },
                ];

                SimulatorScenarioResponse {
                    scenario_id: "sim-fire-001".to_string(),
                    scenario_type: "fire".to_string(),
                    mode: "SIMULATION".to_string(),
                    disclaimer: "Illustrative comparison. Not a live execution benchmark.".to_string(),
                    token,
                    initial_mcap_usd: initial_mcap,
                    standard_lane: standard_outcome,
                    celor_lane: LaneOutcome {
                        name: "CELOR SNIPER INFRA".to_string(),
                        badge: "CELOR".to_string(),
                        total_decision_ms: 145,
                        total_landing_ms: celor_ms,
                        route: "Direct Leader QUIC".to_string(),
                        landed_slot: 507123496,
                        entry_mcap_usd: initial_mcap * 1.01,
                        price_impact_percent: 1.0,
                        steps: celor_steps,
                    },
                    decision_lead_ms: 520 - 145,
                    summary_verdict: "CELOR GOT THE DECISION FIRST".to_string(),
                    technical_trace: TechnicalTrace {
                        slot: 507123496,
                        current_leader: "LeaderKey_ValidatorSlotLeader".to_string(),
                        bank_id: Some("bank-cand-01".to_string()),
                        bank_hash: Some("7KxM...4NpR".to_string()),
                        blockhash: "5kUNG3npQx73uhGzo5MYMj6FLtuz52CjmCXWrqF24hbGYZs87Ld6ZxbmXeprv667".to_string(),
                        source: "Geyser Level 4 / Yellowstone".to_string(),
                        freshness_tier: "Fresh".to_string(),
                        decision: "FIRE".to_string(),
                        update_parent_observed: false,
                        canonical_state: "CANONICAL".to_string(),
                        finality_mode: "FAST_PATH_CERT".to_string(),
                        route: "Direct Leader QUIC (Port 8003)".to_string(),
                        quic_target_port: 8003,
                        execution_timestamp_ms: 1791103712490,
                        engine_reasons: vec![
                            "✓ Target event matched: Pre-Execution pool launch".to_string(),
                            "✓ Candidate bank valid and verified".to_string(),
                            "✓ Active leader identified (remaining tenure 320ms)".to_string(),
                            "✓ Fresh blockhash verified".to_string(),
                            "✓ Direct leader QUIC route pre-warmed and ready".to_string(),
                        ],
                    },
                }
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulatorScenarioRequest {
    pub scenario: String,
    pub token_symbol: Option<String>,
    pub initial_mcap_usd: Option<f64>,
    pub baseline_rpc_latency_ms: Option<u64>,
    pub celor_latency_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RaceStep {
    pub stage: String,
    pub label: String,
    pub elapsed_ms: u64,
    pub detail: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaneOutcome {
    pub name: String,
    pub badge: String,
    pub total_decision_ms: u64,
    pub total_landing_ms: u64,
    pub route: String,
    pub landed_slot: u64,
    pub entry_mcap_usd: f64,
    pub price_impact_percent: f64,
    pub steps: Vec<RaceStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalTrace {
    pub slot: u64,
    pub current_leader: String,
    pub bank_id: Option<String>,
    pub bank_hash: Option<String>,
    pub blockhash: String,
    pub source: String,
    pub freshness_tier: String,
    pub decision: String,
    pub update_parent_observed: bool,
    pub canonical_state: String,
    pub finality_mode: String,
    pub route: String,
    pub quic_target_port: u16,
    pub execution_timestamp_ms: u64,
    pub engine_reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SimulatorScenarioResponse {
    pub scenario_id: String,
    pub scenario_type: String,
    pub mode: String,
    pub disclaimer: String,
    pub token: String,
    pub initial_mcap_usd: f64,
    pub standard_lane: LaneOutcome,
    pub celor_lane: LaneOutcome,
    pub decision_lead_ms: i64,
    pub summary_verdict: String,
    pub technical_trace: TechnicalTrace,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simulator_scenarios_deterministic() {
        let engine = SniperEngine::new();
        let fire_res = engine.run_simulation(&SimulatorScenarioRequest {
            scenario: "fire".to_string(),
            token_symbol: Some("$MOON".to_string()),
            initial_mcap_usd: Some(10_000.0),
            baseline_rpc_latency_ms: Some(914),
            celor_latency_ms: Some(182),
        });

        assert_eq!(fire_res.mode, "SIMULATION");
        assert_eq!(fire_res.technical_trace.decision, "FIRE");
        assert_eq!(fire_res.celor_lane.route, "Direct Leader QUIC");
        assert!(fire_res.decision_lead_ms > 0);

        let cancel_res = engine.run_simulation(&SimulatorScenarioRequest {
            scenario: "cancel_abandoned".to_string(),
            token_symbol: None,
            initial_mcap_usd: None,
            baseline_rpc_latency_ms: None,
            celor_latency_ms: None,
        });

        assert_eq!(cancel_res.technical_trace.decision, "CANCEL");
        assert!(cancel_res.technical_trace.update_parent_observed);
    }
}

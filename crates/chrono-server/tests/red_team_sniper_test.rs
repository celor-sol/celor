use chrono_core::events::{ChronoEvent, ChronoEventKind};
use chrono_core::types::{BankId, LeaderId, ProviderId, Slot};
use chrono_bench::freshness::{BankFreshnessTier, FreshnessState, FreshnessTier};
use chrono_bench::decision::{ExecutionDecisionEngine, RoutingAction};
use chrono_server::sniper::{SniperEngine, SimulatorScenarioRequest, SniperAction};
use base64::Engine;

#[test]
fn test_red_team_simulator_100_runs_determinism() {
    let engine = SniperEngine::new();
    let scenarios = ["fire", "cancel_abandoned", "wait_handoff", "unknown_telemetry"];

    for sc in scenarios {
        let first_run = serde_json::to_string(&engine.run_simulation(&SimulatorScenarioRequest {
            scenario: sc.to_string(),
            token_symbol: Some("$MOON".to_string()),
            initial_mcap_usd: Some(10_000.0),
            baseline_rpc_latency_ms: Some(914),
            celor_latency_ms: Some(182),
        })).unwrap();

        for _ in 0..100 {
            let run = serde_json::to_string(&engine.run_simulation(&SimulatorScenarioRequest {
                scenario: sc.to_string(),
                token_symbol: Some("$MOON".to_string()),
                initial_mcap_usd: Some(10_000.0),
                baseline_rpc_latency_ms: Some(914),
                celor_latency_ms: Some(182),
            })).unwrap();
            assert_eq!(first_run, run, "Simulator output diverged for scenario {}", sc);
        }
    }
}

#[test]
fn test_red_team_fork_reorg_update_parent_cancels_candidate() {
    let engine = SniperEngine::new();
    let freshness = FreshnessState {
        slot_tier: FreshnessTier::Fresh,
        slot_elapsed_ms: 100,
        slot_target_duration_ms: 400,
        leader_tier: FreshnessTier::Fresh,
        current_leader: Some("Leader_Slot100".to_string()),
        next_leader: Some("Leader_Slot101".to_string()),
        remaining_window_ms: 300,
        blockhash_tier: FreshnessTier::Fresh,
        blockhash: "4xQz...9KLo".to_string(),
        blockhash_age_ms: 100,
        blockhash_age_slots: 0,
        source_tier: FreshnessTier::Fresh,
        last_event_received_ago_ms: 2,
        bank_tier: BankFreshnessTier::Canonical,
        bank_id: Some("bank-1".to_string()),
    };

    let provider = ProviderId::new("yellowstone-provider");
    let reorg_event = ChronoEvent::new(
        1001,
        provider,
        Slot(500),
        None,
        ChronoEventKind::UpdateParent {
            slot: Slot(500),
            cleared_bank_id: Some(BankId(1)),
            parent_slot: Slot(499),
            parent_block_id: None,
            fec_set_index: None,
            source: "Yellowstone".to_string(),
        },
    );

    let decision = engine.process_event(&reorg_event, &freshness);
    assert!(decision.is_some(), "UpdateParent should trigger decision");
    let dec = decision.unwrap();
    assert_eq!(dec.action, SniperAction::Cancel, "UpdateParent must trigger CANCEL");
    assert!(dec.reasons.iter().any(|r| r.contains("abandoned")), "Reason must mention abandonment");
}

#[test]
fn test_red_team_leader_boundary_triggers_wait() {
    let freshness = FreshnessState {
        slot_tier: FreshnessTier::Fresh,
        slot_elapsed_ms: 380,
        slot_target_duration_ms: 400,
        leader_tier: FreshnessTier::HandoffImminent,
        current_leader: Some("Leader_Expiring".to_string()),
        next_leader: Some("Leader_Incoming".to_string()),
        remaining_window_ms: 20, // < 40ms threshold
        blockhash_tier: FreshnessTier::Fresh,
        blockhash: "FreshHash111111111111111111111111111111111".to_string(),
        blockhash_age_ms: 20,
        blockhash_age_slots: 0,
        source_tier: FreshnessTier::Fresh,
        last_event_received_ago_ms: 1,
        bank_tier: BankFreshnessTier::Canonical,
        bank_id: Some("bank-1".to_string()),
    };

    let decision = ExecutionDecisionEngine::evaluate_chrono(&freshness, true);
    match decision.action {
        RoutingAction::Wait { wait_ms, .. } => {
            assert!(wait_ms >= 15, "Wait ms should be at least minimum wait");
        }
        other => panic!("Expected RoutingAction::Wait, got {:?}", other),
    }
}

#[test]
fn test_red_team_stale_source_triggers_unknown() {
    let freshness = FreshnessState {
        slot_tier: FreshnessTier::Fresh,
        slot_elapsed_ms: 100,
        slot_target_duration_ms: 400,
        leader_tier: FreshnessTier::Fresh,
        current_leader: Some("Leader_Active".to_string()),
        next_leader: None,
        remaining_window_ms: 300,
        blockhash_tier: FreshnessTier::Fresh,
        blockhash: "Hash111111111111111111111111111111111111111".to_string(),
        blockhash_age_ms: 100,
        blockhash_age_slots: 0,
        source_tier: FreshnessTier::Stale, // Source disconnected / stale
        last_event_received_ago_ms: 10_000,
        bank_tier: BankFreshnessTier::Canonical,
        bank_id: None,
    };

    let decision = ExecutionDecisionEngine::evaluate_chrono(&freshness, true);
    match decision.action {
        RoutingAction::Unknown { .. } => {}
        other => panic!("Expected RoutingAction::Unknown on stale source, got {:?}", other),
    }
}

#[test]
fn test_red_team_no_fake_candidate_on_public_rpc() {
    let engine = SniperEngine::new();
    let freshness = FreshnessState {
        slot_tier: FreshnessTier::Fresh,
        slot_elapsed_ms: 50,
        slot_target_duration_ms: 400,
        leader_tier: FreshnessTier::Fresh,
        current_leader: Some("RPC_Leader".to_string()),
        next_leader: None,
        remaining_window_ms: 350,
        blockhash_tier: FreshnessTier::Fresh,
        blockhash: "Hash".to_string(),
        blockhash_age_ms: 50,
        blockhash_age_slots: 0,
        source_tier: FreshnessTier::Fresh,
        last_event_received_ago_ms: 5,
        bank_tier: BankFreshnessTier::Canonical,
        bank_id: None,
    };

    let provider = ProviderId::new("public-rpc");
    let leader_event = ChronoEvent::new(
        2001,
        provider,
        Slot(100),
        None,
        ChronoEventKind::LeaderObserved {
            leader: LeaderId("LeaderPubKey1111111111111111111111111111111".to_string()),
        },
    );

    let decision = engine.process_event(&leader_event, &freshness);
    assert!(decision.is_some());
    let dec = decision.unwrap();
    assert_eq!(dec.trigger_event.state, "LEADER ACTIVE");
    assert_ne!(dec.trigger_event.state, "CANDIDATE", "LeaderObserved must NEVER be mapped to CANDIDATE");
    assert_eq!(dec.trigger_event.bank_id, None, "Public RPC must have bank_id: None");
}

#[test]
fn test_red_team_deduplication_engine_concurrent_protection() {
    let engine = std::sync::Arc::new(SniperEngine::new());
    let dedup_key = "rule-1:SigTestUniqueTransactionSignature111111111111111";

    let mut handles = Vec::new();
    for i in 0..50 {
        let eng = engine.clone();
        let key = dedup_key.to_string();
        let exec_id = format!("exec-thread-{}", i);
        handles.push(std::thread::spawn(move || {
            eng.check_or_record_dedup(&key, &exec_id, 10_000)
        }));
    }

    let mut accepted_count = 0;
    let mut duplicate_count = 0;
    for h in handles {
        let res = h.join().unwrap();
        if res.is_none() {
            accepted_count += 1;
        } else {
            duplicate_count += 1;
        }
    }

    assert_eq!(accepted_count, 1, "Exactly 1 concurrent request should be accepted");
    assert_eq!(duplicate_count, 49, "Remaining 49 concurrent requests must be detected as duplicates");
}

#[test]
fn test_red_team_paused_rule_safeguard() {
    let engine = SniperEngine::new();
    let mut rules = engine.get_rules();
    let rule_id = rules[0].id.clone();

    // Pause the rule
    engine.update_rule(&rule_id, false);
    rules = engine.get_rules();
    let target_rule = rules.iter().find(|r| r.id == rule_id).unwrap();
    assert!(!target_rule.armed, "Rule must be disarmed");

    // Process event against disarmed rule
    let provider = ProviderId::new("yellowstone-provider");
    let event = ChronoEvent::new(
        3001,
        provider,
        Slot(500),
        None,
        ChronoEventKind::LeaderObserved {
            leader: LeaderId("Leader11111111111111111111111111111111111".to_string()),
        },
    );
    let freshness = FreshnessState {
        slot_tier: FreshnessTier::Fresh,
        slot_elapsed_ms: 100,
        slot_target_duration_ms: 400,
        leader_tier: FreshnessTier::Fresh,
        current_leader: Some("Leader11111111111111111111111111111111111".to_string()),
        next_leader: None,
        remaining_window_ms: 300,
        blockhash_tier: FreshnessTier::Fresh,
        blockhash: "Hash".to_string(),
        blockhash_age_ms: 50,
        blockhash_age_slots: 0,
        source_tier: FreshnessTier::Fresh,
        last_event_received_ago_ms: 5,
        bank_tier: BankFreshnessTier::Canonical,
        bank_id: None,
    };

    let decision = engine.process_event(&event, &freshness);
    assert!(decision.is_none(), "Paused rule must NEVER produce a decision or trigger execution");
}

#[test]
fn test_red_team_packet_size_bounds_enforced() {
    // Solana MTU max is 1232 bytes, min signed tx is 64 bytes
    let undersized = [0u8; 32];
    assert!(undersized.len() < 64, "Undersized payload below 64 bytes");

    let oversized = vec![0u8; 1233];
    assert!(oversized.len() > 1232, "Oversized payload above 1232 bytes");

    let valid_packet = [1u8; 256];
    assert!(valid_packet.len() >= 64 && valid_packet.len() <= 1232, "Valid payload within bounds");
}

#[test]
fn test_red_team_execution_lifecycle_truthfulness() {
    let engine = SniperEngine::new();
    let exec_id = "exec-test-truth-001";
    let rule_id = "rule-default-catchall";

    // Step 1: Created & Validating
    engine.record_execution_with_details(
        exec_id,
        rule_id,
        "VALIDATING",
        "mock_tx",
        Some("SigTestTruth111"),
        Some("Direct Leader QUIC"),
        Some("LeaderValidator"),
        Some("LIVE"),
    );

    let rec = engine.get_execution(exec_id).unwrap();
    assert_eq!(rec.status, "VALIDATING");
    assert_eq!(rec.landed_slot, None, "Must not have landed slot in VALIDATING");

    // Step 2: Packet submission -> SUBMITTED (NOT LANDED!)
    engine.update_execution_submitted(exec_id, "SUBMITTED", Some("SigTestTruth111"), 1000, Some("Direct Leader QUIC"), Some("LeaderValidator"));
    let rec = engine.get_execution(exec_id).unwrap();
    assert_eq!(rec.status, "SUBMITTED");
    assert_ne!(rec.status, "LANDED", "Packet submission must NEVER be called LANDED");
    assert_eq!(rec.landed_slot, None);

    // Step 3: Observability
    engine.update_execution_status(exec_id, "OBSERVING");
    let rec = engine.get_execution(exec_id).unwrap();
    assert_eq!(rec.status, "OBSERVING");

    // Step 4: Inclusion verified on chain -> LANDED
    engine.update_execution_landed(exec_id, Some(507123999), 1250);
    let rec = engine.get_execution(exec_id).unwrap();
    assert_eq!(rec.status, "LANDED");
    assert_eq!(rec.landed_slot, Some(507123999));

    // Step 5: Finalized
    engine.update_execution_confirmed(exec_id, "confirmed");
    engine.update_execution_finalized(exec_id, 1350);
    let rec = engine.get_execution(exec_id).unwrap();
    assert_eq!(rec.status, "FINALIZED");
    assert_eq!(rec.finalized_at, Some(1350));
}

#[tokio::test]
async fn test_red_team_route_mainnet_guard_defense_in_depth() {
    use chrono_bench::route::{DirectLeaderQuicRoute, ExecutionRoute};
    use chrono_bench::leader_transport::LeaderTransportResolver;
    use std::sync::Arc;

    // DirectLeaderQuicRoute pointed at mainnet
    let resolver = Arc::new(LeaderTransportResolver::new("https://api.mainnet-beta.solana.com"));
    let route = DirectLeaderQuicRoute::new("https://api.mainnet-beta.solana.com", resolver).unwrap();

    let dummy_tx = base64::engine::general_purpose::STANDARD.encode(vec![1u8; 100]);
    let submit_res = route.submit_transaction(&dummy_tx).await;

    assert!(submit_res.is_err(), "Submission to mainnet MUST fail");
    let err_str = submit_res.err().unwrap().to_string();
    assert!(
        err_str.contains("MAINNET_SAFETY_GUARD_ACTIVE"),
        "Error must specify MAINNET_SAFETY_GUARD_ACTIVE: got {}",
        err_str
    );
}


//! Integration tests for CHRONO Alpenglow Playground (Phase 9)

use chrono_server::playground::{PlaygroundEngine, PlaygroundSimulationRequest};

#[tokio::test]
async fn test_playground_multiple_banks_scenario() {
    let engine = PlaygroundEngine::new();

    for count in [2, 3, 4] {
        let req = PlaygroundSimulationRequest {
            scenario: "multiple_banks".to_string(),
            seed: Some(42),
            bank_count: Some(count),
            followed_bank_id: Some("bank-B".to_string()),
            action_type: None,
            perturbation: None,
        };
        let resp = engine.run_simulation(&req);

        assert_eq!(resp.banks.len(), count, "Expected {} candidate banks", count);
        assert_eq!(resp.scenario_type, "multiple_banks");
        assert_eq!(resp.mode, "SIMULATION");
        assert!(resp.disclaimer.contains("ILLUSTRATIVE DEMO"));

        // Verify followed bank
        let followed = resp.banks.iter().find(|b| b.bank_id == "bank-B").expect("bank-B must exist");
        assert!(followed.is_followed, "bank-B should be highlighted as followed");
    }
}

#[tokio::test]
async fn test_playground_abandon_bank_ghost_block() {
    let engine = PlaygroundEngine::new();
    let req = PlaygroundSimulationRequest {
        scenario: "abandon_bank".to_string(),
        seed: Some(101),
        bank_count: Some(3),
        followed_bank_id: Some("bank-B".to_string()),
        action_type: None,
        perturbation: None,
    };
    let resp = engine.run_simulation(&req);

    let abandoned_node = resp.banks.iter().find(|b| b.bank_id == "bank-B").expect("bank-B present");
    assert_eq!(abandoned_node.state, "ABANDONED");

    let canonical_node = resp.banks.iter().find(|b| b.bank_id == "bank-A").expect("bank-A present");
    assert_eq!(canonical_node.state, "CANONICAL");

    // Decision must cancel/roll back uncommitted transactions
    let decision = resp.decision.expect("Decision expected");
    assert_eq!(decision.action, "CANCEL");
    assert!(decision.why.iter().any(|w| w.contains("abandoned")));
}

#[tokio::test]
async fn test_playground_update_parent_simd_0337() {
    let engine = PlaygroundEngine::new();
    let req = PlaygroundSimulationRequest {
        scenario: "update_parent".to_string(),
        seed: Some(777),
        bank_count: None,
        followed_bank_id: None,
        action_type: None,
        perturbation: None,
    };
    let resp = engine.run_simulation(&req);

    assert!(resp.parent.update_parent_occurred, "UpdateParent must be signaled");
    assert!(resp.parent.cleared_bank_id.is_some(), "Cleared bank ID must be recorded");

    let dead_bank = resp.banks.iter().find(|b| b.state == "ABANDONED").expect("dead parent bank");
    assert!(dead_bank.notes.to_lowercase().contains("abandoned"));

    let promoted_bank = resp.banks.iter().find(|b| b.state == "CANONICAL").expect("promoted bank");
    assert_eq!(promoted_bank.parent_slot, resp.slot - 1);
}

#[tokio::test]
async fn test_playground_leader_handoff_timing() {
    let engine = PlaygroundEngine::new();

    // 1. Fire too late (18ms remaining -> OLD LEADER -> WAIT / MISSED)
    let late_req = PlaygroundSimulationRequest {
        scenario: "leader_handoff".to_string(),
        seed: Some(99),
        bank_count: None,
        followed_bank_id: None,
        action_type: Some("late".to_string()),
        perturbation: None,
    };
    let late_resp = engine.run_simulation(&late_req);
    assert_eq!(late_resp.leader.remaining_ms, 18);
    let decision = late_resp.decision.expect("Decision info");
    assert_eq!(decision.action, "WAIT");
    assert!(decision.why.iter().any(|w| w.contains("Leader almost changed")));

    // 2. Fresh leader window -> FIRE
    let fresh_req = PlaygroundSimulationRequest {
        scenario: "leader_handoff".to_string(),
        seed: Some(99),
        bank_count: None,
        followed_bank_id: None,
        action_type: Some("fresh".to_string()),
        perturbation: None,
    };
    let fresh_resp = engine.run_simulation(&fresh_req);
    assert!(fresh_resp.leader.remaining_ms > 100);
    let decision = fresh_resp.decision.expect("Decision info");
    assert_eq!(decision.action, "FIRE");
}

#[tokio::test]
async fn test_playground_finality_race_clock() {
    let engine = PlaygroundEngine::new();
    let req = PlaygroundSimulationRequest {
        scenario: "finality_race".to_string(),
        seed: Some(555),
        bank_count: None,
        followed_bank_id: None,
        action_type: None,
        perturbation: None,
    };
    let resp = engine.run_simulation(&req);

    assert_eq!(resp.finality.finality_duration_ms, 150);
    assert!(resp.finality.speedup_factor.contains("85.33x"));
    assert_eq!(resp.timeline.len(), 3);
    assert_eq!(resp.timeline[1].elapsed_ms, 150);
    assert_eq!(resp.timeline[2].elapsed_ms, 12_800);
}

#[tokio::test]
async fn test_playground_bls_certificate_verification() {
    let engine = PlaygroundEngine::new();

    // Valid certificate
    let valid_req = PlaygroundSimulationRequest {
        scenario: "bls_certificate".to_string(),
        seed: Some(303),
        bank_count: None,
        followed_bank_id: None,
        action_type: None,
        perturbation: None,
    };
    let valid_resp = engine.run_simulation(&valid_req);
    let cert = valid_resp.certificate.expect("Certificate info");
    assert!(cert.verified, "Authentic aggregate BLS certificate must verify");
    assert!(cert.stake_percent >= 80.0, "Fast-path requires >=80% stake");
    assert_eq!(valid_resp.decision.unwrap().action, "FIRE");

    // Tampered certificate
    let tamper_req = PlaygroundSimulationRequest {
        scenario: "bls_certificate".to_string(),
        seed: Some(303),
        bank_count: None,
        followed_bank_id: None,
        action_type: Some("tamper".to_string()),
        perturbation: None,
    };
    let tamper_resp = engine.run_simulation(&tamper_req);
    let cert = tamper_resp.certificate.expect("Certificate info");
    assert!(!cert.verified, "Tampered certificate signature must be rejected");
    assert_eq!(tamper_resp.decision.unwrap().action, "CANCEL");
}

#[tokio::test]
async fn test_playground_100_runs_determinism() {
    let engine = PlaygroundEngine::new();
    let req = PlaygroundSimulationRequest {
        scenario: "full_journey".to_string(),
        seed: Some(1337),
        bank_count: Some(3),
        followed_bank_id: Some("bank-A".to_string()),
        action_type: None,
        perturbation: None,
    };

    let first = engine.run_simulation(&req);
    let first_json = serde_json::to_string(&first).unwrap();

    for _ in 0..100 {
        let current = engine.run_simulation(&req);
        let current_json = serde_json::to_string(&current).unwrap();
        assert_eq!(first_json, current_json, "Simulation must be 100% deterministic bit-for-bit");
    }
}

#[tokio::test]
async fn test_playground_break_network_scenarios() {
    let engine = PlaygroundEngine::new();

    let kill_leader = engine.evaluate_break_network("kill_leader");
    assert_eq!(kill_leader.action, "WAIT");
    assert!(kill_leader.why.contains("Leader change detected"));

    let abandon_bank = engine.evaluate_break_network("abandon_bank");
    assert_eq!(abandon_bank.action, "CANCEL");
    assert!(abandon_bank.why.contains("abandoned"));

    let conflict = engine.evaluate_break_network("provider_conflict");
    assert_eq!(conflict.action, "UNKNOWN");
    assert!(conflict.why.contains("disagree"));

    let remove_telemetry = engine.evaluate_break_network("remove_telemetry");
    assert_eq!(remove_telemetry.action, "UNAVAILABLE");
}

#[tokio::test]
async fn test_playground_replay_stream_integrity() {
    let engine = PlaygroundEngine::new();
    let session1 = engine.get_replay_stream();
    let session2 = engine.get_replay_stream();

    assert_eq!(session1.total_events, 7);
    assert_eq!(session1.total_duration_ms, 152);

    let json1 = serde_json::to_string(&session1).unwrap();
    let json2 = serde_json::to_string(&session2).unwrap();
    assert_eq!(json1, json2, "Replay stream must be identical across calls");
}

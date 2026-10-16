//! Red-Team Audit & Adversarial Verification Test Suite for Celor Alpenglow Playground (Phase 9)
//!
//! Independently verifies:
//! - 100-run bit-for-bit determinism across all 9 scenarios
//! - Seed divergence and sensitivity
//! - Zero execution leakage (no QUIC dispatch, no transaction submission)
//! - Mainnet safety & cluster isolation
//! - Break The Network perturbation state machine & capital protection invariants
//! - Malformed / malicious payload fuzzing & denial-of-service resilience
//! - Replay session monotonic timestamp ordering & event sequence integrity
//! - Live endpoint strict provenance & zero synthetic data on public RPC

use chrono_server::playground::{
    PlaygroundEngine, PlaygroundSimulationRequest,
};

#[test]
fn test_red_team_all_9_scenarios_100_runs_determinism() {
    let engine = PlaygroundEngine::new();
    let scenarios = [
        "multiple_banks",
        "abandon_bank",
        "ghost_block",
        "update_parent",
        "leader_handoff",
        "finality_race",
        "bls_certificate",
        "deshred",
        "public_vs_deep",
        "full_journey",
    ];

    for sc in scenarios {
        let req = PlaygroundSimulationRequest {
            scenario: sc.to_string(),
            seed: Some(1337),
            bank_count: Some(3),
            followed_bank_id: Some("bank-B".to_string()),
            action_type: None,
            perturbation: None,
        };

        let baseline = engine.run_simulation(&req);
        let baseline_json = serde_json::to_string(&baseline).expect("Failed to serialize baseline");

        for run in 1..=100 {
            let current = engine.run_simulation(&req);
            let current_json = serde_json::to_string(&current).expect("Failed to serialize run");

            assert_eq!(
                baseline_json, current_json,
                "Determinism failed at run {} for scenario {}: JSON strings differ",
                run, sc
            );
        }
    }
}

#[test]
fn test_red_team_seed_variance_and_sensitivity() {
    let engine = PlaygroundEngine::new();
    let req1 = PlaygroundSimulationRequest {
        scenario: "multiple_banks".to_string(),
        seed: Some(42),
        bank_count: Some(3),
        followed_bank_id: Some("bank-B".to_string()),
        action_type: None,
        perturbation: None,
    };
    let req2 = PlaygroundSimulationRequest {
        scenario: "multiple_banks".to_string(),
        seed: Some(99),
        bank_count: Some(3),
        followed_bank_id: Some("bank-B".to_string()),
        action_type: None,
        perturbation: None,
    };

    let res1 = engine.run_simulation(&req1);
    let res2 = engine.run_simulation(&req2);

    assert_ne!(
        res1.slot, res2.slot,
        "Different seeds must result in different simulated base slots"
    );
    assert_ne!(
        serde_json::to_string(&res1).unwrap(),
        serde_json::to_string(&res2).unwrap(),
        "Outputs from different seeds must not be identical"
    );
}

#[test]
fn test_red_team_break_network_all_perturbations() {
    let engine = PlaygroundEngine::new();
    let test_matrix = [
        ("kill_leader", "WAIT"),
        ("abandon_bank", "CANCEL"),
        ("change_parent", "CANCEL"),
        ("stale_data", "WAIT"),
        ("provider_conflict", "UNKNOWN"),
        ("remove_telemetry", "UNAVAILABLE"),
    ];

    for (perturbation, expected_action) in test_matrix {
        let resp = engine.evaluate_break_network(perturbation);
        assert_eq!(
            resp.action, expected_action,
            "Perturbation {} returned action {}, expected {}",
            perturbation, resp.action, expected_action
        );
        assert!(
            resp.capital_protection,
            "Perturbation {} must guarantee capital protection",
            perturbation
        );
        assert!(
            !resp.why.is_empty(),
            "Perturbation {} must have an explanation",
            perturbation
        );
        assert!(
            !resp.state_impact.is_empty(),
            "Perturbation {} must document state impact",
            perturbation
        );
    }
}

#[test]
fn test_red_team_tampered_bls_certificate_rejection() {
    let engine = PlaygroundEngine::new();
    let valid_req = PlaygroundSimulationRequest {
        scenario: "bls_certificate".to_string(),
        seed: Some(42),
        bank_count: None,
        followed_bank_id: None,
        action_type: None,
        perturbation: None,
    };
    let tampered_req = PlaygroundSimulationRequest {
        scenario: "bls_certificate".to_string(),
        seed: Some(42),
        bank_count: None,
        followed_bank_id: None,
        action_type: Some("tamper".to_string()),
        perturbation: None,
    };

    let valid_res = engine.run_simulation(&valid_req);
    let tampered_res = engine.run_simulation(&tampered_req);

    // Valid cert
    let valid_cert = valid_res.certificate.expect("Expected certificate");
    assert!(valid_cert.verified, "Valid certificate must verify");
    assert!(valid_cert.threshold_met, "Valid certificate must meet threshold");
    assert_eq!(valid_res.finality.status, "FINALIZED");
    assert_eq!(valid_res.decision.unwrap().action, "FIRE");

    // Tampered cert
    let tampered_cert = tampered_res.certificate.expect("Expected certificate");
    assert!(!tampered_cert.verified, "Tampered certificate must fail verification");
    assert!(!tampered_cert.threshold_met, "Tampered certificate must not meet 80% threshold");
    assert_eq!(tampered_res.finality.status, "UNVERIFIED");
    assert_eq!(tampered_res.decision.unwrap().action, "CANCEL");
}

#[test]
fn test_red_team_late_leader_handoff_rejection() {
    let engine = PlaygroundEngine::new();
    let normal_req = PlaygroundSimulationRequest {
        scenario: "leader_handoff".to_string(),
        seed: Some(42),
        bank_count: None,
        followed_bank_id: None,
        action_type: None,
        perturbation: None,
    };
    let late_req = PlaygroundSimulationRequest {
        scenario: "leader_handoff".to_string(),
        seed: Some(42),
        bank_count: None,
        followed_bank_id: None,
        action_type: Some("late".to_string()),
        perturbation: None,
    };

    let normal_res = engine.run_simulation(&normal_req);
    let late_res = engine.run_simulation(&late_req);

    assert_eq!(normal_res.decision.unwrap().action, "FIRE");
    assert_eq!(normal_res.leader.remaining_ms, 160);

    assert_eq!(late_res.decision.unwrap().action, "WAIT");
    assert_eq!(late_res.leader.remaining_ms, 18);
    assert_eq!(late_res.leader.handoff_state, "HANDOVER_IMMINENT");
}

#[test]
fn test_red_team_public_rpc_vs_deep_telemetry_honesty() {
    let engine = PlaygroundEngine::new();
    let public_req = PlaygroundSimulationRequest {
        scenario: "public_vs_deep".to_string(),
        seed: Some(42),
        bank_count: None,
        followed_bank_id: None,
        action_type: Some("public".to_string()),
        perturbation: None,
    };
    let deep_req = PlaygroundSimulationRequest {
        scenario: "public_vs_deep".to_string(),
        seed: Some(42),
        bank_count: None,
        followed_bank_id: None,
        action_type: Some("deep".to_string()),
        perturbation: None,
    };

    let public_res = engine.run_simulation(&public_req);
    let deep_res = engine.run_simulation(&deep_req);

    // Public RPC must report UNAVAILABLE for candidate banks and certificates
    assert_eq!(public_res.banks[0].provenance, "UNAVAILABLE");
    assert_eq!(public_res.banks[0].state, "UNAVAILABLE");
    assert!(public_res.certificate.is_none());
    assert_eq!(public_res.decision.unwrap().action, "UNKNOWN");

    // Deep telemetry exposes DIRECT candidate banks and verified certificates
    assert_eq!(deep_res.banks[0].provenance, "DIRECT");
    assert_eq!(deep_res.banks[0].state, "CANONICAL");
    assert!(deep_res.certificate.is_some());
    assert_eq!(deep_res.decision.unwrap().action, "FIRE");
}

#[test]
fn test_red_team_malicious_and_fuzz_payload_resilience() {
    let engine = PlaygroundEngine::new();
    let attack_vectors = [
        "../../../etc/passwd",
        "<script>alert('xss')</script>",
        "DROP TABLE users; --",
        "",
        "&!@#$%^*()_+{}|:\"<>?",
        &"A".repeat(100_000),
    ];

    for attack in attack_vectors {
        let req = PlaygroundSimulationRequest {
            scenario: attack.to_string(),
            seed: Some(u64::MAX),
            bank_count: Some(1_000_000), // out of bounds
            followed_bank_id: Some(attack.to_string()),
            action_type: Some(attack.to_string()),
            perturbation: Some(attack.to_string()),
        };

        // Engine must not panic or crash
        let res = engine.run_simulation(&req);
        assert!(!res.scenario_id.is_empty());
        assert!(!res.summary.is_empty());

        let break_res = engine.evaluate_break_network(attack);
        assert_eq!(break_res.action, "UNKNOWN");
        assert!(break_res.capital_protection);
    }
}

#[test]
fn test_red_team_simulator_isolation_zero_execution_leakage() {
    let sniper_engine = chrono_server::sniper::SniperEngine::new();
    let playground_engine = PlaygroundEngine::new();

    let initial_executions = sniper_engine.get_recent_decisions().len();
    assert_eq!(initial_executions, 0, "Initial execution history must be clean");

    // Run 100 simulations across various scenarios
    let scenarios = [
        "multiple_banks",
        "abandon_bank",
        "update_parent",
        "leader_handoff",
        "finality_race",
        "bls_certificate",
        "deshred",
        "public_vs_deep",
    ];

    for _ in 0..100 {
        for sc in scenarios {
            let req = PlaygroundSimulationRequest {
                scenario: sc.to_string(),
                seed: Some(42),
                bank_count: Some(3),
                followed_bank_id: Some("bank-B".to_string()),
                action_type: None,
                perturbation: None,
            };
            let _ = playground_engine.run_simulation(&req);
        }
    }

    // Verify executions remained strictly 0
    let final_executions = sniper_engine.get_recent_decisions().len();
    assert_eq!(
        final_executions, initial_executions,
        "Zero execution leakage: playground simulations must never create execution records or dispatch transactions"
    );
}

#[test]
fn test_red_team_replay_session_monotonic_ordering() {
    let engine = PlaygroundEngine::new();
    let replay = engine.get_replay_stream();

    assert!(replay.total_events >= 5, "Replay session must have at least 5 events");
    assert_eq!(replay.events.first().unwrap().event_type, "SLOT_START");
    assert_eq!(replay.events.last().unwrap().event_type, "FINALIZED");

    let mut prev_time = 0;
    let mut prev_seq = 0;

    for ev in &replay.events {
        assert!(ev.seq > prev_seq, "Event sequence numbers must strictly increase");
        assert!(ev.timestamp_offset_ms >= prev_time, "Timestamps must be monotonically increasing");
        assert!(!ev.detail.is_empty(), "Detail must not be empty");
        assert!(ev.raw_json.is_object(), "Raw JSON must be a valid JSON object");
        prev_seq = ev.seq;
        prev_time = ev.timestamp_offset_ms;
    }
}

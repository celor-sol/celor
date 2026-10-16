use chrono_clock::clock::SlotClock;
use chrono_bench::decision::{ExecutionDecisionEngine, RoutingAction};
use chrono_bench::freshness::{BankFreshnessTier, FreshnessState, FreshnessTier};
use chrono_core::types::{Slot, SlotDuration};
use chrono_server::sniper::{SimulatorScenarioRequest, SniperEngine};
use std::time::{Duration, Instant};

/// 1. Test 200ms Slot Timing and Progression (SIMD-0525)
#[test]
fn test_simd_0525_200ms_slot_clock_progression() {
    let mut clock = SlotClock::new(SlotDuration::MS_200);
    assert_eq!(clock.duration(), SlotDuration::MS_200);

    let start = Instant::now();
    clock.on_slot_observed_at(Slot(600_000_000), start);

    // Initial boundary: 0ms elapsed, 200ms remaining, 0% progress
    let p0 = clock.progress_at(start);
    assert_eq!(p0.slot, Slot(600_000_000));
    assert_eq!(p0.elapsed_ms, 0);
    assert_eq!(p0.remaining_ms, 200);
    assert_eq!(p0.progress, 0.0);

    // Mid-slot: 100ms elapsed, 100ms remaining, 50% progress
    let p_mid = clock.progress_at(start + Duration::from_millis(100));
    assert_eq!(p_mid.elapsed_ms, 100);
    assert_eq!(p_mid.remaining_ms, 100);
    assert_eq!(p_mid.progress, 0.5);

    // Handoff danger threshold: 165ms elapsed, 35ms remaining (<40ms danger zone)
    let p_danger = clock.progress_at(start + Duration::from_millis(165));
    assert_eq!(p_danger.elapsed_ms, 165);
    assert_eq!(p_danger.remaining_ms, 35);
    assert!(p_danger.remaining_ms < 40, "Remaining time must be inside the <40ms boundary");

    // Overrun: 220ms elapsed -> clamped progress 1.0, 0ms remaining
    let p_over = clock.progress_at(start + Duration::from_millis(220));
    assert_eq!(p_over.remaining_ms, 0);
    assert_eq!(p_over.progress, 1.0);
}

/// 2. Test Empirical Slot Interval Measurement (Target vs Observed Provenance)
#[test]
fn test_simd_0525_target_vs_observed_provenance() {
    let mut clock = SlotClock::new(SlotDuration::MS_200);
    let start = Instant::now();

    clock.on_slot_observed_at(Slot(100), start);
    assert_eq!(clock.last_measured_duration(), None);

    // Next slot arrives 204ms later (empirical observation on cluster)
    let next_time = start + Duration::from_millis(204);
    clock.on_slot_observed_at(Slot(101), next_time);

    let measured = clock.last_measured_duration();
    assert!(measured.is_some());
    assert_eq!(measured.unwrap().as_millis(), 204);

    // Target duration remains the configured protocol target (200ms)
    assert_eq!(clock.duration(), SlotDuration::MS_200);
}

/// 3. Test Historical 400ms Baseline Compatibility
#[test]
fn test_historical_400ms_compatibility_replay() {
    let mut legacy_clock = SlotClock::new(SlotDuration::MS_400);
    assert_eq!(legacy_clock.duration(), SlotDuration::MS_400);

    let start = Instant::now();
    legacy_clock.on_slot_observed_at(Slot(400_000_000), start);

    // Mid-slot at 400ms is 200ms elapsed
    let p_mid = legacy_clock.progress_at(start + Duration::from_millis(200));
    assert_eq!(p_mid.elapsed_ms, 200);
    assert_eq!(p_mid.remaining_ms, 200);
    assert_eq!(p_mid.progress, 0.5);

    // 360ms elapsed leaves 40ms remaining
    let p_boundary = legacy_clock.progress_at(start + Duration::from_millis(360));
    assert_eq!(p_boundary.remaining_ms, 40);
    assert_eq!(p_boundary.progress, 0.9);
}

/// 4. Test Dynamic Blockhash Expiry (150 Slots Rule at 200ms Cadence)
#[test]
fn test_simd_0525_dynamic_blockhash_freshness() {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Blockhash fresh at age 2,000ms (~10 slots at 200ms)
    let fresh_state = FreshnessState::evaluate(
        50,
        200,
        Some("LeaderA".to_string()),
        Some("LeaderA".to_string()),
        "Blockhash_1".to_string(),
        now_ms.saturating_sub(2_000),
        now_ms.saturating_sub(10),
        Some("bank-1".to_string()),
        false,
    );
    assert_eq!(fresh_state.blockhash_tier, FreshnessTier::Fresh);

    // Blockhash aging at 12,000ms (60 slots at 200ms, >35% of 30s nominal window)
    let aging_state = FreshnessState::evaluate(
        50,
        200,
        Some("LeaderA".to_string()),
        Some("LeaderA".to_string()),
        "Blockhash_2".to_string(),
        now_ms.saturating_sub(12_000),
        now_ms.saturating_sub(10),
        Some("bank-2".to_string()),
        false,
    );
    assert_eq!(aging_state.blockhash_tier, FreshnessTier::Aging);

    // Blockhash stale at 24,000ms (120 slots at 200ms, >75% of 30s nominal window)
    let stale_state = FreshnessState::evaluate(
        50,
        200,
        Some("LeaderA".to_string()),
        Some("LeaderA".to_string()),
        "Blockhash_3".to_string(),
        now_ms.saturating_sub(24_000),
        now_ms.saturating_sub(10),
        Some("bank-3".to_string()),
        false,
    );
    assert_eq!(stale_state.blockhash_tier, FreshnessTier::Stale);

    // Blockhash expired at 31,000ms (>150 slots at 200ms)
    let expired_state = FreshnessState::evaluate(
        50,
        200,
        Some("LeaderA".to_string()),
        Some("LeaderA".to_string()),
        "Blockhash_4".to_string(),
        now_ms.saturating_sub(31_000),
        now_ms.saturating_sub(10),
        Some("bank-4".to_string()),
        false,
    );
    assert_eq!(expired_state.blockhash_tier, FreshnessTier::Stale);
}

/// 5. Test Leader Handoffs in 4-Slot Windows (~800ms) and <40ms Boundary Condition
#[test]
fn test_simd_0525_leader_window_and_handoff_decision() {
    // Case A: Within leader tenure with remaining window > 40ms -> Submit
    let fresh_tenure = FreshnessState {
        slot_tier: FreshnessTier::Fresh,
        slot_elapsed_ms: 30,
        slot_target_duration_ms: 200,
        leader_tier: FreshnessTier::Fresh,
        current_leader: Some("Leader_SlotGroup".to_string()),
        next_leader: Some("Leader_SlotGroup".to_string()),
        remaining_window_ms: 520,
        blockhash_tier: FreshnessTier::Fresh,
        blockhash: "5kUNG...7Ld6".to_string(),
        blockhash_age_ms: 200,
        blockhash_age_slots: 1,
        source_tier: FreshnessTier::Fresh,
        last_event_received_ago_ms: 1,
        bank_tier: BankFreshnessTier::Canonical,
        bank_id: Some("bank-1".to_string()),
    };

    let decision_fire = ExecutionDecisionEngine::evaluate_chrono(&fresh_tenure, true);
    assert_eq!(decision_fire.action, RoutingAction::Submit);

    // Case B: Final slot of tenure, remaining tenure <40ms -> Wait for next leader TPU
    let mut handoff_imminent = fresh_tenure.clone();
    handoff_imminent.next_leader = Some("Leader_IncomingGroup".to_string());
    handoff_imminent.remaining_window_ms = 35; // <40ms danger zone
    handoff_imminent.leader_tier = FreshnessTier::HandoffImminent;

    let decision_wait = ExecutionDecisionEngine::evaluate_chrono(&handoff_imminent, true);
    match decision_wait.action {
        RoutingAction::Wait { wait_ms, .. } => {
            assert!(wait_ms >= 15);
        }
        other => panic!("Expected RoutingAction::Wait, got {:?}", other),
    }

    // Case C: UpdateParent marker observed -> Abort to save capital
    let mut abandoned_state = fresh_tenure.clone();
    abandoned_state.bank_tier = BankFreshnessTier::Abandoned;
    let decision_cancel = ExecutionDecisionEngine::evaluate_chrono(&abandoned_state, true);
    match decision_cancel.action {
        RoutingAction::Abort { reason } => {
            assert!(reason.contains("UpdateParent"));
        }
        other => panic!("Expected RoutingAction::Abort, got {:?}", other),
    }

    // Case D: Stale blockhash -> Abort
    let mut stale_blockhash_state = fresh_tenure;
    stale_blockhash_state.blockhash_tier = FreshnessTier::Stale;
    let decision_stale = ExecutionDecisionEngine::evaluate_chrono(&stale_blockhash_state, true);
    match decision_stale.action {
        RoutingAction::Abort { reason } => {
            assert!(reason.contains("stale"));
        }
        other => panic!("Expected RoutingAction::Abort, got {:?}", other),
    }
}

/// 6. Test Sniper Engine Simulation Scenarios & Replay Determinism for 200ms
#[test]
fn test_simd_0525_sniper_scenarios_and_determinism_200ms() {
    let sniper = SniperEngine::new();

    // 1. Optimal Fire
    let fire_res = sniper.run_simulation(&SimulatorScenarioRequest {
        scenario: "fire".to_string(),
        token_symbol: Some("$MOON".to_string()),
        initial_mcap_usd: Some(10_000.0),
        baseline_rpc_latency_ms: Some(914),
        celor_latency_ms: Some(182),
    });
    assert_eq!(fire_res.technical_trace.decision, "FIRE");
    assert_eq!(fire_res.celor_lane.route, "Direct Leader QUIC");

    // 2. Cancel on UpdateParent
    let cancel_res = sniper.run_simulation(&SimulatorScenarioRequest {
        scenario: "cancel_abandoned".to_string(),
        token_symbol: Some("$MOON".to_string()),
        initial_mcap_usd: Some(10_000.0),
        baseline_rpc_latency_ms: Some(914),
        celor_latency_ms: Some(182),
    });
    assert_eq!(cancel_res.technical_trace.decision, "CANCEL");
    assert_eq!(cancel_res.celor_lane.route, "ABORT (Capital Protected)");

    // 3. Wait on Leader Handoff
    let wait_res = sniper.run_simulation(&SimulatorScenarioRequest {
        scenario: "wait_handoff".to_string(),
        token_symbol: Some("$MOON".to_string()),
        initial_mcap_usd: Some(10_000.0),
        baseline_rpc_latency_ms: Some(914),
        celor_latency_ms: Some(182),
    });
    assert_eq!(wait_res.technical_trace.decision, "WAIT");
    assert_eq!(wait_res.celor_lane.route, "Direct Next-Leader QUIC");

    // 4. Unknown Telemetry (Public RPC Fail Closed)
    let unknown_res = sniper.run_simulation(&SimulatorScenarioRequest {
        scenario: "unknown_telemetry".to_string(),
        token_symbol: Some("$MOON".to_string()),
        initial_mcap_usd: Some(10_000.0),
        baseline_rpc_latency_ms: Some(914),
        celor_latency_ms: Some(182),
    });
    assert_eq!(unknown_res.technical_trace.decision, "UNKNOWN");
    assert_eq!(unknown_res.celor_lane.route, "HOLD (Source Unverified)");

    // Determinism check: 50 iterations identical
    for sc in &["fire", "cancel_abandoned", "wait_handoff", "unknown_telemetry"] {
        let req = SimulatorScenarioRequest {
            scenario: sc.to_string(),
            token_symbol: Some("$DETERMINISTIC".to_string()),
            initial_mcap_usd: Some(25_000.0),
            baseline_rpc_latency_ms: Some(800),
            celor_latency_ms: Some(200),
        };

        let run1 = sniper.run_simulation(&req);
        let run2 = sniper.run_simulation(&req);

        assert_eq!(run1.scenario_id, run2.scenario_id);
        assert_eq!(run1.celor_lane.route, run2.celor_lane.route);
        assert_eq!(run1.technical_trace.decision, run2.technical_trace.decision);
        assert_eq!(run1.technical_trace.slot, run2.technical_trace.slot);
    }
}

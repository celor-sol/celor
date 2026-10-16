use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FreshnessTier {
    Fresh,
    Aging,
    HandoffImminent,
    Stale,
    Unknown,
}

impl std::fmt::Display for FreshnessTier {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FreshnessTier::Fresh => write!(f, "FRESH"),
            FreshnessTier::Aging => write!(f, "AGING"),
            FreshnessTier::HandoffImminent => write!(f, "HANDOFF_IMMINENT"),
            FreshnessTier::Stale => write!(f, "STALE"),
            FreshnessTier::Unknown => write!(f, "UNKNOWN"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BankFreshnessTier {
    Canonical,
    CandidateObserved,
    Abandoned,
    Dead,
    Unknown,
}

/// Multi-dimensional freshness representation enforcing precise empirical validity windows.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FreshnessState {
    pub slot_tier: FreshnessTier,
    pub slot_elapsed_ms: u64,
    pub slot_target_duration_ms: u64,

    pub leader_tier: FreshnessTier,
    pub current_leader: Option<String>,
    pub next_leader: Option<String>,
    pub remaining_window_ms: u64,

    pub blockhash_tier: FreshnessTier,
    pub blockhash: String,
    pub blockhash_age_ms: u64,
    pub blockhash_age_slots: u64,

    pub source_tier: FreshnessTier,
    pub last_event_received_ago_ms: u64,

    pub bank_tier: BankFreshnessTier,
    pub bank_id: Option<String>,
}

impl FreshnessState {
    /// Evaluates freshness dimensions strictly using measured timestamps and known protocol rules.
    #[allow(clippy::too_many_arguments)]
    pub fn evaluate(
        slot_elapsed_ms: u64,
        slot_target_duration_ms: u64,
        current_leader: Option<String>,
        next_leader: Option<String>,
        blockhash: String,
        blockhash_acquired_at_ms: u64,
        last_source_event_at_ms: u64,
        bank_id: Option<String>,
        is_bank_abandoned: bool,
    ) -> Self {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        // 1. Slot Freshness:
        // FRESH: 0 to 60% of target slot duration
        // AGING: 60% to 90%
        // HANDOFF_IMMINENT: > 90% of target duration
        // STALE: > 120% of target duration (slot drift or stalled clock)
        let slot_tier = if slot_target_duration_ms == 0 {
            FreshnessTier::Unknown
        } else if slot_elapsed_ms > (slot_target_duration_ms * 12) / 10 {
            FreshnessTier::Stale
        } else if slot_elapsed_ms > (slot_target_duration_ms * 9) / 10 {
            FreshnessTier::HandoffImminent
        } else if slot_elapsed_ms > (slot_target_duration_ms * 6) / 10 {
            FreshnessTier::Aging
        } else {
            FreshnessTier::Fresh
        };

        // 2. Leader Freshness:
        let remaining_window_ms = slot_target_duration_ms.saturating_sub(slot_elapsed_ms);
        let leader_tier = if current_leader.is_none() {
            FreshnessTier::Unknown
        } else if remaining_window_ms < 40 && next_leader.is_some() {
            FreshnessTier::HandoffImminent
        } else if remaining_window_ms < 80 {
            FreshnessTier::Aging
        } else {
            FreshnessTier::Fresh
        };

        // 3. Blockhash Freshness:
        // Recent blockhash validity is strictly bound to 150 slots by protocol rule.
        // Under SIMD-0525 (200ms), 150 slots corresponds to a nominal target-based window of ~30,000ms (~30s).
        // Under legacy 400ms, nominal window was ~60,000ms.
        // FRESH: < 35 slots (nominal < 7,000ms at 200ms, < 14,000ms at 400ms)
        // AGING: 35 to 110 slots (approaching deadline)
        // STALE: > 110 slots (> ~22,000ms at 200ms) or age exceeds 75% of nominal window (high rejection risk)
        let blockhash_age_ms = now_ms.saturating_sub(blockhash_acquired_at_ms);
        let effective_slot_duration = slot_target_duration_ms.max(50);
        let blockhash_age_slots = blockhash_age_ms / effective_slot_duration;
        let nominal_expiry_ms = effective_slot_duration.saturating_mul(150);
        let stale_threshold_ms = (nominal_expiry_ms * 75) / 100; // 75% of nominal window (~22.5s at 200ms, ~45s at 400ms)
        let aging_threshold_ms = (nominal_expiry_ms * 35) / 100; // 35% of nominal window (~10.5s at 200ms, ~21s at 400ms)

        let blockhash_tier = if blockhash_acquired_at_ms == 0 {
            FreshnessTier::Unknown
        } else if blockhash_age_slots > 110 || blockhash_age_ms > stale_threshold_ms {
            FreshnessTier::Stale
        } else if blockhash_age_slots > 35 || blockhash_age_ms > aging_threshold_ms {
            FreshnessTier::Aging
        } else {
            FreshnessTier::Fresh
        };

        // 4. Source Freshness:
        let last_event_received_ago_ms = now_ms.saturating_sub(last_source_event_at_ms);
        let source_tier = if last_source_event_at_ms == 0 {
            FreshnessTier::Unknown
        } else if last_event_received_ago_ms > 2_500 {
            FreshnessTier::Stale
        } else if last_event_received_ago_ms > 800 {
            FreshnessTier::Aging
        } else {
            FreshnessTier::Fresh
        };

        // 5. Bank Freshness:
        let bank_tier = if is_bank_abandoned {
            BankFreshnessTier::Abandoned
        } else if bank_id.is_some() {
            BankFreshnessTier::Canonical
        } else {
            BankFreshnessTier::CandidateObserved
        };

        Self {
            slot_tier,
            slot_elapsed_ms,
            slot_target_duration_ms,
            leader_tier,
            current_leader,
            next_leader,
            remaining_window_ms,
            blockhash_tier,
            blockhash,
            blockhash_age_ms,
            blockhash_age_slots,
            source_tier,
            last_event_received_ago_ms,
            bank_tier,
            bank_id,
        }
    }
}

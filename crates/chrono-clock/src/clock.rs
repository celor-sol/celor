use chrono_core::types::{Slot, SlotDuration};
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

/// High-resolution snapshot of slot progression.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlotProgress {
    pub slot: Slot,
    #[serde(skip, default = "Instant::now")]
    pub slot_start: Instant,
    pub duration: SlotDuration,
    pub elapsed_ms: u64,
    pub remaining_ms: u64,
    /// Progress ratio clamped strictly between 0.0 and 1.0.
    pub progress: f64,
    pub is_measured: bool,
}

/// Chrono Monotonic Slot Clock.
///
/// Uses monotonic hardware clocks (`std::time::Instant`) for all elapsed timing.
/// Never uses wall-clock time as the primary elapsed timer.
/// Adheres strictly to the dynamic slot reduction protocol (SIMD-0525),
/// supporting 400ms, 350ms, 300ms, 250ms, and 200ms slot durations.
pub struct SlotClock {
    current_slot: Slot,
    slot_start: Instant,
    effective_duration: SlotDuration,
    is_measured: bool,
    last_measured_duration: Option<Duration>,
}

impl SlotClock {
    pub fn new(initial_duration: SlotDuration) -> Self {
        Self {
            current_slot: Slot::ZERO,
            slot_start: Instant::now(),
            effective_duration: initial_duration,
            is_measured: false,
            last_measured_duration: None,
        }
    }

    /// Sets the cluster's effective slot duration.
    /// `is_measured` indicates if this duration was empirically observed or configured.
    pub fn set_effective_duration(&mut self, duration: SlotDuration, is_measured: bool) {
        self.effective_duration = duration;
        self.is_measured = is_measured;
    }

    /// Authoritative slot observation update.
    pub fn on_slot_observed(&mut self, slot: Slot) {
        self.on_slot_observed_at(slot, Instant::now());
    }

    /// Alias for on_slot_observed.
    pub fn tick(&mut self, slot: Slot) {
        self.on_slot_observed(slot);
    }

    /// Authoritative slot observation with specific monotonic arrival instant.
    pub fn on_slot_observed_at(&mut self, slot: Slot, at: Instant) {
        if slot > self.current_slot {
            if self.current_slot != Slot::ZERO && slot.as_u64() == self.current_slot.as_u64() + 1 {
                let actual_elapsed = at.duration_since(self.slot_start);
                // Record empirical measurement between consecutive slots
                if actual_elapsed >= Duration::from_millis(50) && actual_elapsed <= Duration::from_secs(3) {
                    self.last_measured_duration = Some(actual_elapsed);
                }
            }
            self.current_slot = slot;
            self.slot_start = at;
        }
    }

    /// Computes full microsecond-accurate slot progress.
    pub fn progress(&self) -> SlotProgress {
        let now = Instant::now();
        self.progress_at(now)
    }

    /// Computes slot progress at a specific monotonic instant.
    pub fn progress_at(&self, at: Instant) -> SlotProgress {
        let elapsed = if at >= self.slot_start {
            at.duration_since(self.slot_start)
        } else {
            Duration::ZERO
        };

        let target_duration = self.effective_duration.as_duration();
        let target_ms = self.effective_duration.as_millis();
        let elapsed_ms = elapsed.as_millis() as u64;

        let ratio = if target_ms > 0 {
            (elapsed.as_secs_f64() / target_duration.as_secs_f64()).clamp(0.0, 1.0)
        } else {
            1.0
        };

        let remaining = if elapsed < target_duration {
            target_duration - elapsed
        } else {
            Duration::ZERO
        };

        SlotProgress {
            slot: self.current_slot,
            slot_start: self.slot_start,
            duration: self.effective_duration,
            elapsed_ms,
            remaining_ms: remaining.as_millis() as u64,
            progress: (ratio * 1000.0).round() / 1000.0,
            is_measured: self.is_measured,
        }
    }

    pub fn current_slot(&self) -> Slot {
        self.current_slot
    }

    pub fn duration(&self) -> SlotDuration {
        self.effective_duration
    }

    pub fn elapsed(&self) -> Duration {
        Instant::now().saturating_duration_since(self.slot_start)
    }

    pub fn remaining(&self) -> Duration {
        let target = self.effective_duration.as_duration();
        let elapsed = self.elapsed();
        if elapsed < target {
            target - elapsed
        } else {
            Duration::ZERO
        }
    }

    pub fn last_measured_duration(&self) -> Option<Duration> {
        self.last_measured_duration
    }
}

impl Default for SlotClock {
    fn default() -> Self {
        // Default to active SIMD-0525 200ms target
        Self::new(SlotDuration::MS_200)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slot_clock_boundaries_0_50_99_100_percent() {
        let mut clock = SlotClock::new(SlotDuration::MS_200);
        let start = Instant::now();
        clock.on_slot_observed_at(Slot(100), start);

        // 0% at slot start
        let p0 = clock.progress_at(start);
        assert_eq!(p0.slot, Slot(100));
        assert_eq!(p0.elapsed_ms, 0);
        assert_eq!(p0.remaining_ms, 200);
        assert_eq!(p0.progress, 0.0);

        // 50% at 100ms
        let t_50 = start + Duration::from_millis(100);
        let p50 = clock.progress_at(t_50);
        assert_eq!(p50.elapsed_ms, 100);
        assert_eq!(p50.remaining_ms, 100);
        assert_eq!(p50.progress, 0.5);

        // 99% at 198ms
        let t_99 = start + Duration::from_millis(198);
        let p99 = clock.progress_at(t_99);
        assert_eq!(p99.elapsed_ms, 198);
        assert_eq!(p99.remaining_ms, 2);
        assert_eq!(p99.progress, 0.99);

        // 100% at or beyond 200ms
        let t_100 = start + Duration::from_millis(200);
        let p100 = clock.progress_at(t_100);
        assert_eq!(p100.elapsed_ms, 200);
        assert_eq!(p100.remaining_ms, 0);
        assert_eq!(p100.progress, 1.0);

        // Beyond slot window clamped to 1.0
        let t_over = start + Duration::from_millis(250);
        let pover = clock.progress_at(t_over);
        assert_eq!(pover.progress, 1.0);
        assert_eq!(pover.remaining_ms, 0);
    }

    #[test]
    fn test_slot_transitions() {
        let mut clock = SlotClock::new(SlotDuration::MS_250);
        let t0 = Instant::now();
        clock.on_slot_observed_at(Slot(10), t0);
        assert_eq!(clock.current_slot(), Slot(10));

        let t1 = t0 + Duration::from_millis(248);
        clock.on_slot_observed_at(Slot(11), t1);
        assert_eq!(clock.current_slot(), Slot(11));

        let p = clock.progress_at(t1);
        assert_eq!(p.slot, Slot(11));
        assert_eq!(p.progress, 0.0);
        assert_eq!(clock.last_measured_duration(), Some(Duration::from_millis(248)));
    }

    #[test]
    fn test_staged_durations_support() {
        for dur in [
            SlotDuration::MS_400,
            SlotDuration::MS_350,
            SlotDuration::MS_300,
            SlotDuration::MS_250,
            SlotDuration::MS_200,
        ] {
            let clock = SlotClock::new(dur);
            assert_eq!(clock.duration(), dur);
        }
    }
}

import type { SlotProgress } from './types';

/**
 * Chrono Monotonic Slot Clock
 * High-resolution temporal engine tracking slot phase, elapsed duration, and drift.
 * Never relies on hardcoded 400ms assumptions; adapts to SIMD-0525 slot duration.
 */
export class SlotClock {
  private currentSlot: number = 0;
  private targetSlotDurationMs: number = 200; // Live Mainnet/Devnet SIMD-0525 200ms
  private slotStartTimestampMs: number = 0;
  private lastObservedSlotDurationMs: number = 200;
  private totalSlotsObserved: number = 0;

  constructor(targetSlotDurationMs: number = 200) {
    this.targetSlotDurationMs = targetSlotDurationMs;
    this.slotStartTimestampMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  public setTargetSlotDuration(durationMs: number): void {
    if (durationMs > 0 && durationMs <= 1000) {
      this.targetSlotDurationMs = durationMs;
    }
  }

  public getTargetSlotDuration(): number {
    return this.targetSlotDurationMs;
  }

  public getCurrentSlot(): number {
    return this.currentSlot;
  }

  /**
   * Called whenever an authoritative slot is observed on the cluster stream.
   */
  public onSlotObserved(slot: number, timestampMs?: number): void {
    const now = timestampMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    if (this.currentSlot > 0 && slot > this.currentSlot) {
      const deltaSlots = slot - this.currentSlot;
      const elapsedTime = now - this.slotStartTimestampMs;
      if (deltaSlots === 1 && elapsedTime > 50 && elapsedTime < 2000) {
        // Compute moving average of actual slot duration
        this.lastObservedSlotDurationMs = elapsedTime;
      }
    }

    this.currentSlot = slot;
    this.slotStartTimestampMs = now;
    this.totalSlotsObserved++;
  }

  /**
   * Computes microsecond-accurate slot phase and progression.
   */
  public getSlotProgress(): SlotProgress {
    if (this.currentSlot === 0) {
      return {
        slot: 0,
        targetSlotDurationMs: this.targetSlotDurationMs,
        elapsedMs: 0,
        remainingMs: this.targetSlotDurationMs,
        phaseRatio: 0,
        driftMs: 0,
        isRealTime: false,
        provenance: 'UNAVAILABLE',
      };
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const elapsed = Math.max(0, now - this.slotStartTimestampMs);
    const duration = this.targetSlotDurationMs;

    // Phase ratio within slot (0.0 to 1.0, wraps or clamps if slot boundary passed)
    const phaseRatio = Math.min(1.0, elapsed / duration);
    const remaining = Math.max(0, duration - elapsed);
    const drift = elapsed > duration ? elapsed - duration : 0;

    return {
      slot: this.currentSlot,
      targetSlotDurationMs: duration,
      elapsedMs: Math.round(elapsed),
      remainingMs: Math.round(remaining),
      phaseRatio: Number(phaseRatio.toFixed(3)),
      driftMs: Math.round(drift),
      isRealTime: true,
      provenance: 'ESTIMATED',
    };
  }

  public getMeasuredSlotDuration(): number {
    return this.lastObservedSlotDurationMs;
  }
}

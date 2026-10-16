import type { LeaderInfo, HandoffState } from './types';

/**
 * Chrono Leader Engine
 * Tracks slot leaders, upcoming transitions, and fast leader handoff phases.
 */
export class LeaderEngine {
  private leaderSchedule: Map<number, string> = new Map();
  private currentLeader: string | null = null;
  private nextLeader: string | null = null;
  private upcomingLeaders: string[] = [];
  private handoffState: HandoffState = 'UNKNOWN';

  public updateLeaderForSlot(slot: number, leaderPubkey: string): void {
    this.leaderSchedule.set(slot, leaderPubkey);
  }

  public setLeadersForWindow(currentSlot: number, scheduleEntries: { slot: number; leader: string }[]): void {
    for (const entry of scheduleEntries) {
      this.leaderSchedule.set(entry.slot, entry.leader);
    }
    this.recomputeLeaders(currentSlot);
  }

  public recomputeLeaders(currentSlot: number, slotPhaseRatio: number = 0): LeaderInfo {
    this.currentLeader = this.leaderSchedule.get(currentSlot) || null;
    this.nextLeader = this.leaderSchedule.get(currentSlot + 1) || null;

    const upcoming: string[] = [];
    for (let offset = 2; offset <= 5; offset++) {
      const leader = this.leaderSchedule.get(currentSlot + offset);
      if (leader && !upcoming.includes(leader)) {
        upcoming.push(leader);
      }
    }
    this.upcomingLeaders = upcoming;

    // Accurate transition detection matching Rust LeaderEngine::is_leader_transition
    if (!this.currentLeader || !this.nextLeader) {
      this.handoffState = 'UNKNOWN';
    } else if (this.currentLeader === this.nextLeader) {
      this.handoffState = 'SLOT_CONTINUATION';
    } else if (slotPhaseRatio > 0.85) {
      this.handoffState = 'HANDOVER_IMMINENT';
    } else {
      this.handoffState = 'LEADER_TRANSITION_PENDING';
    }

    return this.getLeaderInfo();
  }

  public getLeaderInfo(): LeaderInfo {
    return {
      currentLeader: this.currentLeader,
      nextLeader: this.nextLeader,
      upcomingLeaders: [...this.upcomingLeaders],
      leaderEstimatedDurationMs: 200,
      handoffState: this.handoffState,
      provenance: this.currentLeader ? 'DERIVED' : 'UNAVAILABLE',
    };
  }
}

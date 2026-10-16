'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChronoClient } from '@/lib/chrono-client/client';
import type {
  SlotProgress,
  LeaderInfo,
  CandidateBank,
  ParentSwitchEvent,
  FinalityInfo,
  NetworkStatus,
  ChronoStreamEvent,
  TransactionAutopsyResult,
} from '@/lib/chrono-client/types';

export function useChrono() {
  const [client] = useState(() => ChronoClient.getInstance());

  const [slotProgress, setSlotProgress] = useState<SlotProgress>({
    slot: 507745280,
    targetDurationMs: 200,
    targetSlotDurationMs: 200,
    elapsedMs: 40,
    remainingMs: 160,
    phaseRatio: 0.2,
    isMeasured: false,
    isRealTime: true,
    provenance: 'DIRECT',
  });

  const [leaderInfo, setLeaderInfo] = useState<LeaderInfo>({
    currentLeader: 'dv4ACNkpYPcE3aKmYDqZm9G5EB3J4MRoeE7WNDRBVJB',
    nextLeader: 'dv1ZAGvdsz5hHLwWXsVnM94hWf1pjbKVau1QVkaMJ92',
    handoffState: 'LEADER_TRANSITION_PENDING',
    lookahead: [],
    provenance: 'DIRECT',
  });

  const [candidateBanks, setCandidateBanks] = useState<CandidateBank[]>([]);
  const [parentSwitch, setParentSwitch] = useState<ParentSwitchEvent | null>(null);
  const [finalityInfo, setFinalityInfo] = useState<FinalityInfo | null>(null);
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    cluster: 'devnet',
    source: 'solana-public-stream',
    environment: 'live',
    connected: true,
    chronoStatus: 'LIVE',
    rpcEndpoint: 'https://api.devnet.solana.com',
    targetSlotDurationMs: 200,
    currentSlot: 507745280,
    liveTps: 2840,
    activeValidators: 1450,
    lastUpdateMs: Date.now(),
    coverageScore: 85,
    telemetry: {
      coverageScore: 85,
      provenance: {
        slot: 'DIRECT',
        leader: 'DIRECT',
        finality: 'DIRECT',
      },
      deshredSupported: false,
    },
    dimensions: {},
    limitations: [],
  });
  const [streamEvents, setStreamEvents] = useState<ChronoStreamEvent[]>([]);

  useEffect(() => {
    client.start();

    const unsubSlot = client.onSlot((progress) => {
      setSlotProgress(progress);
    });

    const unsubLeader = client.onLeader((leaders) => {
      setLeaderInfo(leaders);
    });

    const unsubBank = client.onBank((banks) => {
      setCandidateBanks(banks);
    });

    const unsubParentSwitch = client.onParentSwitch((event) => {
      setParentSwitch(event);
    });

    const unsubFinality = client.onFinality((finality) => {
      setFinalityInfo(finality);
    });

    const unsubNetwork = client.onNetwork((network) => {
      setNetworkStatus(network);
    });

    const unsubStream = client.onStreamEvent((streamEvent) => {
      setStreamEvents((prev) => [streamEvent, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubSlot();
      unsubLeader();
      unsubBank();
      unsubParentSwitch();
      unsubFinality();
      unsubNetwork();
      unsubStream();
    };
  }, [client]);

  const switchCluster = useCallback(
    async (cluster: string) => {
      await client.switchCluster(cluster);
    },
    [client]
  );

  const analyzeTransaction = useCallback(
    async (signature: string): Promise<TransactionAutopsyResult> => {
      return client.analyzeTransaction(signature);
    },
    [client]
  );

  const getExecutionState = useCallback(async () => {
    return client.getExecutionState();
  }, [client]);

  const getMeasuredBenchmarks = useCallback(async () => {
    return client.getMeasuredBenchmarks();
  }, [client]);

  return {
    slotProgress,
    leaderInfo,
    candidateBanks,
    parentSwitch,
    finalityInfo,
    networkStatus,
    streamEvents,
    switchCluster,
    analyzeTransaction,
    getExecutionState,
    getMeasuredBenchmarks,
  };
}


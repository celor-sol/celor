'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Zap, 
  RotateCcw, 
  Play, 
  Pause, 
  ShieldCheck, 
  Clock, 
  Layers, 
  Sparkles, 
  ArrowRight,
  Flame,
  CheckCircle2
} from 'lucide-react';

interface BamTick {
  index: number;
  timeRange: string;
  name: string;
  type: string;
  cuAllocated: number;
  bundlesProcessed: number;
  status: 'pending' | 'active' | 'completed';
}

export function BamMicroAuctionVisualizer() {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTickIndex, setCurrentTickIndex] = useState<number>(0);
  const [elapsedSlotMs, setElapsedSlotMs] = useState<number>(0);
  const [priorityFeeTier, setPriorityFeeTier] = useState<'low' | 'medium' | 'high' | 'ultra'>('high');
  const [userTxTick, setUserTxTick] = useState<number | null>(1);
  const [txHistory, setTxHistory] = useState<{ id: string; fee: string; tick: number; time: string }[]>([]);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const TICKS: BamTick[] = [
    { index: 0, timeRange: '0 - 25ms', name: 'Tick 0: Leader Ingestion', type: 'Ingestion', cuAllocated: 5200000, bundlesProcessed: 18, status: 'pending' },
    { index: 1, timeRange: '25 - 50ms', name: 'Tick 1: Ultra Priority Batch', type: 'Auction', cuAllocated: 6100000, bundlesProcessed: 24, status: 'pending' },
    { index: 2, timeRange: '50 - 75ms', name: 'Tick 2: High-Fee DEX Swaps', type: 'Auction', cuAllocated: 6400000, bundlesProcessed: 32, status: 'pending' },
    { index: 3, timeRange: '75 - 100ms', name: 'Tick 3: Liquidity Rebalancing', type: 'Auction', cuAllocated: 5900000, bundlesProcessed: 28, status: 'pending' },
    { index: 4, timeRange: '100 - 125ms', name: 'Tick 4: Fast Path Notarization', type: 'Consensus', cuAllocated: 5500000, bundlesProcessed: 22, status: 'pending' },
    { index: 5, timeRange: '125 - 150ms', name: 'Tick 5: BLS Cert Aggregation', type: 'Finality', cuAllocated: 6200000, bundlesProcessed: 30, status: 'pending' },
    { index: 6, timeRange: '150 - 175ms', name: 'Tick 6: Final Bundle Sealing', type: 'Sealing', cuAllocated: 6800000, bundlesProcessed: 35, status: 'pending' },
    { index: 7, timeRange: '175 - 200ms', name: 'Tick 7: Fast Leader Handover', type: 'Handoff', cuAllocated: 5900000, bundlesProcessed: 19, status: 'pending' },
  ];

  // 200ms continuous sweep animation (slowed down slightly to 800ms for human visual comprehension)
  const VISUAL_SLOT_DURATION = 1200; // ms

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    const animate = (now: number) => {
      const delta = (now - lastTimeRef.current) % VISUAL_SLOT_DURATION;
      const progress = delta / VISUAL_SLOT_DURATION;
      const slotMs = Math.round(progress * 200);
      setElapsedSlotMs(slotMs);

      const tickIdx = Math.min(7, Math.floor(progress * 8));
      setCurrentTickIndex(tickIdx);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const handleSimulateTx = () => {
    // Map priority fee tier to assigned tick
    let assignedTick = 1;
    let feeLabel = '50,000 µL';

    if (priorityFeeTier === 'ultra') {
      assignedTick = 1; // 25-50ms
      feeLabel = '250,000 µL (Ultra)';
    } else if (priorityFeeTier === 'high') {
      assignedTick = 2; // 50-75ms
      feeLabel = '50,000 µL (High)';
    } else if (priorityFeeTier === 'medium') {
      assignedTick = 3; // 75-100ms
      feeLabel = '10,000 µL (Med)';
    } else {
      assignedTick = 6; // 150-175ms
      feeLabel = '1,000 µL (Low)';
    }

    setUserTxTick(assignedTick);
    setTxHistory((prev) => [
      {
        id: `tx-${Math.random().toString(36).substring(2, 7)}`,
        fee: feeLabel,
        tick: assignedTick,
        time: `${(assignedTick * 25)}ms mark`,
      },
      ...prev.slice(0, 4),
    ]);
  };

  return (
    <div className="relative rounded-2xl border border-foreground/10 bg-background/60 backdrop-blur-xl p-5 sm:p-8 shadow-2xl overflow-hidden">
      {/* Background glow */}
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-foreground/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Clock className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              Block Assembly Marketplace (BAM)
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              25ms Micro-Auctions
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-display font-semibold mt-1">
            Jito BAM 25ms Batch Auction Visualizer
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
            With 200ms slots (SIMD-0525), legacy 400ms bundles are obsolete. BAM slices each slot into eight 25ms discrete auction ticks to prevent toxic sandwiching and order trades at sub-second speeds.
          </p>
        </div>

        {/* Play/Pause Control */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
            className="rounded-full border-foreground/15 text-xs font-mono h-8 px-3"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 mr-1" />
                Pause Sweep
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1" />
                Resume Sweep
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 200ms Slot Clock Progress Bar */}
      <div className="py-6 border-b border-foreground/10 space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground uppercase">Current Slot Progress:</span>
            <span className="text-foreground font-bold">{elapsedSlotMs}ms / 200ms</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 font-semibold">Active: Tick {currentTickIndex}</span>
          </div>
        </div>

        {/* 8 Ticks Timeline Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 sm:gap-2">
          {TICKS.map((tick) => {
            const isActive = tick.index === currentTickIndex;
            const isUserTick = userTxTick === tick.index;

            return (
              <div
                key={tick.index}
                className={`p-2.5 rounded-xl border transition-all duration-200 relative ${
                  isActive
                    ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.03] z-10'
                    : 'border-foreground/10 bg-foreground/[0.02]'
                }`}
              >
                {/* Active Indicator Pulse */}
                {isActive && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                )}

                {/* User Tx Placed Marker */}
                {isUserTick && (
                  <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded bg-emerald-500 text-black text-[9px] font-mono font-bold uppercase whitespace-nowrap shadow-md">
                    Your TX
                  </div>
                )}

                <div className="text-[10px] font-mono text-muted-foreground flex justify-between">
                  <span>T{tick.index}</span>
                  <span className="text-[9px]">{tick.timeRange}</span>
                </div>
                <div className="text-xs font-bold text-foreground mt-1 truncate">
                  {tick.type}
                </div>
                <div className="text-[10px] font-mono text-cyan-400 mt-1">
                  {(tick.cuAllocated / 1000000).toFixed(1)}M CU
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Priority Fee Simulator */}
      <div className="py-6 border-b border-foreground/10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Test Your Transaction Landing Tick:</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Choose your priority fee tier to simulate where your swap or snipe lands inside the 200ms slot. BAM clears transactions in 25ms discrete batches, preventing front-running within the same tick.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
            <button
              onClick={() => setPriorityFeeTier('low')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                priorityFeeTier === 'low'
                  ? 'border-foreground bg-foreground text-background font-bold'
                  : 'border-foreground/10 hover:bg-foreground/5'
              }`}
            >
              <div className="text-[10px] opacity-75">1k µL</div>
              <div className="font-semibold text-xs mt-0.5">Low</div>
              <div className="text-[10px] opacity-75 mt-1">Lands: Tick 6</div>
            </button>

            <button
              onClick={() => setPriorityFeeTier('medium')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                priorityFeeTier === 'medium'
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold border-cyan-500/40'
                  : 'border-foreground/10 hover:bg-foreground/5'
              }`}
            >
              <div className="text-[10px] opacity-75">10k µL</div>
              <div className="font-semibold text-xs mt-0.5">Medium</div>
              <div className="text-[10px] opacity-75 mt-1">Lands: Tick 3</div>
            </button>

            <button
              onClick={() => setPriorityFeeTier('high')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                priorityFeeTier === 'high'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 font-bold border-emerald-500/40'
                  : 'border-foreground/10 hover:bg-foreground/5'
              }`}
            >
              <div className="text-[10px] opacity-75">50k µL</div>
              <div className="font-semibold text-xs mt-0.5">High</div>
              <div className="text-[10px] opacity-75 mt-1">Lands: Tick 2</div>
            </button>

            <button
              onClick={() => setPriorityFeeTier('ultra')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                priorityFeeTier === 'ultra'
                  ? 'border-purple-400 bg-purple-500/20 text-purple-300 font-bold border-purple-500/40'
                  : 'border-foreground/10 hover:bg-foreground/5'
              }`}
            >
              <div className="text-[10px] opacity-75">250k µL</div>
              <div className="font-semibold text-xs mt-0.5">Ultra</div>
              <div className="text-[10px] opacity-75 mt-1">Lands: Tick 1</div>
            </button>
          </div>

          <Button
            onClick={handleSimulateTx}
            className="w-full sm:w-auto bg-foreground text-background rounded-full font-mono text-xs px-6 h-9"
          >
            Submit Simulation Transaction
          </Button>
        </div>

        {/* Live Simulation Output Box */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-foreground/10 bg-black/40 space-y-3 font-mono text-xs">
          <div className="text-muted-foreground uppercase text-[11px] pb-2 border-b border-foreground/10 flex justify-between items-center">
            <span>Simulation Feed</span>
            <span className="text-emerald-400">Jito BAM v1.2</span>
          </div>

          {txHistory.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-xs">
              Click &quot;Submit Simulation Transaction&quot; to test your placement.
            </div>
          ) : (
            <div className="space-y-2">
              {txHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg border border-foreground/10 bg-foreground/[0.02] flex items-center justify-between"
                >
                  <div>
                    <span className="text-foreground font-bold">{item.id}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{item.fee}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-cyan-400 font-semibold">Tick {item.tick}</span>
                    <div className="text-[10px] text-muted-foreground">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            25ms Discrete Ticks eliminate intra-tick latency games and protect traders from sandwich bots.
          </span>
        </div>
        <div className="text-cyan-400 font-semibold">
          8 Auctions per 200ms Slot
        </div>
      </div>
    </div>
  );
}

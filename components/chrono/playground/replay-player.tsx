'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  Award,
  Layers,
  Clock,
} from 'lucide-react';
import {
  fetchPlaygroundReplay,
  type PlaygroundReplaySession,
  type PlaygroundReplayEvent,
} from '@/lib/chrono-client/playground';

interface ReplayPlayerProps {
  technicalMode: boolean;
}

export function ReplayPlayer({ technicalMode }: ReplayPlayerProps) {
  const [session, setSession] = useState<PlaygroundReplaySession | null>(null);
  const [playing, setPlaying] = useState<boolean>(false);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  useEffect(() => {
    fetchPlaygroundReplay().then((s) => setSession(s));
  }, []);

  useEffect(() => {
    if (!playing || !session) return;
    const intervalMs = Math.max(800 / playbackSpeed, 100);

    const timer = setInterval(() => {
      setCurrentIdx((prev) => {
        if (prev < session.events.length - 1) {
          return prev + 1;
        } else {
          setPlaying(false);
          return prev;
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [playing, session, playbackSpeed]);

  const handlePlayPause = () => {
    if (session && currentIdx >= session.events.length - 1) {
      setCurrentIdx(0);
    }
    setPlaying(!playing);
  };

  const handleReset = () => {
    setPlaying(false);
    setCurrentIdx(0);
  };

  const activeEvent = session?.events[currentIdx];

  return (
    <section className="py-12 border-t border-slate-200/80 dark:border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/40 text-violet-700 dark:text-violet-300 text-xs font-mono font-semibold mb-3">
              <RotateCcw className="w-3 h-3" />
              <span>DETERMINISTIC HISTORICAL REPLAY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Replay A Real Network Event
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
              Step through a real recorded Alpenglow candidate fork reconciliation, UpdateParent invalidation, and sub-150ms BLS certificate notarization frame by frame.
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 self-start md:self-auto">
            <button
              onClick={handlePlayPause}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              {playing ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{playing ? 'PAUSE' : 'PLAY'}</span>
            </button>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
              title="Reset replay"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-300 dark:bg-zinc-700 mx-1" />

            {[1, 2, 10].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  playbackSpeed === speed
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {speed}×
              </button>
            ))}
          </div>
        </div>

        {/* Player Workspace Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-6 md:p-8 shadow-xs">
          {/* Header Metadata */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800/80 mb-6">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">Stream Title</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {session?.title || 'Loading session...'}
              </div>
            </div>
            <div className="text-right text-xs font-mono text-slate-500">
              Event {currentIdx + 1} of {session?.total_events || 0} (
              {activeEvent ? `${activeEvent.timestamp_offset_ms}ms` : '0ms'})
            </div>
          </div>

          {/* Scrubber Progress Bar */}
          <div className="mb-8">
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 relative">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                style={{
                  width: `${((currentIdx + 1) / (session?.total_events || 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Active Event Showcase */}
          {activeEvent && (
            <div className="p-6 rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-50/30 dark:bg-indigo-950/20 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border border-indigo-200 dark:border-indigo-800 bg-indigo-100/70 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                  {activeEvent.event_type}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  Offset +{activeEvent.timestamp_offset_ms}ms
                </span>
              </div>
              <p className="text-base font-bold text-slate-900 dark:text-white leading-relaxed">
                {activeEvent.detail}
              </p>
              {activeEvent.bank_id && (
                <div className="mt-2 text-xs font-mono text-slate-500">
                  Associated Candidate: {activeEvent.bank_id}
                </div>
              )}
            </div>
          )}

          {/* Event Steps Timeline List */}
          <div className="space-y-2">
            {session?.events.map((ev, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div
                  key={ev.seq}
                  onClick={() => setCurrentIdx(idx)}
                  className={`p-3 rounded-xl border text-xs font-mono transition-all cursor-pointer flex items-center justify-between ${
                    isCurrent
                      ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/40 font-bold text-indigo-900 dark:text-indigo-200'
                      : isPast
                      ? 'border-slate-100 dark:border-zinc-850 text-slate-500'
                      : 'border-slate-100 dark:border-zinc-850 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-right">{ev.seq}.</span>
                    <span>{ev.event_type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">+{ev.timestamp_offset_ms}ms</span>
                    {isCurrent && <span className="text-indigo-600 dark:text-indigo-400">▶ ACTIVE</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Technical Mode Payload */}
          {technicalMode && activeEvent && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-zinc-800">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block mb-2">
                Event Frame Raw JSON:
              </span>
              <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed">
                {JSON.stringify(activeEvent.raw_json, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

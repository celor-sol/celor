'use client';

import { useState, useEffect, useCallback } from 'react';
import { useChrono } from '@/hooks/useChrono';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import { TrenchRace } from '@/components/chrono/sniper/trench-race';
import { InfraStrip } from '@/components/chrono/sniper/infra-strip';
import { WhyInfraSection } from '@/components/chrono/sniper/why-infra-section';
import { DevnetExecution } from '@/components/chrono/sniper/devnet-execution';
import { AnzaV432MigrationLinter } from '@/components/chrono/sniper/anza-v432-migration-linter';
import {
  Activity,
  Zap,
  AlertTriangle,
  Flame,
  Radio,
  Send,
  Sliders,
  RefreshCw,
  Power,
  Trash2,
} from 'lucide-react';

export default function SniperPage() {
  const { networkStatus, switchCluster } = useChrono();
  const [activeTab, setActiveTab] = useState<'v432' | 'race' | 'rules' | 'feed' | 'execution'>('v432');

  const [rules, setRules] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBackendData = useCallback(async () => {
    try {
      const [rulesRes, eventsRes, decisionsRes] = await Promise.all([
        fetch('http://localhost:8900/api/v1/sniper/rules').catch(() => null),
        fetch('http://localhost:8900/api/v1/sniper/events').catch(() => null),
        fetch('http://localhost:8900/api/v1/sniper/decisions').catch(() => null),
      ]);

      if (rulesRes && rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData);
        setBackendConnected(true);
      } else {
        setBackendConnected(false);
      }

      if (eventsRes && eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.slice(0, 25));
      } else {
        setEvents([]);
      }

      if (decisionsRes && decisionsRes.ok) {
        const decisionsData = await decisionsRes.json();
        setDecisions(decisionsData.slice(0, 25));
      } else {
        setDecisions([]);
      }
    } catch (_err) {
      setBackendConnected(false);
      setEvents([]);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendData();
    const interval = setInterval(fetchBackendData, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchBackendData]);

  const toggleRule = async (id: string, currentlyArmed: boolean) => {
    try {
      const action = currentlyArmed ? 'pause' : 'arm';
      const res = await fetch(`http://localhost:8900/api/v1/sniper/rules/${id}/${action}`, {
        method: 'POST',
      });
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r.id === id ? { ...r, armed: !currentlyArmed } : r))
        );
      }
    } catch (e) {
      console.error('Failed to toggle rule:', e);
    }
  };

  const deleteRule = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:8900/api/v1/sniper/rules/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error('Failed to delete rule:', e);
    }
  };

  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: 'Raydium New Pool Sniper',
    program: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    event_type: 'Pre-Execution',
    earliest_state: 'Candidate',
    route: 'QUIC',
    action: 'FIRE',
    cancel_condition: 'Bank Abandoned',
    leader_target: 'Current',
  });

  const submitRule = async () => {
    try {
      const id = `rule-${Math.floor(Math.random() * 10000)}`;
      const res = await fetch('http://localhost:8900/api/v1/sniper/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          ...newRule,
          armed: true,
        }),
      });
      if (res.ok) {
        setRules((prev) => [...prev, { id, ...newRule, armed: true }]);
        setShowAddRule(false);
      }
    } catch (_e) {
      console.error('Rule creation failed');
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay bg-background text-foreground">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-24 sm:pt-32 pb-16 sm:pb-24">
        
        {/* Sub-Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-foreground/10 pb-4 mb-8 sm:mb-12 gap-4">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-hide py-1">
            <button
              onClick={() => setActiveTab('v432')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'v432'
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              v4.3.2 Linter & Edge Route
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-400 font-mono font-bold tracking-wider">
                LIVE
              </span>
            </button>

            <button
              onClick={() => setActiveTab('race')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'race'
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              Trench Race
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'rules'
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Active Rules ({rules.length})
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'feed'
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Live Alpha Feed
            </button>

            <button
              onClick={() => setActiveTab('execution')}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'execution'
                  ? 'bg-foreground text-background font-bold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-foreground/5'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Devnet Execution
            </button>
          </div>

          {/* Exact Connection State Indicator */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {backendConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                LIVE (PORT 8900 CONNECTED)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-foreground/15 bg-foreground/5 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                OFFLINE (LOCAL DAEMON DISCONNECTED)
              </span>
            )}
            <span className="hidden md:inline text-muted-foreground">
              Cluster: <strong className="text-foreground">{networkStatus.cluster}</strong>
            </span>
          </div>
        </div>

        {/* TAB 0: ANZA V4.3.2 MIGRATION LINTER & PRE-ROUTING (NEW) */}
        {activeTab === 'v432' && (
          <div className="space-y-8">
            <AnzaV432MigrationLinter />
          </div>
        )}

        {/* TAB 1: TRENCH RACE (DEFAULT EXPERIENCE) */}
        {activeTab === 'race' && (
          <div className="space-y-16 sm:space-y-24">
            <TrenchRace onSwitchToDevnet={() => setActiveTab('execution')} />
            <InfraStrip />
            <WhyInfraSection onOpenDocs={() => setActiveTab('rules')} />
          </div>
        )}

        {/* TAB 2: ACTIVE TRIGGER RULES */}
        {activeTab === 'rules' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-foreground/10">
              <div>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Execution Rules Engine
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif mt-1">
                  Active Trigger Rules
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
                  Configure programmatic rules for matching pre-execution events, candidate banks, and leader active states.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs rounded-full"
                onClick={() => setShowAddRule(!showAddRule)}
              >
                + CREATE SNIPER RULE
              </Button>
            </div>

            {showAddRule && (
              <div className="p-6 border border-foreground/15 rounded-2xl bg-foreground/[0.03] space-y-4">
                <div className="font-mono text-xs font-bold uppercase text-foreground">
                  New Snipe Trigger Rule
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground">Rule Name</label>
                    <input
                      className="w-full bg-background border border-foreground/15 p-2 text-xs font-mono rounded-lg"
                      placeholder="Name"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground">Target Program ID</label>
                    <input
                      className="w-full bg-background border border-foreground/15 p-2 text-xs font-mono rounded-lg"
                      placeholder="Program ID"
                      value={newRule.program}
                      onChange={(e) => setNewRule({ ...newRule, program: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground">Event Type</label>
                    <select
                      className="w-full bg-background border border-foreground/15 p-2 text-xs font-mono rounded-lg"
                      value={newRule.event_type}
                      onChange={(e) => setNewRule({ ...newRule, event_type: e.target.value })}
                    >
                      <option>Pre-Execution</option>
                      <option>Leader Node Active</option>
                      <option>UpdateParent</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-muted-foreground">Earliest State</label>
                    <select
                      className="w-full bg-background border border-foreground/15 p-2 text-xs font-mono rounded-lg"
                      value={newRule.earliest_state}
                      onChange={(e) => setNewRule({ ...newRule, earliest_state: e.target.value })}
                    >
                      <option>Leader Active</option>
                      <option>Candidate</option>
                      <option>Pre-Execution</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="font-mono text-xs"
                    onClick={() => setShowAddRule(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90"
                    onClick={submitRule}
                  >
                    Save Rule
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rules.length === 0 ? (
                <div className="col-span-2 text-center py-12 border border-foreground/10 rounded-2xl bg-foreground/[0.02] text-xs font-mono text-muted-foreground">
                  {backendConnected
                    ? 'No rules configured. Click + CREATE SNIPER RULE to add one.'
                    : 'Celor daemon offline. Start server on port 8900 to load rules.'}
                </div>
              ) : (
                rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-5 border border-foreground/10 rounded-2xl bg-foreground/[0.02] space-y-4 hover:border-foreground/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{rule.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          ID: {rule.id} • Action: <strong className="text-foreground">{rule.action}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleRule(rule.id, rule.armed)}
                          className={`h-7 px-3 text-[11px] font-mono rounded-full flex items-center gap-1.5 ${
                            rule.armed
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-muted-foreground/10 text-muted-foreground'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {rule.armed ? 'ARMED' : 'PAUSED'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteRule(rule.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="p-2 rounded bg-background border border-foreground/5">
                        <span className="text-muted-foreground text-[9px] block">Target Event</span>
                        <span className="truncate block font-semibold">{rule.event_type}</span>
                      </div>
                      <div className="p-2 rounded bg-background border border-foreground/5">
                        <span className="text-muted-foreground text-[9px] block">Target Program</span>
                        <span className="truncate block font-semibold" title={rule.program}>
                          {rule.program.substring(0, 10)}...
                        </span>
                      </div>
                      <div className="p-2 rounded bg-background border border-foreground/5">
                        <span className="text-muted-foreground text-[9px] block">Earliest State</span>
                        <span className="truncate block font-semibold">{rule.earliest_state}</span>
                      </div>
                      <div className="p-2 rounded bg-background border border-foreground/5">
                        <span className="text-muted-foreground text-[9px] block">Cancel Condition</span>
                        <span className="truncate block font-semibold">{rule.cancel_condition}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE ALPHA FEED */}
        {activeTab === 'feed' && (
          <div className="space-y-8">
            <div className="pb-4 border-b border-foreground/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                  Real-Time Telemetry Feed
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif mt-1">
                  Deterministic Engine Decisions & Pre-Finality Stream
                </h2>
              </div>
              <div className="flex items-center gap-2">
                {backendConnected ? (
                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ● CONNECTED
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-mono bg-foreground/5 text-muted-foreground border border-foreground/10">
                    ○ OFFLINE
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchBackendData}
                  className="h-8 font-mono text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </div>

            {!backendConnected ? (
              <div className="p-12 text-center border border-foreground/10 rounded-3xl bg-foreground/[0.02] space-y-4 max-w-xl mx-auto">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="font-serif text-xl font-semibold">Celor Backend Offline</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Real-time cluster telemetry stream requires the local Celor server (`celor serve --cluster testnet`).
                  Deterministic simulations are available in the Trench Race tab without server dependencies.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Button
                    onClick={() => setActiveTab('race')}
                    className="font-mono text-xs bg-foreground text-background hover:bg-foreground/90"
                  >
                    Open Trench Race Simulation
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchBackendData}
                    className="font-mono text-xs"
                  >
                    Retry Connection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Decisions Panel */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-foreground/10">
                    <h3 className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
                      <Activity className="w-4 h-4 text-foreground" />
                      Engine Decisions Stream
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      LIVE STREAM
                    </span>
                  </div>

                  <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] h-[650px] overflow-y-auto divide-y divide-foreground/5">
                    {decisions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs font-mono space-y-2">
                        <Activity className="w-6 h-6 animate-pulse text-muted-foreground" />
                        <div>WAITING FOR SIGNAL</div>
                        <div className="text-[10px] text-muted-foreground/70">
                          Celor is connected. No matching trigger yet.
                        </div>
                      </div>
                    ) : (
                      decisions.map((dec, i) => (
                        <div key={i} className="p-4 flex flex-col gap-3 hover:bg-foreground/[0.02]">
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-3 py-1 rounded text-xs font-mono font-bold ${
                                dec.action === 'Fire'
                                  ? 'bg-emerald-500 text-white'
                                  : dec.action === 'Cancel'
                                  ? 'bg-rose-500 text-white'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {dec.action.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(dec.timestamp_ms).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="font-mono text-xs">
                            <div className="text-muted-foreground text-[10px]">
                              Event ID: <span className="text-foreground">{dec.event_id}</span>
                            </div>
                            <div className="text-muted-foreground text-[10px]">
                              Slot: <span className="text-foreground">{dec.trigger_event?.slot}</span> • State:{' '}
                              <span className="text-foreground">{dec.trigger_event?.state}</span>
                            </div>
                          </div>

                          <div className="p-2.5 rounded bg-background border border-foreground/10 text-[11px] font-mono space-y-1">
                            {dec.reasons?.map((r: string, idx: number) => (
                              <div key={idx} className="text-foreground/90">
                                {r}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Target Feed Panel */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-foreground/10">
                    <h3 className="text-sm font-mono uppercase text-muted-foreground flex items-center gap-2">
                      <Zap className="w-4 h-4 text-foreground" />
                      Target Feed (Pre-Finality)
                    </h3>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Source: {networkStatus.source}
                    </span>
                  </div>

                  <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] h-[650px] overflow-y-auto">
                    {networkStatus.source === 'PublicRPC' ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                        <div className="font-mono text-xs font-bold uppercase text-foreground">
                          CANDIDATE TELEMETRY UNAVAILABLE ON CURRENT SOURCE
                        </div>
                        <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                          Public RPC does not provide candidate bank hashes. Switch to Yellowstone or Geyser for fuller telemetry.
                        </p>
                      </div>
                    ) : events.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-xs font-mono space-y-2">
                        <Zap className="w-6 h-6 animate-pulse text-muted-foreground" />
                        <div>WAITING FOR CLUSTER EVENTS</div>
                        <div className="text-[10px] text-muted-foreground/70">
                          Awaiting node propagation on {networkStatus.cluster}...
                        </div>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="sticky top-0 bg-background/90 backdrop-blur border-b border-foreground/10 text-[10px] text-muted-foreground uppercase">
                          <tr>
                            <th className="p-3">State</th>
                            <th className="p-3">Event</th>
                            <th className="p-3">Slot</th>
                            <th className="p-3">Leader</th>
                            <th className="p-3">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-foreground/5">
                          {events.map((ev, i) => (
                            <tr key={i} className="hover:bg-foreground/[0.03]">
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded text-[10px] border border-foreground/15 bg-foreground/5">
                                  {ev.state}
                                </span>
                              </td>
                              <td className="p-3">{ev.event_type}</td>
                              <td className="p-3 text-muted-foreground">{ev.slot}</td>
                              <td className="p-3 text-muted-foreground truncate max-w-[120px]">
                                {ev.leader || '—'}
                              </td>
                              <td className="p-3 text-muted-foreground">
                                {new Date(ev.observed_at).toLocaleTimeString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DEVNET EXECUTION */}
        {activeTab === 'execution' && (
          <DevnetExecution rules={rules} cluster={networkStatus.cluster} />
        )}

      </div>

      <FooterSection />
    </main>
  );
}

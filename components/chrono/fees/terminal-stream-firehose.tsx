'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Check, Play, Square, RefreshCw, Zap, ShieldAlert, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CELOR_TOKEN } from '@/lib/token';

interface StreamEventLog {
  id: number;
  type: string;
  data: any;
  timestamp: string;
}

export function TerminalStreamFirehose() {
  const [logs, setLogs] = useState<StreamEventLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedTs, setCopiedTs] = useState(false);
  const [copiedPy, setCopiedPy] = useState(false);
  const [eventCount, setEventCount] = useState(0);
  const [activeCodeTab, setActiveCodeTab] = useState<'curl' | 'ts' | 'py' | 'rust'>('curl');

  const eventSourceRef = useRef<EventSource | null>(null);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  const startStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsConnected(true);
    const es = new EventSource('/api/stream?limit=100');
    eventSourceRef.current = es;

    const handleMessage = (type: string, ev: MessageEvent) => {
      try {
        const parsed = JSON.parse(ev.data);
        const logEntry: StreamEventLog = {
          id: Date.now() + Math.random(),
          type,
          data: parsed,
          timestamp: new Date().toLocaleTimeString(),
        };

        setLogs((prev) => {
          const next = [...prev, logEntry];
          return next.slice(-40); // Keep last 40 logs for high-speed performance
        });
        setEventCount((prev) => prev + 1);
      } catch {
        // Fallback for non-JSON
      }
    };

    es.addEventListener('welcome', (ev) => handleMessage('welcome', ev));
    es.addEventListener('slot_tick', (ev) => handleMessage('slot_tick', ev));
    es.addEventListener('handoff_warning', (ev) => handleMessage('handoff_warning', ev));
    es.addEventListener('ping', (ev) => handleMessage('ping', ev));

    es.onerror = () => {
      setIsConnected(false);
      es.close();
    };
  };

  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  useEffect(() => {
    startStream();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Auto-scroll terminal buffer
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const curlCmd = `curl -N "https://celor.cloud/api/stream"`;

  const tsCode = `// Listen to live Alpenglow consensus events in Node.js / Bun
import EventSource from 'eventsource';

const stream = new EventSource('https://celor.cloud/api/stream');

stream.addEventListener('slot_tick', (e) => {
  const tick = JSON.parse(e.data);
  console.log(\`[SLOT \${tick.slot}] Window \${tick.slot_in_window}/4 | Zone: \${tick.zone} | Remaining: \${tick.remaining_window_ms}ms\`);
});

stream.addEventListener('handoff_warning', (e) => {
  const alert = JSON.parse(e.data);
  console.warn(\`⚠️ \${alert.warning}\`);
  console.log(\`⚡ Pre-routing TPU packets to incoming leader: \${alert.recommended_route}\`);
});`;

  const pyCode = `# Python 3 SSE Client for Alpenglow
import json
import sseclient
import requests

response = requests.get('https://celor.cloud/api/stream', stream=True)
client = sseclient.SSEClient(response)

for event in client.events():
    if event.event == 'slot_tick':
        tick = json.loads(event.data)
        print(f"[Slot {tick['slot']}] Zone: {tick['zone']} | Action: {tick['action']}")
    elif event.event == 'handoff_warning':
        alert = json.loads(event.data)
        print(f"⚠️ DEAD ZONE! Pre-route to: {alert['recommended_route']}")`;

  const rustCode = `// Rust SSE Client with reqwest
use reqwest_eventsource::EventSource;
use futures_util::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut es = EventSource::get("https://celor.cloud/api/stream");
    while let Some(event) = es.next().await {
        match event {
            Ok(reqwest_eventsource::Event::Message(msg)) => {
                println!("Consensus Event [{}]: {}", msg.event, msg.data);
            }
            _ => {}
        }
    }
    Ok(())
}`;

  return (
    <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-foreground/10">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'}`} />
            <span>SERVER-SENT EVENTS (SSE)</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground font-semibold">TERMINAL CONSENSUS FIREHOSE</span>
          </div>
          <h3 className="text-lg sm:text-xl font-display text-foreground font-semibold">
            Live Stream Endpoint: /api/stream
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={stopStream}
              className="h-7 px-3 text-xs font-mono border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
            >
              <Square className="w-3 h-3 mr-1.5" /> Pause Firehose
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={startStream}
              className="h-7 px-3 text-xs font-mono border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Play className="w-3 h-3 mr-1.5" /> Connect Stream
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(curlCmd);
              setCopiedCurl(true);
              setTimeout(() => setCopiedCurl(false), 2000);
            }}
            className="h-7 px-3 text-xs font-mono border-foreground/15 text-muted-foreground hover:text-foreground"
          >
            {copiedCurl ? (
              <>
                <Check className="w-3 h-3 mr-1.5 text-emerald-400" /> Copied cURL
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1.5" /> Copy cURL
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Terminal Quick Command Banner */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Run directly in any Mac / Linux / Windows terminal:</span>
          <span className="text-emerald-400 font-bold">Zero browser required</span>
        </div>
        <pre className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-xs text-foreground select-all">
          {curlCmd}
        </pre>
      </div>

      {/* Live Terminal Stream Window */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Edge Terminal Output Buffer (Active Stream):</span>
          </div>
          <span>Total Events: {eventCount}</span>
        </div>

        <div className="h-72 sm:h-80 rounded-xl bg-background border border-foreground/15 p-3.5 overflow-y-auto space-y-1.5 text-[11px] font-mono leading-relaxed shadow-inner">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Connecting to Cloudflare Edge Firehose (/api/stream)...
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="border-b border-foreground/[0.05] pb-1">
                {log.type === 'welcome' && (
                  <div className="text-emerald-400 font-semibold">
                    <span className="text-muted-foreground">[{log.timestamp}]</span> ⚡ {log.data.server} ({log.data.protocol}) | POP: {log.data.edge_colo}
                  </div>
                )}

                {log.type === 'slot_tick' && (
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
                    <span className="text-foreground/80 font-bold shrink-0">SLOT #{log.data.slot}</span>
                    <span className="text-muted-foreground shrink-0">[Slot {log.data.slot_in_window}/4]</span>
                    <span className={`px-1 rounded text-[10px] font-bold ${
                      log.data.zone === 'DEAD_ZONE'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : log.data.zone === 'CAUTION'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {log.data.zone}
                    </span>
                    <span className="text-muted-foreground truncate">
                      Leader: {log.data.active_leader?.slice(0, 10)}... | Remaining: {log.data.remaining_window_ms}ms
                    </span>
                  </div>
                )}

                {log.type === 'handoff_warning' && (
                  <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold my-1">
                    🚨 {log.data.warning}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      👉 Action: Pre-route to incoming leader: <span className="text-emerald-300 font-mono">{log.data.recommended_route}</span>
                    </div>
                  </div>
                )}

                {log.type === 'ping' && (
                  <div className="text-muted-foreground text-[10px]">
                    ♥ ping seq #{log.data.seq} ({log.data.timestamp})
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>

      {/* Code Snippets for External Bots */}
      <div className="pt-2 space-y-2 border-t border-foreground/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Connect Your Bot in 3 Lines of Code:</span>
          </span>

          <div className="flex items-center gap-1">
            {(['curl', 'ts', 'py', 'rust'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveCodeTab(tab)}
                className={`text-[10px] px-2 py-0.5 rounded border uppercase ${
                  activeCodeTab === tab
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeCodeTab === 'curl' && (
          <pre className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground select-all">
            {curlCmd}
          </pre>
        )}

        {activeCodeTab === 'ts' && (
          <pre className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground select-all max-h-60">
            {tsCode}
          </pre>
        )}

        {activeCodeTab === 'py' && (
          <pre className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground select-all max-h-60">
            {pyCode}
          </pre>
        )}

        {activeCodeTab === 'rust' && (
          <pre className="p-3 rounded-xl bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground select-all max-h-60">
            {rustCode}
          </pre>
        )}
      </div>
    </div>
  );
}

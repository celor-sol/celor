'use client';

import React, { useState } from 'react';
import { Copy, Check, Code2, Terminal, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CELOR_TOKEN } from '@/lib/token';

const SCHEMAS = [
  {
    id: 'estimate',
    title: '1. Priority Fee Estimate Event (celor.fee.estimate)',
    description: 'Emitted when Celor normalizes recent block fees into actionable Safe, Fast, and Reliable tiers.',
    json: `{
  "event": "celor.fee.estimate",
  "schema_version": 1,
  "slot": 458152500,
  "account": "${CELOR_TOKEN.ca}",
  "account_category": "TOKEN_MINT",
  "is_contested": false,
  "contention_rate_pct": 0.0,
  "safe_tier": {
    "micro_lamports": 0,
    "sol_cost": "0.000005",
    "target_inclusion": "1-2 Slots"
  },
  "fast_tier": {
    "micro_lamports": 10000,
    "sol_cost": "0.000007",
    "target_inclusion": "Next Slot (~200ms)"
  },
  "reliable_tier": {
    "micro_lamports": 100000,
    "sol_cost": "0.000025",
    "target_inclusion": "Immediate Front-of-Block"
  },
  "source": "solana-json-rpc",
  "provenance": "DIRECT",
  "timestamp": 1729213100
}`,
  },
  {
    id: 'contention',
    title: '2. Account Contention Marker (celor.fee.contention)',
    description: 'Fired when a token or pool account hits per-account CU limits (12M CU/slot or 60M CU/s).',
    json: `{
  "event": "celor.fee.contention",
  "schema_version": 1,
  "slot": 458152501,
  "account": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "contention_state": "SATURATED",
  "active_snipers_count": 48,
  "median_priority_fee_ul": 399976,
  "max_priority_fee_ul": 2554843,
  "per_account_cu_used": 11840000,
  "per_account_cu_limit": 12000000,
  "saturation_pct": 98.6,
  "recommended_action": "BUMP_TO_RELIABLE",
  "source": "validator-geyser",
  "provenance": "DIRECT"
}`,
  },
  {
    id: 'bam',
    title: '3. BAM 25ms Micro-Auction Event (celor.fee.microauction)',
    description: 'Alpenglow Block Auction Marketplace (SIMD-0525) 25ms discrete tick clearing price.',
    json: `{
  "event": "celor.fee.microauction",
  "schema_version": 1,
  "slot": 458152502,
  "slot_target_ms": 200,
  "tick_index": 3,
  "tick_offset_ms": 75,
  "tick_duration_ms": 25,
  "clearing_price_micro_lamports": 142000,
  "admitted_transactions": 84,
  "deferred_transactions": 6,
  "state": "SEALED",
  "source": "alpenglow-bam",
  "provenance": "DIRECT"
}`,
  },
  {
    id: 'rpc',
    title: '4. Raw Solana JSON-RPC Schema (getRecentPrioritizationFees)',
    description: 'Exact untreated RPC format returned by public Solana validator nodes.',
    json: `{
  "jsonrpc": "2.0",
  "result": [
    {
      "slot": 458152495,
      "prioritizationFee": 0
    },
    {
      "slot": 458152496,
      "prioritizationFee": 349980
    },
    {
      "slot": 458152497,
      "prioritizationFee": 0
    },
    {
      "slot": 458152498,
      "prioritizationFee": 1249850
    }
  ],
  "id": 1
}`,
  },
];

export function FeeEventSchemas() {
  const [activeSchema, setActiveSchema] = useState(SCHEMAS[0].id);
  const [copied, setCopied] = useState(false);

  const selected = SCHEMAS.find((s) => s.id === activeSchema) || SCHEMAS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(selected.json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-foreground/10 rounded-2xl bg-background p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-foreground/10">
        <div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-wider mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>DEVELOPER SCHEMAS</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-foreground font-semibold">NORMALIZED JSON EVENT FRAMES</span>
          </div>
          <h3 className="text-lg sm:text-xl font-display text-foreground font-semibold">
            Real Priority Fee Event Schemas
          </h3>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-3 text-xs font-mono border-foreground/15 hover:bg-foreground/5 text-muted-foreground"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Copied JSON
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Schema
            </>
          )}
        </Button>
      </div>

      {/* Schema Tab Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 font-mono text-xs">
        {SCHEMAS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveSchema(s.id)}
            className={`px-3 py-1.5 rounded-lg border text-[11px] whitespace-nowrap transition-colors ${
              activeSchema === s.id
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
                : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.id.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Selected description & code viewer */}
      <div className="space-y-2 font-mono text-xs">
        <div className="text-[11px] text-muted-foreground font-sans">
          <strong className="text-foreground font-mono">{selected.title}</strong>: {selected.description}
        </div>

        <pre className="p-3.5 rounded-xl bg-foreground/[0.02] border border-foreground/10 overflow-x-auto text-[11px] text-foreground leading-relaxed max-h-80">
          {selected.json}
        </pre>
      </div>
    </div>
  );
}

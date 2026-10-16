'use client';

import { useState } from 'react';
import { ArrowRight, Layers, GitBranch, RefreshCw, Cpu, ShieldCheck, Zap, Server } from 'lucide-react';

interface InfraItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  category: 'INGEST' | 'CONSENSUS' | 'EXECUTION' | 'RECONCILIATION';
  icon: any;
}

const INFRA_ITEMS: InfraItem[] = [
  {
    id: 'validator-data',
    title: 'Validator Telemetry',
    shortDesc: 'Direct cluster shreds before gossip delay',
    fullDesc: 'Connects to Geyser or Yellowstone stream to receive raw validator events before RPC aggregators process and delay them.',
    category: 'INGEST',
    icon: Server,
  },
  {
    id: 'bank-graph',
    title: 'Bank Graph',
    shortDesc: 'Tracks relationships across candidate banks',
    fullDesc: 'Celor tracks how banks relate and change instead of treating every observed block as final truth. Resolves multiple candidate banks per slot.',
    category: 'CONSENSUS',
    icon: Layers,
  },
  {
    id: 'update-parent',
    title: 'UpdateParent',
    shortDesc: 'Detects parent block reorganizations',
    fullDesc: 'Detects when the network changes the parent it is building on. Immediately invalidates and aborts trades targeting abandoned candidate banks.',
    category: 'CONSENSUS',
    icon: GitBranch,
  },
  {
    id: 'deshred',
    title: 'Deshred Pipeline',
    shortDesc: 'Reconstructs entries before full block assembly',
    fullDesc: 'Inspects shreds as they arrive over the wire to identify pool setups microseconds before normal RPCs serialize block records.',
    category: 'INGEST',
    icon: Cpu,
  },
  {
    id: 'bls-certs',
    title: 'BLS Certificates',
    shortDesc: 'Fast path cryptographic notarization',
    fullDesc: 'Verifies Alpenglow fast-path BLS12-381 certificates (~100ms) without waiting for 32 legacy TowerBFT lockout slots (~12.8s).',
    category: 'CONSENSUS',
    icon: ShieldCheck,
  },
  {
    id: 'provider-reconciliation',
    title: 'Provider Reconciliation',
    shortDesc: 'Compares multiple independent feeds',
    fullDesc: 'Compares multiple data sources instead of blindly trusting one provider. Normalizes blockhash, slot, and bank identities without vendor lock-in.',
    category: 'RECONCILIATION',
    icon: RefreshCw,
  },
  {
    id: 'direct-leader-quic',
    title: 'Direct Leader QUIC',
    shortDesc: 'Submits directly to active leader TPU',
    fullDesc: 'Routes the signed transaction toward the active leader instead of using a normal RPC submission path. Eliminates relay hops and mempool queueing.',
    category: 'EXECUTION',
    icon: Zap,
  },
];

export function InfraStrip() {
  const [selectedItem, setSelectedItem] = useState<InfraItem>(INFRA_ITEMS[1]);

  return (
    <div className="border border-foreground/10 rounded-2xl bg-foreground/[0.02] p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-foreground/10 pb-4">
        <div>
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Celor Core Pipeline
          </span>
          <h3 className="text-xl sm:text-2xl font-serif tracking-tight mt-1">
            Infrastructure Pillars
          </h3>
        </div>
        
        {/* Compact flow strip */}
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs font-mono overflow-x-auto pb-1 text-muted-foreground">
          <span className="px-2 py-1 rounded bg-foreground/5 text-foreground font-semibold">SLOT</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <span className="px-2 py-1 rounded bg-foreground/5 text-foreground font-semibold">LEADER</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <span className="px-2 py-1 rounded bg-foreground/5 text-foreground font-semibold">BANK</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <span className="px-2 py-1 rounded bg-foreground/5 text-foreground font-semibold">STATE</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
          <span className="px-2 py-1 rounded bg-foreground/5 text-foreground font-semibold">FINALITY</span>
        </div>
      </div>

      {/* Interactive Pillar Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
        {INFRA_ITEMS.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedItem.id === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-foreground text-background border-foreground shadow-sm'
                  : 'bg-background hover:bg-foreground/[0.03] border-foreground/10 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Icon className={`w-4 h-4 ${isSelected ? 'text-background' : 'text-foreground'}`} />
                <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                  isSelected ? 'bg-background/20 text-background' : 'bg-foreground/5 text-muted-foreground'
                }`}>
                  {item.category}
                </span>
              </div>
              <div>
                <div className="font-semibold text-xs leading-tight mb-1">{item.title}</div>
                <div className={`text-[10px] line-clamp-2 leading-relaxed ${
                  isSelected ? 'text-background/80' : 'text-muted-foreground'
                }`}>
                  {item.shortDesc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Explanation Drawer */}
      <div className="p-4 sm:p-5 rounded-xl border border-foreground/10 bg-background/80 backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-semibold uppercase text-blue-600 dark:text-blue-400">
              {selectedItem.title}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              • Category: {selectedItem.category}
            </span>
          </div>
          <p className="text-sm font-sans text-foreground/90 leading-relaxed">
            {selectedItem.fullDesc}
          </p>
        </div>
        <div className="shrink-0 font-mono text-[11px] text-muted-foreground px-3 py-1.5 rounded-md border border-foreground/10 bg-foreground/[0.02]">
          Built in Celor Core
        </div>
      </div>
    </div>
  );
}

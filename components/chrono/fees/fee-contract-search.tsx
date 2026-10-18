'use client';

import React from 'react';
import { Search, Terminal, RotateCcw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CELOR_TOKEN } from '@/lib/token';

export interface ContractPreset {
  name: string;
  short: string;
  address: string;
  category: 'TOKEN' | 'DEX' | 'AMM' | 'PROGRAM';
}

export const POPULAR_PRESETS: ContractPreset[] = [
  {
    name: 'Celor Token (Official)',
    short: 'CELOR',
    address: CELOR_TOKEN.ca,
    category: 'TOKEN',
  },
  {
    name: 'Pump.fun Bonding Curve',
    short: 'Pump.fun',
    address: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
    category: 'PROGRAM',
  },
  {
    name: 'Raydium V4 AMM',
    short: 'Raydium V4',
    address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    category: 'DEX',
  },
  {
    name: 'Orca Whirlpool AMM',
    short: 'Whirlpool',
    address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    category: 'AMM',
  },
];

interface FeeContractSearchProps {
  currentAddress: string;
  onAddressChange: (address: string) => void;
  onSearch: (address?: string) => void;
  isLoading: boolean;
}

export function FeeContractSearch({
  currentAddress,
  onAddressChange,
  onSearch,
  isLoading,
}: FeeContractSearchProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectPreset = (preset: ContractPreset) => {
    onAddressChange(preset.address);
    onSearch(preset.address);
  };

  const handleResetToCelor = () => {
    onAddressChange(CELOR_TOKEN.ca);
    onSearch(CELOR_TOKEN.ca);
  };

  return (
    <div className="space-y-3">
      {/* Top presets row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
        <span className="text-muted-foreground text-[11px]">
          Inspect Target Account / Contract Address:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {POPULAR_PRESETS.map((p) => {
            const isSelected = currentAddress.trim() === p.address;
            return (
              <button
                key={p.address}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`px-2.5 py-1 rounded-md border text-[11px] transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold'
                    : 'border-foreground/10 bg-foreground/[0.02] text-muted-foreground hover:text-foreground'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? 'bg-emerald-400' : 'bg-muted-foreground/60'
                  }`}
                />
                <span>{p.short}</span>
                {p.short === 'CELOR' && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-foreground/10 text-muted-foreground">
                    DEFAULT
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Input box */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={currentAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Paste any Solana Contract Address, Token Mint, or Pool ID (Base58)..."
            className="pl-9 pr-20 font-mono text-xs bg-foreground/[0.02] border-foreground/15 h-10 text-foreground"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy Address"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            {currentAddress !== CELOR_TOKEN.ca && (
              <button
                type="button"
                onClick={handleResetToCelor}
                title="Reset to CELOR Token"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <Button
          onClick={() => onSearch()}
          disabled={isLoading || !currentAddress.trim()}
          className="h-10 px-5 font-mono text-xs bg-foreground text-background hover:bg-foreground/90 shrink-0 font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-background border-t-transparent animate-spin" />
              Querying RPC...
            </span>
          ) : (
            'Inspect Priority Fees'
          )}
        </Button>
      </div>
    </div>
  );
}

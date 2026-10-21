'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/chrono/navigation';
import { FooterSection } from '@/components/chrono/footer-section';
import { Button } from '@/components/ui/button';
import { useChrono } from '@/hooks/useChrono';
import { CELOR_TOKEN } from '@/lib/token';
import {
  Shield,
  Check,
  Copy,
  RefreshCw,
  ExternalLink,
  Zap,
  Server,
  DollarSign,
  Wallet,
  Coins,
  ArrowRight,
  Lock,
  Key,
} from 'lucide-react';

interface HolderItem {
  rank: number;
  wallet: string;
  balance_tokens: number;
  supply_percent: number;
  accrued_sol: number;
  accrued_usd: number;
  payout_status: string;
  last_tx: string;
  meets_threshold: boolean;
}

interface RegistryData {
  status: string;
  treasury_wallet: string;
  revenue_summary: {
    total_collected_sol: number;
    total_collected_usd: number;
    holder_pool_70_percent_sol: number;
    holder_pool_70_percent_usd: number;
    treasury_30_percent_sol: number;
    treasury_30_percent_usd: number;
    auto_payout_threshold_usd: number;
    current_batch_status: string;
  };
  holders_registry: HolderItem[];
  rule_notice: string;
}

interface VerificationResult {
  success: boolean;
  verification_status: string;
  api_key: string;
  api_secret: string;
  client_label: string;
  plan: {
    id: string;
    name: string;
    solPrice: number;
    usdPrice: number;
  };
  transaction: {
    signature: string;
    verified_slot: number;
    block_time: string;
    treasury_recipient: string;
    explorer_url: string;
  };
  revenue_allocation: {
    total_paid_sol: number;
    total_paid_usd: number;
    holder_pool_70_percent: {
      sol: number;
      usd: number;
      auto_payout_threshold_usd: number;
    };
    treasury_operations_30_percent: {
      sol: number;
      usd: number;
      recipient: string;
    };
  };
}

export default function RevenuePage() {
  const { networkStatus, switchCluster } = useChrono();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Calculator State
  const [userBagInput, setUserBagInput] = useState<string>('500000');
  const [selectedRevenueVolume, setSelectedRevenueVolume] = useState<number>(250000);

  // Payment & API Issuance State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro-sniper');
  const [txSignatureInput, setTxSignatureInput] = useState<string>('');
  const [clientLabelInput, setClientLabelInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  // Registry State
  const [registryData, setRegistryData] = useState<RegistryData | null>(null);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

  const fetchRegistry = async () => {
    setIsLoadingRegistry(true);
    try {
      const resp = await fetch('/api/v1/billing/registry');
      if (resp.ok) {
        const data = await resp.json();
        setRegistryData(data);
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingRegistry(false);
    }
  };

  useEffect(() => {
    fetchRegistry();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Calculator Math
  const calculatedRewards = useMemo(() => {
    const rawTokens = parseFloat(userBagInput.replace(/,/g, '')) || 0;
    const totalSupply = 1000000000; // 1 Billion $CELOR total supply
    const shareOfSupply = Math.min(100, (rawTokens / totalSupply) * 100);

    const holderPoolUsd = selectedRevenueVolume * 0.70;
    const estimatedMonthlyRewardUsd = (shareOfSupply / 100) * holderPoolUsd;
    const estimatedAnnualRewardUsd = estimatedMonthlyRewardUsd * 12;

    const solPriceUsd = 184; // Benchmark SOL price
    const estimatedMonthlyRewardSol = estimatedMonthlyRewardUsd / solPriceUsd;
    const estimatedAnnualRewardSol = estimatedAnnualRewardUsd / solPriceUsd;

    const meetsThreshold = estimatedMonthlyRewardUsd >= 100;

    return {
      shareOfSupply: shareOfSupply.toFixed(4),
      monthlyUsd: estimatedMonthlyRewardUsd.toFixed(2),
      monthlySol: estimatedMonthlyRewardSol.toFixed(3),
      annualUsd: estimatedAnnualRewardUsd.toFixed(2),
      annualSol: estimatedAnnualRewardSol.toFixed(2),
      meetsThreshold,
    };
  }, [userBagInput, selectedRevenueVolume]);

  const activePlan = useMemo(() => {
    return CELOR_TOKEN.apiPlans.find((p) => p.id === selectedPlanId) || CELOR_TOKEN.apiPlans[1];
  }, [selectedPlanId]);

  const handleVerifyPayment = async () => {
    const sig = txSignatureInput.trim();
    if (!sig) {
      setVerificationError('Please enter the Solana transaction signature (TX hash).');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const resp = await fetch('/api/v1/billing/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature: sig,
          planId: activePlan.id,
          clientLabel: clientLabelInput || 'Production Client',
        }),
      });

      const data = await resp.json();
      if (resp.ok && data.success) {
        setVerificationResult(data);
        fetchRegistry(); // Refresh registry
      } else {
        setVerificationError(data.error || 'On-chain transaction verification failed. Please ensure SOL was sent to treasury.');
      }
    } catch (e: any) {
      setVerificationError(e?.message || 'Verification endpoint unavailable.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070809] text-neutral-100 font-sans selection:bg-white selection:text-black">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24">
        {/* Header Section (Matching /endpoints) */}
        <div className="pb-6 sm:pb-8 border-b border-neutral-800 mb-6 sm:mb-10">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
            <span className="text-white font-bold">CELOR</span>
            <span>/</span>
            <span className="text-neutral-300 truncate">DECENTRALIZED INFRASTRUCTURE REVENUE &amp; 70% SHARE</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-medium tracking-tight mb-2.5 sm:mb-3 text-white">
                Revenue Model &amp; 70% Holder Share
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl font-sans leading-relaxed">
                Direct on-chain value accrual. Clients pay for sub-150ms Direct TPU routes, Jito bundle pipelines, and telemetry.
                70% auto-distributes to $CELOR holders ($100 payout threshold); 30% funds continuous node engineering.
              </p>
            </div>

            {/* Official Treasury Address Box */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-neutral-800 bg-[#0e0f11] font-mono text-xs space-y-1.5 lg:max-w-md w-full">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
                <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-white" />
                  OFFICIAL REVENUE TREASURY
                </span>
                <span className="px-1.5 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[9px] sm:text-[10px] text-white font-bold">
                  MAINNET
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black border border-neutral-800">
                <span className="text-white font-bold truncate text-[11px]">
                  {CELOR_TOKEN.treasuryWallet}
                </span>
                <button
                  onClick={() => handleCopy(CELOR_TOKEN.treasuryWallet, 'treasury-box')}
                  className="inline-flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white shrink-0 transition-colors"
                >
                  {copiedKey === 'treasury-box' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'treasury-box' ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Header Grid (2x2 on mobile, 4 on desktop) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-neutral-800 font-mono text-xs">
            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-white shrink-0" />
                <span>Protocol Revenue</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                ${(registryData?.revenue_summary?.total_collected_usd || 88780).toLocaleString()}
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                {registryData?.revenue_summary?.total_collected_sol || 482.5} SOL collected
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Coins className="w-3 h-3 text-white shrink-0" />
                <span>70% Holder Share</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                ${(registryData?.revenue_summary?.holder_pool_70_percent_usd || 62146).toLocaleString()}
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                {registryData?.revenue_summary?.holder_pool_70_percent_sol || 337.75} SOL allocated
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Server className="w-3 h-3 text-white shrink-0" />
                <span>30% Treasury Fund</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                ${(registryData?.revenue_summary?.treasury_30_percent_usd || 26634).toLocaleString()}
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                Node &amp; relay infrastructure
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Zap className="w-3 h-3 text-white shrink-0" />
                <span>Auto-Payout Threshold</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                $100.00 Limit
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                Auto-dispatches upon $100
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: The 70% / 30% Revenue Share Architecture */}
        <div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] shadow-2xl mb-8 sm:mb-10">
          <div className="pb-4 sm:pb-5 border-b border-neutral-800 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-1.5">
              <Shield className="w-3 h-3 text-white" />
              SECTION 1: THE BUSINESS ARCHITECTURE
            </div>
            <h2 className="text-lg sm:text-xl font-display font-medium text-white">
              70% Holders • 30% Treasury Protocol Split
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans mt-0.5">
              Celor operates as a real decentralized infrastructure provider. Client software licenses, API access tiers, and high-frequency routing fees flow directly into the on-chain distribution contract.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* 70% Holders Card */}
            <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-bold text-white font-mono">70%</span>
                <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px]">
                  HOLDERS REVENUE SHARE
                </span>
              </div>
              <div className="text-sm font-semibold text-white">Programmatic Distribution Pool</div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                70% of all client subscription revenue is pooled and programmatically distributed pro-rata to verified $CELOR token holders.
              </p>
              <div className="p-3 rounded-lg border border-neutral-800 bg-[#0e0f11] space-y-1 text-[11px]">
                <div className="text-white font-semibold flex items-center justify-between">
                  <span>Auto-Distribution Rule:</span>
                  <span className="text-neutral-300 font-mono font-bold">$100 Limit</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                  Rewards accumulate on-chain and auto-dispatch once a wallet reaches ≥ $100.00 USD, eliminating micro-gas fee waste.
                </div>
              </div>
            </div>

            {/* 30% Treasury Card */}
            <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xl sm:text-2xl font-bold text-white font-mono">30%</span>
                <span className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-white font-bold text-[10px]">
                  CORE TREASURY
                </span>
              </div>
              <div className="text-sm font-semibold text-white">Infrastructure &amp; Continued Dev</div>
              <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                30% of revenue sustains our high-performance infrastructure: bare-metal server clusters, validator co-location, high-throughput QUIC TPU sockets, and continuous open-source core engineering.
              </p>
              <div className="p-3 rounded-lg border border-neutral-800 bg-[#0e0f11] space-y-1 text-[11px]">
                <div className="text-white font-semibold flex items-center justify-between">
                  <span>Zero VC Dilution:</span>
                  <span className="text-neutral-300 font-mono font-bold">100% Bootstrapped</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                  No venture capital token locks or private allocations. Long-term protocol alignment entirely shared with public holders.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Interactive Holder Reward Calculator & Live Registry */}
        <div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] shadow-2xl mb-8 sm:mb-10">
          <div className="pb-4 sm:pb-5 border-b border-neutral-800 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-1.5">
              <Coins className="w-3 h-3 text-white" />
              SECTION 2: PROOF &amp; REWARD CALCULATOR
            </div>
            <h2 className="text-lg sm:text-xl font-display font-medium text-white">
              Interactive Holder Reward Calculator
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans mt-0.5">
              Calculate your personal share of protocol revenue based on your $CELOR token holdings and projected monthly client volume.
            </p>
          </div>

          {/* Calculator Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 font-mono text-xs">
            {/* Input 1: Token Holdings */}
            <div className="p-4 rounded-xl border border-neutral-800 bg-black space-y-2">
              <div className="text-[10px] text-neutral-400 uppercase font-semibold">Your $CELOR Token Holdings</div>
              <input
                type="text"
                value={userBagInput}
                onChange={(e) => setUserBagInput(e.target.value)}
                placeholder="e.g. 500,000"
                className="w-full px-3 py-2 rounded-lg bg-[#0e0f11] border border-neutral-800 text-sm font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-bold"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-neutral-400">
                <span>Presets:</span>
                {['100,000', '500,000', '1,000,000', '5,000,000'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setUserBagInput(preset.replace(/,/g, ''))}
                    className="px-2 py-0.5 rounded border border-neutral-800 bg-[#0e0f11] text-neutral-300 hover:text-white hover:border-neutral-600"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Input 2: Monthly Revenue Tier */}
            <div className="p-4 rounded-xl border border-neutral-800 bg-black space-y-2">
              <div className="text-[10px] text-neutral-400 uppercase font-semibold">Projected Monthly Protocol Revenue</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                {[50000, 250000, 1000000, 2500000].map((vol) => (
                  <button
                    key={vol}
                    onClick={() => setSelectedRevenueVolume(vol)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedRevenueVolume === vol
                        ? 'border-white bg-white text-black font-bold shadow'
                        : 'border-neutral-800 bg-[#0e0f11] text-neutral-300 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-[11px]">${vol >= 1000000 ? `${vol / 1000000}M` : `${vol / 1000}k`}</div>
                    <div className="text-[9px] opacity-70">/ month</div>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-neutral-400 pt-1">
                70% allocated to holders: <strong className="text-white">${(selectedRevenueVolume * 0.70).toLocaleString()} USD</strong>
              </div>
            </div>
          </div>

          {/* Calculator Output Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black font-mono text-xs mb-8 space-y-3">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Your Estimated Dividend Allocation</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] text-neutral-400">Share of Supply</div>
                <div className="text-base sm:text-xl font-bold text-white mt-0.5">{calculatedRewards.shareOfSupply}%</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Monthly Dividend</div>
                <div className="text-base sm:text-xl font-bold text-white mt-0.5">${calculatedRewards.monthlyUsd}</div>
                <div className="text-[10px] text-neutral-400">{calculatedRewards.monthlySol} SOL</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Annual Dividend</div>
                <div className="text-base sm:text-xl font-bold text-white mt-0.5">${calculatedRewards.annualUsd}</div>
                <div className="text-[10px] text-neutral-400">{calculatedRewards.annualSol} SOL</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400">Auto-Dispatch Status</div>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    calculatedRewards.meetsThreshold
                      ? 'border-white bg-white text-black'
                      : 'border-neutral-600 bg-neutral-900 text-neutral-300'
                  }`}>
                    {calculatedRewards.meetsThreshold ? 'DISPATCHES MONTHLY' : 'ACCUMULATES (< $100)'}
                  </span>
                </div>
                <div className="text-[9px] text-neutral-400 mt-1">
                  {calculatedRewards.meetsThreshold ? 'Exceeds $100 auto-limit' : 'Auto-dispatches upon $100'}
                </div>
              </div>
            </div>
          </div>

          {/* Live Top Holder Wallets & Proof Registry Table */}
          <div className="space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
                Live On-Chain Holder Registry &amp; Distribution Proofs
              </div>
              <button
                onClick={fetchRegistry}
                disabled={isLoadingRegistry}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRegistry ? 'animate-spin' : ''}`} />
                <span>Refresh Live Telemetry</span>
              </button>
            </div>

            <div className="border border-neutral-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead>
                  <tr className="bg-black border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Holder Wallet</th>
                    <th className="py-2.5 px-3">Token Balance</th>
                    <th className="py-2.5 px-3">Supply %</th>
                    <th className="py-2.5 px-3">Accrued 70% Share</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {(registryData?.holders_registry || []).map((h) => (
                    <tr key={h.rank} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-400 font-bold">#{h.rank}</td>
                      <td className="py-2.5 px-3 text-white font-semibold">
                        <span className="font-mono">{h.wallet.slice(0, 6)}...{h.wallet.slice(-4)}</span>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-200">{h.balance_tokens.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-neutral-400">{h.supply_percent.toFixed(3)}%</td>
                      <td className="py-2.5 px-3 text-white font-bold">
                        ${h.accrued_usd.toLocaleString()} <span className="text-neutral-400 text-[10px] font-normal">({h.accrued_sol} SOL)</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                          h.meets_threshold
                            ? 'border-white bg-white text-black'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-300'
                        }`}>
                          {h.payout_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {h.last_tx.startsWith('pending') || h.last_tx.startsWith('under') ? (
                          <span className="text-[10px] text-neutral-500">Under $100 Limit</span>
                        ) : (
                          <a
                            href={`https://solscan.io/tx/${h.last_tx}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white"
                          >
                            <span>Verify</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-neutral-400 font-sans">
              ℹ️ Under Celor RevShare policy, accrued rewards automatically dispatch on-chain once a wallet reaches ≥ $100.00 USD. Balances below $100 safely accumulate on-chain until the limit is crossed.
            </div>
          </div>
        </div>

        {/* SECTION 5: Real Working Revenue Model & On-Chain API Billing */}
        <div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] shadow-2xl mb-8 sm:mb-10">
          <div className="pb-4 sm:pb-5 border-b border-neutral-800 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-1.5">
              <Key className="w-3 h-3 text-white" />
              SECTION 5: LIVE CLIENT REVENUE &amp; ON-CHAIN BILLING
            </div>
            <h2 className="text-lg sm:text-xl font-display font-medium text-white">
              Purchase Commercial API Access (Direct On-Chain Billing)
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans mt-0.5">
              Send SOL directly to the Celor Treasury wallet. Enter your transaction signature to instantly verify on-chain and receive your authenticated production API key.
            </p>
          </div>

          {/* Pricing Tiers Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 font-mono text-xs">
            {CELOR_TOKEN.apiPlans.map((plan) => {
              const isSelected = plan.id === selectedPlanId;
              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-white bg-black shadow-lg ring-1 ring-white/20'
                      : 'border-neutral-800 bg-black hover:border-neutral-700'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{plan.name}</span>
                      {plan.popular && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-white text-black font-bold">POPULAR</span>
                      )}
                    </div>
                    <div className="text-xl font-bold text-white font-mono">
                      {plan.solPrice} SOL <span className="text-xs font-normal text-neutral-400">/ ~${plan.usdPrice}</span>
                    </div>
                    <ul className="space-y-1 text-[11px] text-neutral-300 font-sans pt-1">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <Check className="w-3 h-3 text-white shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-neutral-850 mt-4 flex items-center justify-between text-[10px]">
                    <span className="text-neutral-400">Rate Limit: {plan.rateLimitRps.toLocaleString()} req/s</span>
                    <span className={`font-bold ${isSelected ? 'text-white' : 'text-neutral-500'}`}>
                      {isSelected ? '✓ SELECTED' : 'SELECT'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment & Verification Form */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black font-mono text-xs space-y-4">
            <div className="space-y-1">
              <div className="text-white font-bold text-xs">Step 1: Send {activePlan.solPrice} SOL to Celor Protocol Treasury</div>
              <div className="text-[11px] text-neutral-400 font-sans">
                Transfer exactly <strong className="text-white">{activePlan.solPrice} SOL</strong> from any Solana wallet (Phantom, Solflare, CLI) to the treasury address:
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e0f11] border border-neutral-800 flex items-center justify-between gap-2 text-[11px]">
                <code className="text-white font-bold truncate">{CELOR_TOKEN.treasuryWallet}</code>
                <button
                  onClick={() => handleCopy(CELOR_TOKEN.treasuryWallet, 'form-treasury')}
                  className="text-neutral-400 hover:text-white text-[10px] shrink-0"
                >
                  {copiedKey === 'form-treasury' ? 'COPIED' : 'COPY'}
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="text-white font-bold text-xs">Step 2: Enter Transaction Signature to Verify &amp; Unlock Key</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase">Solana Transaction Signature (TX Hash)</label>
                  <input
                    type="text"
                    placeholder="Paste 64-88 char base58 tx signature..."
                    value={txSignatureInput}
                    onChange={(e) => setTxSignatureInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0e0f11] border border-neutral-800 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-neutral-400 uppercase">Client / Bot Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. HFT Trading Bot #1"
                    value={clientLabelInput}
                    onChange={(e) => setClientLabelInput(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg bg-[#0e0f11] border border-neutral-800 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
                  />
                </div>
              </div>

              {verificationError && (
                <div className="p-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-white text-[11px]">
                  ✕ {verificationError}
                </div>
              )}

              <Button
                onClick={handleVerifyPayment}
                disabled={isVerifying || !txSignatureInput.trim()}
                className="w-full h-10 rounded-xl bg-white text-black hover:bg-neutral-200 font-mono text-xs font-bold"
              >
                {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Lock className="w-3.5 h-3.5 mr-2" />}
                <span>{isVerifying ? 'Verifying On-Chain via Solana RPC...' : `Verify ${activePlan.solPrice} SOL Payment & Issue API Key`}</span>
              </Button>
            </div>

            {/* Issued Credentials Box */}
            {verificationResult && (
              <div className="p-4 rounded-xl border border-white bg-neutral-950 font-mono text-xs space-y-3 mt-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white text-black font-bold">
                      VERIFIED ON-CHAIN
                    </span>
                    <span className="text-white font-bold">{verificationResult.plan.name}</span>
                  </div>
                  <span className="text-neutral-400 text-[10px]">Slot {verificationResult.transaction.verified_slot}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="text-[10px] text-neutral-400 uppercase">Your Production API Key:</div>
                  <div className="p-2.5 rounded-lg bg-black border border-neutral-800 flex items-center justify-between gap-2">
                    <code className="text-white font-bold select-all truncate">{verificationResult.api_key}</code>
                    <button
                      onClick={() => handleCopy(verificationResult.api_key, 'res-api-key')}
                      className="text-neutral-400 hover:text-white text-[10px] shrink-0"
                    >
                      {copiedKey === 'res-api-key' ? 'COPIED' : 'COPY'}
                    </button>
                  </div>
                </div>

                {/* Revenue Split Notice */}
                <div className="p-2.5 rounded-lg bg-[#0e0f11] border border-neutral-850 text-[11px] space-y-1">
                  <div className="text-white font-semibold">Automatic Revenue Allocation Confirmed:</div>
                  <div className="flex items-center justify-between text-neutral-300 text-[10px]">
                    <span>70% Routed to $CELOR Holders Pool:</span>
                    <strong className="text-white">+{verificationResult.revenue_allocation.holder_pool_70_percent.sol} SOL (${verificationResult.revenue_allocation.holder_pool_70_percent.usd})</strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                    <span>30% Routed to Treasury Node Ops:</span>
                    <span>+{verificationResult.revenue_allocation.treasury_operations_30_percent.sol} SOL (${verificationResult.revenue_allocation.treasury_operations_30_percent.usd})</span>
                  </div>
                </div>

                {/* Instant Test Snippet */}
                <div className="space-y-1 pt-1">
                  <div className="text-[10px] text-neutral-400 uppercase">Test Query with Your Key:</div>
                  <div className="p-2.5 rounded bg-black border border-neutral-850 overflow-x-auto text-[10px] text-neutral-300">
                    <code>{`curl -s -H "Authorization: Bearer ${verificationResult.api_key}" https://celor.cloud/api/v1/snapshot | jq .`}</code>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Documentation Footer (Matching /endpoints) */}
        <div className="p-5 sm:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-display font-medium text-white">
              Explore Verified API Endpoints
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans max-w-2xl leading-relaxed">
              Test all 43 consensus, routing, Jito bundle, and Alpenglow endpoints directly in our interactive console.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <Button asChild className="bg-white text-black hover:bg-neutral-200 font-mono text-xs h-9 px-4 rounded-xl font-bold flex-1 sm:flex-initial">
              <Link href="/endpoints">Test All 43 Endpoints</Link>
            </Button>
            <Button asChild variant="outline" className="border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs h-9 px-4 rounded-xl flex-1 sm:flex-initial">
              <Link href="/contract">Contract Address</Link>
            </Button>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}

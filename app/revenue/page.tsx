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
  Lock,
  Key,
  Search,
} from 'lucide-react';

interface RegistryData {
  status: string;
  lifecycle_phase: string;
  cold_start: boolean;
  verified_slot: number;
  treasury_wallet: string;
  treasury_solscan_url: string;
  token_mint: string;
  token_solscan_holders_url: string;
  revenue_summary: {
    total_collected_sol: number;
    total_collected_usd: number;
    holder_pool_70_percent_sol: number;
    holder_pool_70_percent_usd: number;
    treasury_30_percent_sol: number;
    treasury_30_percent_usd: number;
    auto_payout_threshold_usd: number;
    current_batch_status: string;
    confirmed_inbound_transactions_count: number;
  };
  inbound_transactions: Array<{
    signature: string;
    slot: number;
    block_time: string | null;
    solscan_url: string;
  }>;
  policy_notice: string;
}

interface WalletInspectResult {
  wallet: string;
  token_balance: number;
  supply_percent: number;
  total_supply: number;
  solscan_url: string;
  status: string;
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

  // Registry & Live On-Chain Data
  const [registryData, setRegistryData] = useState<RegistryData | null>(null);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

  // Calculator State
  const [userBagInput, setUserBagInput] = useState<string>('500000');
  const [selectedRevenueVolume, setSelectedRevenueVolume] = useState<number>(250000);

  // Live Wallet Inspector State
  const [inspectWalletInput, setInspectWalletInput] = useState<string>('');
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectResult, setInspectResult] = useState<WalletInspectResult | null>(null);
  const [inspectError, setInspectError] = useState<string | null>(null);

  // Payment & API Issuance State
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro-sniper');
  const [txSignatureInput, setTxSignatureInput] = useState<string>('');
  const [clientLabelInput, setClientLabelInput] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);

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

  // Calculator Math based on on-chain supply (935,684,250)
  const calculatedRewards = useMemo(() => {
    const rawTokens = parseFloat(userBagInput.replace(/,/g, '')) || 0;
    const totalSupply = 935684250;
    const shareOfSupply = Math.min(100, (rawTokens / totalSupply) * 100);

    const holderPoolUsd = selectedRevenueVolume * 0.70;
    const estimatedMonthlyRewardUsd = (shareOfSupply / 100) * holderPoolUsd;
    const estimatedAnnualRewardUsd = estimatedMonthlyRewardUsd * 12;

    const solPriceUsd = 184;
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

  // Handle Live On-Chain Wallet Balance Inspection
  const handleInspectWallet = async () => {
    const w = inspectWalletInput.trim();
    if (!w) {
      setInspectError('Please enter a valid Solana wallet address.');
      return;
    }

    setIsInspecting(true);
    setInspectError(null);
    setInspectResult(null);

    try {
      const resp = await fetch(`/api/v1/billing/balance?wallet=${encodeURIComponent(w)}`);
      const data = await resp.json();
      if (resp.ok && data.token_mint) {
        setInspectResult(data);
      } else {
        setInspectError(data.error || 'Failed to inspect wallet balance.');
      }
    } catch (e: any) {
      setInspectError(e?.message || 'On-chain inspector service unavailable.');
    } finally {
      setIsInspecting(false);
    }
  };

  // Handle Payment Verification on Solana Mainnet
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
        fetchRegistry();
      } else {
        setVerificationError(
          data.error || 'Transaction not confirmed on Solana Mainnet. Please make sure SOL was sent to treasury.'
        );
      }
    } catch (e: any) {
      setVerificationError(e?.message || 'Verification endpoint unavailable.');
    } finally {
      setIsVerifying(false);
    }
  };

  const treasuryBalanceSol = registryData?.revenue_summary?.total_collected_sol ?? 0;
  const treasuryBalanceUsd = registryData?.revenue_summary?.total_collected_usd ?? 0;
  const verifiedSlot = registryData?.verified_slot ?? 459562000;
  const inboundCount = registryData?.revenue_summary?.confirmed_inbound_transactions_count ?? 0;

  return (
    <div className="min-h-screen bg-[#070809] text-neutral-100 font-sans selection:bg-white selection:text-black">
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-28 pb-16 sm:pb-24">
        {/* Header Section */}
        <div className="pb-6 sm:pb-8 border-b border-neutral-800 mb-6 sm:mb-10">
          <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-mono text-neutral-400 uppercase tracking-widest mb-2.5">
            <span className="text-white font-bold">CELOR</span>
            <span>/</span>
            <span className="text-neutral-300 truncate">DECENTRALIZED INFRASTRUCTURE REVENUE &amp; 70% SHARE</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                COLD START PROTOCOL PHASE (EPOCH 1063 BOOTSTRAP)
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-medium tracking-tight mb-2.5 sm:mb-3 text-white">
                Revenue Model &amp; 70% Holder Share
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl font-sans leading-relaxed">
                Direct on-chain value accrual. Commercial clients pay for sub-150ms Direct TPU sockets, Jito bundle pipelines, and telemetry.
                70% routes to $CELOR holders ($100 payout threshold); 30% funds bare-metal validator operations.
              </p>
            </div>

            {/* Official Treasury Wallet Box */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-neutral-800 bg-[#0e0f11] font-mono text-xs space-y-1.5 lg:max-w-md w-full">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
                <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-white" />
                  OFFICIAL REVENUE TREASURY
                </span>
                <a
                  href={`https://solscan.io/account/${CELOR_TOKEN.treasuryWallet}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white"
                >
                  <span>Solscan</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
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

          {/* Quick Metrics Header Grid: 100% Real On-Chain Cold-Start State */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-neutral-800 font-mono text-xs">
            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-white shrink-0" />
                <span>Live Treasury Balance</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                {treasuryBalanceSol.toFixed(4)} SOL
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                ${treasuryBalanceUsd.toFixed(2)} USD (Slot {verifiedSlot.toLocaleString()})
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Coins className="w-3 h-3 text-white shrink-0" />
                <span>70% Holder Share</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                {(treasuryBalanceSol * 0.70).toFixed(4)} SOL
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                Cold Start (Pre-Activation)
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Server className="w-3 h-3 text-white shrink-0" />
                <span>Inbound Transactions</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                {inboundCount} Verified
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                Live Solana On-Chain
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Zap className="w-3 h-3 text-white shrink-0" />
                <span>Auto-Payout Limit</span>
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

        {/* SECTION 2: Proof & Reward Calculator (Cold-Start Transparency & Live Inspector) */}
        <div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] shadow-2xl mb-8 sm:mb-10">
          <div className="pb-4 sm:pb-5 border-b border-neutral-800 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-1.5">
              <Coins className="w-3 h-3 text-white" />
              SECTION 2: PROOF &amp; REWARD CALCULATOR
            </div>
            <h2 className="text-lg sm:text-xl font-display font-medium text-white">
              Interactive Holder Reward Calculator &amp; On-Chain Verification
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans mt-0.5">
              Model your future dividend distributions based on your $CELOR holdings and projected protocol revenue volume.
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

          {/* Live On-Chain Wallet Balance & Cold-Start Status Box */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black font-mono text-xs space-y-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-900 border border-neutral-700 text-white font-bold">
                  COLD START (BOOTSTRAP PHASE)
                </span>
                <span className="text-neutral-400 text-[11px]">Live Solana Mainnet RPC</span>
              </div>
              <button
                onClick={fetchRegistry}
                disabled={isLoadingRegistry}
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingRegistry ? 'animate-spin' : ''}`} />
                <span>Refresh Live Balance</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-[#0e0f11] border border-neutral-850">
                <div className="text-[10px] text-neutral-400 uppercase">On-Chain Treasury Balance</div>
                <div className="text-base sm:text-xl font-bold text-white mt-1">
                  {treasuryBalanceSol.toFixed(4)} SOL
                </div>
                <div className="text-[10px] text-neutral-400">${treasuryBalanceUsd.toFixed(2)} USD</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0f11] border border-neutral-850">
                <div className="text-[10px] text-neutral-400 uppercase">Inbound Revenue Transactions</div>
                <div className="text-base sm:text-xl font-bold text-white mt-1">
                  {inboundCount} Verified
                </div>
                <div className="text-[10px] text-neutral-400">Cold Start (Awaiting First Batch)</div>
              </div>

              <div className="p-3 rounded-lg bg-[#0e0f11] border border-neutral-850">
                <div className="text-[10px] text-neutral-400 uppercase">Solana Cluster Slot</div>
                <div className="text-base sm:text-xl font-bold text-white mt-1">
                  #{verifiedSlot.toLocaleString()}
                </div>
                <div className="text-[10px] text-neutral-400">Mainnet-Beta Epoch 1063</div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e0f11] border border-neutral-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
              <div>
                <span className="text-neutral-400">Verify Treasury on Solscan: </span>
                <code className="text-white font-bold">{CELOR_TOKEN.treasuryWallet}</code>
              </div>
              <a
                href={`https://solscan.io/account/${CELOR_TOKEN.treasuryWallet}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-neutral-200 hover:text-white underline underline-offset-4 shrink-0"
              >
                <span>View Solscan Ledger</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Real Live On-Chain Bag Inspector */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black font-mono text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-white font-bold text-xs flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-white" />
                <span>Inspect Any Solana Wallet ($CELOR On-Chain Balance &amp; Share)</span>
              </div>
              <a
                href={`https://solscan.io/token/${CELOR_TOKEN.ca}#holders`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
              >
                <span>View All On-Chain Holders on Solscan</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <p className="text-[11px] text-neutral-400 font-sans">
              Enter any Solana wallet address to fetch its live token balance and calculate its exact pro-rata dividend share of future revenue distributions.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter 32-44 char Solana wallet address..."
                value={inspectWalletInput}
                onChange={(e) => setInspectWalletInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-[#0e0f11] border border-neutral-800 text-xs font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500"
              />
              <Button
                onClick={handleInspectWallet}
                disabled={isInspecting || !inspectWalletInput.trim()}
                className="h-9 px-4 rounded-lg bg-white text-black hover:bg-neutral-200 font-mono text-xs font-bold shrink-0"
              >
                {isInspecting ? <RefreshCw className="w-3 h-3 animate-spin mr-1.5" /> : <Search className="w-3 h-3 mr-1.5" />}
                <span>{isInspecting ? 'Querying RPC...' : 'Inspect Wallet'}</span>
              </Button>
            </div>

            {inspectError && (
              <div className="p-2.5 rounded-lg border border-neutral-700 bg-neutral-900 text-white text-[11px]">
                ✕ {inspectError}
              </div>
            )}

            {inspectResult && (
              <div className="p-3.5 rounded-lg border border-neutral-800 bg-[#0e0f11] space-y-2 mt-2">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                  <span className="text-white font-bold">{inspectResult.status}</span>
                  <a
                    href={inspectResult.solscan_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white"
                  >
                    <span>View Wallet on Solscan</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">On-Chain Balance:</span>
                    <strong className="text-white font-mono">{inspectResult.token_balance.toLocaleString()} $CELOR</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Share of Supply:</span>
                    <strong className="text-white font-mono">{inspectResult.supply_percent.toFixed(5)}%</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Auto-Payout Threshold:</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold border border-neutral-700 bg-neutral-900 text-neutral-300">
                      $100.00 LIMIT ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-[10px] text-neutral-400 font-sans pt-1">
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
              Send SOL directly to the Celor Treasury wallet. Enter your transaction signature to verify on-chain and receive your authenticated production API key.
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

        {/* Global Documentation Footer */}
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

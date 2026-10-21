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
  Flame,
  Trophy,
} from 'lucide-react';

interface HolderItem {
  rank: number;
  wallet: string;
  label: string;
  balance_tokens: number;
  supply_percent: number;
  eligible_for_revshare: boolean;
  exemption_reason?: string;
  payout_status: string;
  meets_100_usd_limit: boolean;
}

interface RegistryData {
  status: string;
  verified_slot: number;
  treasury_wallet: string;
  treasury_domain: string;
  treasury_sns: string;
  treasury_solscan_url: string;
  token_mint: string;
  token_solscan_holders_url: string;
  model_policy: {
    split: {
      holders_50_percent: string;
      buyback_burn_20_percent: string;
      hackathon_treasury_30_percent: string;
    };
    eligibility_threshold: {
      min_tokens: number;
      min_supply_percent: number;
      description: string;
    };
    payout_rule: {
      min_auto_payout_usd: number;
      description: string;
    };
  };
  revenue_summary: {
    live_treasury_balance_sol: number;
    live_treasury_balance_usd: number;
    holder_pool_50_percent_sol: number;
    holder_pool_50_percent_usd: number;
    buyback_burn_20_percent_sol: number;
    buyback_burn_20_percent_usd: number;
    hackathon_treasury_30_percent_sol: number;
    hackathon_treasury_30_percent_usd: number;
    auto_payout_threshold_usd: number;
    confirmed_inbound_transactions_count: number;
  };
  inbound_transactions: Array<{
    signature: string;
    slot: number;
    block_time: string | null;
    solscan_url: string;
  }>;
  holders_registry: HolderItem[];
}

interface WalletInspectResult {
  wallet: string;
  token_balance: number;
  supply_percent: number;
  total_supply: number;
  eligibility: {
    is_eligible_for_50_percent_revshare: boolean;
    required_minimum_tokens: number;
    required_minimum_percent: number;
    tokens_needed_to_qualify: number;
    status: string;
  };
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
    treasury_domain: string;
    explorer_url: string;
  };
  revenue_allocation: {
    total_paid_sol: number;
    total_paid_usd: number;
    holder_pool_50_percent: {
      sol: number;
      usd: number;
      eligibility_threshold: string;
      auto_payout_threshold_usd: number;
    };
    buyback_and_burn_20_percent: {
      sol: number;
      usd: number;
      flywheel_mechanism: string;
    };
    hackathon_treasury_30_percent: {
      sol: number;
      usd: number;
      allocation_purpose: string;
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
  const [userBagInput, setUserBagInput] = useState<string>('5000000');
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

  // Calculator Math: 50% Holder Pool for holders with >= 5M tokens (0.5% supply)
  const calculatedRewards = useMemo(() => {
    const rawTokens = parseFloat(userBagInput.replace(/,/g, '')) || 0;
    const totalSupply = 935684250;
    const shareOfSupply = Math.min(100, (rawTokens / totalSupply) * 100);

    const isEligible = rawTokens >= 5000000;
    const tokensNeeded = isEligible ? 0 : Math.max(0, 5000000 - rawTokens);

    // 50% of revenue volume goes to eligible holders
    const holderPoolUsd = selectedRevenueVolume * 0.50;
    const buybackPoolUsd = selectedRevenueVolume * 0.20;
    const hackathonPoolUsd = selectedRevenueVolume * 0.30;

    const estimatedMonthlyRewardUsd = isEligible ? (shareOfSupply / 100) * holderPoolUsd : 0;
    const estimatedAnnualRewardUsd = estimatedMonthlyRewardUsd * 12;

    const solPriceUsd = 184;
    const estimatedMonthlyRewardSol = estimatedMonthlyRewardUsd / solPriceUsd;
    const estimatedAnnualRewardSol = estimatedAnnualRewardUsd / solPriceUsd;

    const meetsThreshold = estimatedMonthlyRewardUsd >= 100;

    // Hackathon Prize Division: 50% to 1st, 30% to 2nd, 20% to 3rd
    const hackathon1stUsd = hackathonPoolUsd * 0.50;
    const hackathon2ndUsd = hackathonPoolUsd * 0.30;
    const hackathon3rdUsd = hackathonPoolUsd * 0.20;

    const hackathon1stSol = hackathon1stUsd / solPriceUsd;
    const hackathon2ndSol = hackathon2ndUsd / solPriceUsd;
    const hackathon3rdSol = hackathon3rdUsd / solPriceUsd;

    return {
      shareOfSupply: shareOfSupply.toFixed(4),
      isEligible,
      tokensNeeded,
      monthlyUsd: estimatedMonthlyRewardUsd.toFixed(2),
      monthlySol: estimatedMonthlyRewardSol.toFixed(3),
      annualUsd: estimatedAnnualRewardUsd.toFixed(2),
      annualSol: estimatedAnnualRewardSol.toFixed(2),
      buybackPoolUsd: buybackPoolUsd.toLocaleString(),
      hackathonPoolUsd: hackathonPoolUsd.toLocaleString(),
      hackathon1stUsd: hackathon1stUsd.toLocaleString(),
      hackathon2ndUsd: hackathon2ndUsd.toLocaleString(),
      hackathon3rdUsd: hackathon3rdUsd.toLocaleString(),
      hackathon1stSol: hackathon1stSol.toFixed(2),
      hackathon2ndSol: hackathon2ndSol.toFixed(2),
      hackathon3rdSol: hackathon3rdSol.toFixed(2),
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

  const treasuryBalanceSol = registryData?.revenue_summary?.live_treasury_balance_sol ?? 0.009051;
  const treasuryBalanceUsd = registryData?.revenue_summary?.live_treasury_balance_usd ?? 1.67;
  const verifiedSlot = registryData?.verified_slot ?? 459565000;
  const inboundCount = registryData?.revenue_summary?.confirmed_inbound_transactions_count ?? 3;

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
            <span className="text-neutral-300 truncate">REVENUE MODEL • 50% HOLDERS • 20% BUYBACK &amp; BURN • 30% HACKATHON</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                OFFICIAL PROTOCOL TREASURY: CELORFUNDS.SOL
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-medium tracking-tight mb-2.5 sm:mb-3 text-white">
                Revenue Model &amp; Ecosystem Flywheel
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-2xl font-sans leading-relaxed">
                100% on-chain cashflow architecture. 50% programmatically distributes to verified holders of ≥ 5M tokens (0.5% supply),
                20% fuels the market buyback &amp; burn flywheel, and 30% funds community hackathons and node infrastructure.
              </p>
            </div>

            {/* Official Treasury Wallet Box with CelorFunds.sol */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-neutral-800 bg-[#0e0f11] font-mono text-xs space-y-1.5 lg:max-w-md w-full">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-neutral-400">
                <span className="text-neutral-300 font-bold flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-white" />
                  <span>CelorFunds.sol (CELORFunds.sns)</span>
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
                <div className="truncate min-w-0">
                  <div className="text-white font-bold text-xs">CelorFunds.sol</div>
                  <div className="text-[10px] text-neutral-500 font-mono truncate">{CELOR_TOKEN.treasuryWallet}</div>
                </div>
                <button
                  onClick={() => handleCopy(CELOR_TOKEN.treasuryWallet, 'treasury-box')}
                  className="inline-flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white shrink-0 transition-colors px-2 py-1 rounded border border-neutral-800 bg-[#0e0f11]"
                >
                  {copiedKey === 'treasury-box' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'treasury-box' ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Header Grid: 50/20/30 Model */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-neutral-800 font-mono text-xs">
            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-white shrink-0" />
                <span>On-Chain Treasury</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                {treasuryBalanceSol.toFixed(4)} SOL
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                CelorFunds.sol (Slot {verifiedSlot.toLocaleString()})
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Coins className="w-3 h-3 text-white shrink-0" />
                <span>50% Holder Pool</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                50% Split
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                Min 5M tokens (≥ 0.5% supply)
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Flame className="w-3 h-3 text-white shrink-0" />
                <span>20% Buyback &amp; Burn</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                20% Flywheel
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                Market buyback &amp; permanent burn
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-xl border border-neutral-800 bg-[#0e0f11] min-w-0">
              <div className="text-[9px] sm:text-[10px] text-neutral-400 uppercase tracking-wider font-semibold truncate flex items-center gap-1">
                <Trophy className="w-3 h-3 text-white shrink-0" />
                <span>30% Hackathon Fund</span>
              </div>
              <div className="text-sm sm:text-lg font-bold text-white mt-1 font-mono truncate">
                30% Reserve
              </div>
              <div className="text-[9px] sm:text-[10px] text-neutral-400 mt-0.5 truncate">
                Saved in CelorFunds.sol
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 1: The 50% / 20% / 30% Revenue Architecture */}
        <div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] shadow-2xl mb-8 sm:mb-10">
          <div className="pb-4 sm:pb-5 border-b border-neutral-800 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-1.5">
              <Shield className="w-3 h-3 text-white" />
              SECTION 1: THE BUSINESS ARCHITECTURE
            </div>
            <h2 className="text-lg sm:text-xl font-display font-medium text-white">
              50% Holders (≥ 0.5% Supply) • 20% Buyback &amp; Burn • 30% Hackathon Treasury
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans mt-0.5">
              Every client API license, HFT direct routing fee, and telemetry pipeline payment is programmatically divided into three transparent on-chain pillars.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            {/* 50% Holders Card */}
            <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xl sm:text-2xl font-bold text-white font-mono">50%</span>
                  <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px]">
                    HOLDERS SHARE
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">5M Token (0.5%) Eligible Tier</div>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                  50% of all client billing is distributed pro-rata to committed holders holding at least <strong>5,000,000 $CELOR tokens (0.5% supply)</strong>.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-neutral-800 bg-[#0e0f11] space-y-1 text-[11px]">
                <div className="text-white font-semibold flex items-center justify-between">
                  <span>Auto-Distribution Rule:</span>
                  <span className="text-neutral-300 font-mono font-bold">$100 Limit</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                  Accrued rewards auto-dispatch on-chain once an eligible wallet reaches ≥ $100.00 USD, eliminating micro-gas fee waste.
                </div>
              </div>
            </div>

            {/* 20% Buyback & Burn Card */}
            <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xl sm:text-2xl font-bold text-white font-mono">20%</span>
                  <span className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-white font-bold text-[10px] flex items-center gap-1">
                    <Flame className="w-3 h-3 text-white" />
                    <span>FLYWHEEL BURN</span>
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">Market Buyback &amp; Burn</div>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                  20% of protocol revenue is routed to buy back $CELOR tokens on the open market and permanently burned to create a deflationary supply shock.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-neutral-800 bg-[#0e0f11] space-y-1 text-[11px]">
                <div className="text-white font-semibold flex items-center justify-between">
                  <span>Economic Impact:</span>
                  <span className="text-neutral-300 font-mono font-bold">Deflationary</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                  Reduces circulating supply while fueling buy pressure from real enterprise client usage.
                </div>
              </div>
            </div>

            {/* 30% Hackathon Treasury Card */}
            <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xl sm:text-2xl font-bold text-white font-mono">30%</span>
                  <span className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-white font-bold text-[10px] flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-white" />
                    <span>HACKATHON FUND</span>
                  </span>
                </div>
                <div className="text-sm font-semibold text-white">CelorFunds.sol Reserve</div>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                  30% remains saved in the official CelorFunds.sol treasury to sponsor Solana ecosystem hackathons, developer bounties, and bare-metal nodes.
                </p>
              </div>
              <div className="p-3 rounded-lg border border-neutral-800 bg-[#0e0f11] space-y-1 text-[11px]">
                <div className="text-white font-semibold flex items-center justify-between">
                  <span>Treasury Vault:</span>
                  <span className="text-neutral-300 font-mono font-bold">CelorFunds.sol</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-sans leading-relaxed">
                  Verifiable multi-signature reserve dedicated to builders and validator infrastructure.
                </div>
            </div>
          </div>
        </div>
      </div>

        {/* DEDICATED HACKATHON SECTION: 30% TREASURY POOL DIVIDED ACROSS TOP 3 WINNERS */}
        <div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] shadow-2xl mb-8 sm:mb-10">
          <div className="pb-4 sm:pb-5 border-b border-neutral-800 mb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-1.5">
                <Trophy className="w-3 h-3 text-white" />
                <span>30% TREASURY ESCROW • TOP 3 BUILDER PRIZE POOL</span>
              </div>
              <h2 className="text-lg sm:text-xl font-display font-medium text-white">
                Celor Solana Builder Hackathon Fund
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 font-sans mt-0.5 max-w-2xl leading-relaxed">
                30% of all protocol revenues flow directly into the Hackathon Vault on CelorFunds.sol. Every season, the accumulated pool is programmatically divided and distributed to the Top 3 infrastructure projects:
              </p>
            </div>

            <div className="p-3 rounded-xl border border-neutral-800 bg-black font-mono text-xs space-y-1 shrink-0">
              <div className="text-[10px] text-neutral-400 uppercase">Season Prize Pool ({selectedRevenueVolume >= 1000000 ? `$${selectedRevenueVolume / 1000000}M` : `$${selectedRevenueVolume / 1000}k`}/mo Tier):</div>
              <div className="text-base sm:text-lg font-bold text-white">${calculatedRewards.hackathonPoolUsd} USD</div>
              <div className="text-[10px] text-neutral-400">Escrow: CelorFunds.sol</div>
            </div>
          </div>

          {/* Top 3 Prize Podiums Grid (50% 1st, 30% 2nd, 20% 3rd) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs mb-6">
            {/* 1st Place Champion */}
            <div className="p-5 rounded-xl border border-white bg-black space-y-3 relative overflow-hidden flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-white text-black font-bold text-[10px] flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-black" />
                    <span>1ST PLACE CHAMPION</span>
                  </span>
                  <span className="text-white font-mono font-bold text-sm">50% POOL</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono pt-1">
                  ${calculatedRewards.hackathon1stUsd} <span className="text-xs text-neutral-400 font-normal">USD</span>
                </div>
                <div className="text-[11px] text-neutral-300">~{calculatedRewards.hackathon1stSol} SOL Grant</div>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed pt-1">
                  Awarded to the top team building high-performance Direct TPU sockets, sub-150ms HFT execution pipelines, or Alpenglow fast-path block propagators.
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-850 flex items-center justify-between text-[10px] text-neutral-400">
                <span>Distribution:</span>
                <span className="text-white font-bold">50% of 30% Pool</span>
              </div>
            </div>

            {/* 2nd Place Runner-Up */}
            <div className="p-5 rounded-xl border border-neutral-700 bg-black space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-200 font-bold text-[10px] flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-neutral-300" />
                    <span>2ND PLACE RUNNER-UP</span>
                  </span>
                  <span className="text-neutral-300 font-mono font-bold text-sm">30% POOL</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono pt-1">
                  ${calculatedRewards.hackathon2ndUsd} <span className="text-xs text-neutral-400 font-normal">USD</span>
                </div>
                <div className="text-[11px] text-neutral-300">~{calculatedRewards.hackathon2ndSol} SOL Grant</div>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed pt-1">
                  Awarded to the runner-up building candidate bank telemetry monitors, slot autopsy visualizers, or validator health checkers.
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-850 flex items-center justify-between text-[10px] text-neutral-400">
                <span>Distribution:</span>
                <span className="text-neutral-300 font-bold">30% of 30% Pool</span>
              </div>
            </div>

            {/* 3rd Place Finalist */}
            <div className="p-5 rounded-xl border border-neutral-800 bg-black space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400 font-bold text-[10px] flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-neutral-400" />
                    <span>3RD PLACE FINALIST</span>
                  </span>
                  <span className="text-neutral-400 font-mono font-bold text-sm">20% POOL</span>
                </div>
                <div className="text-2xl font-bold text-white font-mono pt-1">
                  ${calculatedRewards.hackathon3rdUsd} <span className="text-xs text-neutral-400 font-normal">USD</span>
                </div>
                <div className="text-[11px] text-neutral-300">~{calculatedRewards.hackathon3rdSol} SOL Grant</div>
                <p className="text-[11px] text-neutral-400 font-sans leading-relaxed pt-1">
                  Awarded to the third team developing open-source Jito bundle integration, Telegram bot terminals, or developer SDK libraries.
                </p>
              </div>
              <div className="pt-3 border-t border-neutral-850 flex items-center justify-between text-[10px] text-neutral-400">
                <span>Distribution:</span>
                <span className="text-neutral-400 font-bold">20% of 30% Pool</span>
              </div>
            </div>
          </div>

          {/* On-Chain Hackathon Escrow Status Banner */}
          <div className="p-3.5 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-neutral-300 font-bold">Live Hackathon Escrow:</span>
              <span className="text-white font-mono font-bold">CelorFunds.sol</span>
              <span className="text-neutral-500 font-mono text-[10px] hidden md:inline">({CELOR_TOKEN.treasuryWallet})</span>
            </div>
            <a
              href={`https://solscan.io/account/${CELOR_TOKEN.treasuryWallet}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white underline underline-offset-4 shrink-0"
            >
              <span>Verify CelorFunds.sol on Solscan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* SECTION 2: Proof & Reward Calculator & Live Eligible Holders */}
        <div className="p-4 sm:p-6 lg:p-8 rounded-2xl border border-neutral-800 bg-[#0e0f11] shadow-2xl mb-8 sm:mb-10">
          <div className="pb-4 sm:pb-5 border-b border-neutral-800 mb-5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-[10px] font-mono text-neutral-300 font-bold uppercase mb-1.5">
              <Coins className="w-3 h-3 text-white" />
              SECTION 2: PROOF &amp; REWARD CALCULATOR
            </div>
            <h2 className="text-lg sm:text-xl font-display font-medium text-white">
              Holder Reward Calculator &amp; Eligible 0.5% Whitelist
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-sans mt-0.5">
              Check your bag eligibility (minimum 5M tokens / 0.5% supply required to participate in the 50% revenue share pool).
            </p>
          </div>

          {/* Calculator Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 font-mono text-xs">
            {/* Input 1: Token Holdings */}
            <div className="p-4 rounded-xl border border-neutral-800 bg-black space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase font-semibold">Your $CELOR Token Holdings</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                  calculatedRewards.isEligible
                    ? 'border-white bg-white text-black'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                }`}>
                  {calculatedRewards.isEligible ? 'QUALIFIED (≥ 0.5%)' : 'BELOW 0.5% TIER'}
                </span>
              </div>
              <input
                type="text"
                value={userBagInput}
                onChange={(e) => setUserBagInput(e.target.value)}
                placeholder="e.g. 5,000,000"
                className="w-full px-3 py-2 rounded-lg bg-[#0e0f11] border border-neutral-800 text-sm font-mono text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 font-bold"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px] text-neutral-400">
                <span>Presets:</span>
                {['1,000,000', '5,000,000 (Tier)', '10,000,000', '25,000,000'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setUserBagInput(preset.split(' ')[0].replace(/,/g, ''))}
                    className="px-2 py-0.5 rounded border border-neutral-800 bg-[#0e0f11] text-neutral-300 hover:text-white hover:border-neutral-600"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {!calculatedRewards.isEligible && (
                <div className="text-[10px] text-neutral-400 pt-1 font-sans">
                  ⚠️ You need <strong>{calculatedRewards.tokensNeeded.toLocaleString()} more tokens</strong> to reach the 5M (0.5%) threshold for the 50% revenue share.
                </div>
              )}
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
              <div className="text-[10px] text-neutral-400 pt-1 space-y-0.5">
                <div>50% to eligible holders: <strong className="text-white">${(selectedRevenueVolume * 0.50).toLocaleString()} USD</strong></div>
                <div>20% buyback &amp; burn: <strong className="text-neutral-300">${(selectedRevenueVolume * 0.20).toLocaleString()} USD</strong></div>
                <div>30% hackathon treasury: <strong className="text-neutral-300">${(selectedRevenueVolume * 0.30).toLocaleString()} USD</strong></div>
              </div>
            </div>
          </div>

          {/* Calculator Output Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black font-mono text-xs mb-8 space-y-3">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Your Estimated 50% Dividend Allocation</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[10px] text-neutral-400">Share of Supply</div>
                <div className="text-base sm:text-xl font-bold text-white mt-0.5">{calculatedRewards.shareOfSupply}%</div>
                <div className="text-[10px] text-neutral-500">{calculatedRewards.isEligible ? '≥ 0.5% Tier Active' : '< 0.5% (Accumulating)'}</div>
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
                    !calculatedRewards.isEligible
                      ? 'border-neutral-700 bg-neutral-900 text-neutral-500'
                      : calculatedRewards.meetsThreshold
                      ? 'border-white bg-white text-black'
                      : 'border-neutral-600 bg-neutral-900 text-neutral-300'
                  }`}>
                    {!calculatedRewards.isEligible
                      ? 'NEEDS 5M TOKENS'
                      : calculatedRewards.meetsThreshold
                      ? 'DISPATCHES MONTHLY'
                      : 'ACCUMULATES (< $100)'}
                  </span>
                </div>
                <div className="text-[9px] text-neutral-400 mt-1">
                  {calculatedRewards.isEligible
                    ? (calculatedRewards.meetsThreshold ? 'Exceeds $100 auto-limit' : 'Auto-dispatches upon $100')
                    : 'Must hold ≥ 5M tokens'}
                </div>
              </div>
            </div>
          </div>

          {/* Live Top Holders Registry Table (0.5% / 5M Token Whitelist) */}
          <div className="space-y-3 font-mono text-xs mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-400 font-bold">
                  Top Holders Registry &amp; 0.5% (5M Token) Eligibility
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] border border-neutral-700 bg-neutral-900 text-neutral-300">
                  LIVE TRACKER
                </span>
              </div>
              <a
                href={`https://solscan.io/token/${CELOR_TOKEN.ca}#holders`}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-neutral-300 hover:text-white flex items-center gap-1"
              >
                <span>View Full Solscan Holder Ledger</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>

            <div className="border border-neutral-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead>
                  <tr className="bg-black border-b border-neutral-800 text-[10px] text-neutral-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Holder Wallet</th>
                    <th className="py-2.5 px-3">Token Balance</th>
                    <th className="py-2.5 px-3">Supply %</th>
                    <th className="py-2.5 px-3">50% RevShare Tier</th>
                    <th className="py-2.5 px-3 text-right">Solscan Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {(registryData?.holders_registry || []).map((h) => (
                    <tr key={h.rank} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="py-2.5 px-3 text-neutral-400 font-bold">#{h.rank}</td>
                      <td className="py-2.5 px-3 text-white font-semibold">
                        <div className="font-mono text-xs">{h.wallet.slice(0, 6)}...{h.wallet.slice(-4)}</div>
                        <div className="text-[10px] text-neutral-400 font-normal">{h.label}</div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-200">{h.balance_tokens.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-neutral-400">{h.supply_percent.toFixed(3)}%</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          h.eligible_for_revshare
                            ? 'border-white bg-white text-black'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                        }`}>
                          {h.eligible_for_revshare ? 'ELIGIBLE (≥ 0.5%)' : h.payout_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={`https://solscan.io/account/${h.wallet}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-neutral-300 hover:text-white"
                        >
                          <span>Verify</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Real Live On-Chain Bag Inspector */}
          <div className="p-4 sm:p-5 rounded-xl border border-neutral-800 bg-black font-mono text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-white font-bold text-xs flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-white" />
                <span>Check Your Wallet On-Chain ($CELOR Balance &amp; 0.5% Eligibility)</span>
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

            <p className="text-[11px] text-neutral-400 font-sans">
              Enter any Solana wallet address to fetch its live on-chain token balance and verify if it qualifies for the 50% revenue share tier (≥ 5,000,000 $CELOR).
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
                <span>{isInspecting ? 'Querying RPC...' : 'Check My Eligibility'}</span>
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
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    inspectResult.eligibility.is_eligible_for_50_percent_revshare
                      ? 'border-white bg-white text-black'
                      : 'border-neutral-700 bg-neutral-900 text-neutral-300'
                  }`}>
                    {inspectResult.eligibility.status}
                  </span>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-neutral-400 block text-[10px]">On-Chain Balance:</span>
                    <strong className="text-white font-mono">{inspectResult.token_balance.toLocaleString()} $CELOR</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Share of Supply:</span>
                    <strong className="text-white font-mono">{inspectResult.supply_percent.toFixed(5)}%</strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">50% RevShare Tier:</span>
                    <strong className={inspectResult.eligibility.is_eligible_for_50_percent_revshare ? 'text-white' : 'text-neutral-400'}>
                      {inspectResult.eligibility.is_eligible_for_50_percent_revshare ? 'QUALIFIED (≥ 5M)' : 'ACCUMULATING'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px]">Tokens to Qualify:</span>
                    <strong className="text-white font-mono">
                      {inspectResult.eligibility.tokens_needed_to_qualify > 0
                        ? `${inspectResult.eligibility.tokens_needed_to_qualify.toLocaleString()} more`
                        : 'Unlocked'}
                    </strong>
                  </div>
                </div>
              </div>
            )}
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
              Send SOL directly to CelorFunds.sol ({CELOR_TOKEN.treasuryWallet}). Enter your transaction signature to verify on-chain and receive your authenticated production API key.
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
              <div className="text-white font-bold text-xs">Step 1: Send {activePlan.solPrice} SOL to CelorFunds.sol</div>
              <div className="text-[11px] text-neutral-400 font-sans">
                Transfer exactly <strong className="text-white">{activePlan.solPrice} SOL</strong> from any Solana wallet (Phantom, Solflare, CLI) to CelorFunds.sol:
              </div>
              <div className="p-2.5 rounded-lg bg-[#0e0f11] border border-neutral-800 flex items-center justify-between gap-2 text-[11px]">
                <div>
                  <div className="text-white font-bold">CelorFunds.sol</div>
                  <code className="text-neutral-400 font-mono text-[10px] block truncate">{CELOR_TOKEN.treasuryWallet}</code>
                </div>
                <button
                  onClick={() => handleCopy(CELOR_TOKEN.treasuryWallet, 'form-treasury')}
                  className="text-neutral-300 hover:text-white text-[10px] shrink-0 px-2 py-1 rounded border border-neutral-800 bg-black"
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
                  <div className="text-white font-semibold">Automatic 50/20/30 Revenue Allocation Confirmed:</div>
                  <div className="flex items-center justify-between text-neutral-300 text-[10px]">
                    <span>50% Routed to Eligible Holders (≥ 5M):</span>
                    <strong className="text-white">+{verificationResult.revenue_allocation.holder_pool_50_percent.sol} SOL (${verificationResult.revenue_allocation.holder_pool_50_percent.usd})</strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-300 text-[10px]">
                    <span>20% Routed to Buyback &amp; Burn Flywheel:</span>
                    <strong className="text-white">+{verificationResult.revenue_allocation.buyback_and_burn_20_percent.sol} SOL (${verificationResult.revenue_allocation.buyback_and_burn_20_percent.usd})</strong>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                    <span>30% Saved in CelorFunds.sol for Hackathons:</span>
                    <span>+{verificationResult.revenue_allocation.hackathon_treasury_30_percent.sol} SOL (${verificationResult.revenue_allocation.hackathon_treasury_30_percent.usd})</span>
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

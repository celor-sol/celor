'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================================================
// 1. SPRING ROLLING ODOMETER NUMBER (LATEST MOTION TREND — SLOT REEL DIGITS)
// ============================================================================
interface RollingNumberProps {
  value: number | string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  digitClassName?: string;
}

export function RollingNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  digitClassName = '',
}: RollingNumberProps) {
  const formatted =
    typeof value === 'number'
      ? value.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : String(value);

  const chars = formatted.split('');

  return (
    <span
      className={`inline-flex items-baseline font-mono tabular-nums tracking-tight select-none ${className}`}
    >
      {prefix && <span className="mr-[1px]">{prefix}</span>}
      {chars.map((ch, idx) => {
        const isDigit = ch >= '0' && ch <= '9';
        if (!isDigit) {
          return (
            <span key={`sep-${idx}`} className="inline-block px-[0.5px]">
              {ch}
            </span>
          );
        }
        const digit = Number(ch);
        return (
          <span
            key={`pos-${chars.length - idx}`}
            className={`relative inline-block overflow-hidden h-[1.08em] leading-[1.08em] align-baseline ${digitClassName}`}
          >
            <span
              className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
              style={{
                transform: `translateY(-${digit * 10}%)`,
                transitionDelay: `${(chars.length - 1 - idx) * 18}ms`,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <span
                  key={n}
                  className="block h-[1.08em] leading-[1.08em] text-center"
                >
                  {n}
                </span>
              ))}
            </span>
          </span>
        );
      })}
      {suffix && <span className="ml-[2px]">{suffix}</span>}
    </span>
  );
}

// ============================================================================
// 2. CUTE FLAT 2D VECTOR GRAPHICS (DUOLINGO-STYLE — ZERO 3D, ZERO GLOW)
// ============================================================================

export function FlatFlameIcon({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className=" shrink-0"
    >
      {/* Flat outer flame body */}
      <path
        d="M34.5 6C34.5 6 49 18.5 49 35.5C49 47.9264 39.8741 57 28.5 57C17.1259 57 8 47.9264 8 35.5C8 26.5 13.5 18.8 18.5 14.5C18.5 14.5 17.5 21.5 22.5 23.5C21 15.5 26.5 9.5 34.5 6Z"
        fill="#FF5A1F"
      />
      {/* Flat mid flame */}
      <path
        d="M33 17C33 17 43 25.5 43 37C43 45.8366 36.2843 53 28 53C19.7157 53 13 45.8366 13 37C13 31 16.5 26 20 23.5C20 23.5 20.5 28 24.5 29C23.5 23 27.5 19.5 33 17Z"
        fill="#FF9600"
      />
      {/* Flat inner core */}
      <path
        d="M29.5 30C29.5 30 36 35 36 42C36 47.5228 32.1944 52 27.5 52C22.8056 52 19 47.5228 19 42C19 37.5 23.5 33.5 29.5 30Z"
        fill="#FFC800"
      />
      {/* Cute crisp flat highlight */}
      <circle cx="25" cy="44" r="3.5" fill="#FFF7D6" />
    </svg>
  );
}

export function FlatTrenchMascot({ size = 84 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Flat Lime Aura Leaf / Crest */}
      <path
        d="M48 8C64 8 78 20 80 38C82 56 71 76 48 76C25 76 14 56 16 38C18 20 32 8 48 8Z"
        fill="#58CC02"
      />
      {/* Bottom 2D lip */}
      <path
        d="M16.5 44C18 62 28 76 48 76C68 76 78 62 79.5 44C77 60 66 70 48 70C30 70 19 60 16.5 44Z"
        fill="#46A302"
      />
      {/* Cute Ears / Horns */}
      <path d="M24 22L34 12L40 24Z" fill="#58CC02" />
      <path d="M72 22L62 12L56 24Z" fill="#58CC02" />
      {/* Belly Patch */}
      <rect x="30" y="48" width="36" height="22" rx="11" fill="#89E219" />
      {/* Trench Deal-With-It Shades (Flat Crisp Vector) */}
      <rect x="20" y="30" width="25" height="14" rx="3" fill="#0B0C0E" />
      <rect x="51" y="30" width="25" height="14" rx="3" fill="#0B0C0E" />
      <rect x="44" y="33" width="8" height="4" fill="#0B0C0E" />
      {/* Crisp white pixel reflections on shades */}
      <rect x="24" y="33" width="6" height="3" fill="#FFFFFF" />
      <rect x="24" y="36" width="3" height="3" fill="#FFFFFF" />
      <rect x="55" y="33" width="6" height="3" fill="#FFFFFF" />
      <rect x="55" y="36" width="3" height="3" fill="#FFFFFF" />
      {/* Beak */}
      <path d="M44 45H52L48 52L44 45Z" fill="#FFC800" />
      {/* Feet */}
      <rect x="33" y="74" width="10" height="6" rx="3" fill="#FF9600" />
      <rect x="53" y="74" width="10" height="6" rx="3" fill="#FF9600" />
    </svg>
  );
}

export function FlatTrophyBadge({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      {/* Left & Right Handles */}
      <path
        d="M16 16H10C8.89543 16 8 16.8954 8 18V24C8 29.5228 12.4772 34 18 34H20V28H18C15.7909 28 14 26.2091 14 24V22H16V16Z"
        fill="#46A302"
      />
      <path
        d="M48 16H54C55.1046 16 56 16.8954 56 18V24C56 29.5228 51.5228 34 46 34H44V28H46C48.2091 28 50 26.2091 50 24V22H48V16Z"
        fill="#46A302"
      />
      {/* Cup Body */}
      <path
        d="M16 12C16 9.79086 17.7909 8 20 8H44C46.2091 8 48 9.79086 48 12V26C48 34.8366 40.8366 42 32 42C23.1634 42 16 34.8366 16 26V12Z"
        fill="#58CC02"
      />
      {/* Highlight */}
      <rect x="21" y="13" width="5" height="16" rx="2.5" fill="#89E219" />
      {/* Stem & Base */}
      <rect x="28" y="41" width="8" height="9" fill="#46A302" />
      <rect x="20" y="49" width="24" height="7" rx="3.5" fill="#58CC02" />
    </svg>
  );
}

export function FlatDoubleDeltaBadge({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect width="56" height="56" rx="16" fill="#58CC02" />
      <rect y="50" width="56" height="6" rx="3" fill="#46A302" />
      <path d="M15 18L26 28L15 38V18Z" fill="#0B0C0E" />
      <path d="M29 18L40 28L29 38V18Z" fill="#0B0C0E" />
    </svg>
  );
}

// ============================================================================
// 3. DATA & TRENCH STATE TYPES
// ============================================================================
interface DayStat {
  dayShort: string;
  dateNum: number;
  pnlSol: number;
  wins: number;
  losses: number;
  completed: boolean;
  isToday?: boolean;
}

const INITIAL_DAYS: DayStat[] = [
  { dayShort: 'Mon', dateNum: 19, pnlSol: 4.2, wins: 7, losses: 2, completed: true },
  { dayShort: 'Tue', dateNum: 20, pnlSol: 6.8, wins: 9, losses: 3, completed: true },
  { dayShort: 'Wed', dateNum: 21, pnlSol: 3.1, wins: 5, losses: 2, completed: true },
  { dayShort: 'Thu', dateNum: 22, pnlSol: 11.4, wins: 12, losses: 2, completed: true, isToday: true },
  { dayShort: 'Fri', dateNum: 23, pnlSol: 8.9, wins: 10, losses: 4, completed: true },
  { dayShort: 'Sat', dateNum: 24, pnlSol: 5.3, wins: 6, losses: 3, completed: false },
  { dayShort: 'Sun', dateNum: 25, pnlSol: 3.1, wins: 4, losses: 1, completed: false },
];

interface TrenchRunner {
  symbol: string;
  mcK: number;
  liqK: number;
  entrySol: number;
  pnlPct: number;
  tpPct: number;
  slPct: number;
  trailPct: number;
  moonbagDone: boolean;
  breakevenLocked: boolean;
}

const INITIAL_RUNNERS: TrenchRunner[] = [
  {
    symbol: '$PUMPX',
    mcK: 428,
    liqK: 68,
    entrySol: 2.5,
    pnlPct: 110.7,
    tpPct: 100,
    slPct: 1,
    trailPct: 15,
    moonbagDone: true,
    breakevenLocked: true,
  },
  {
    symbol: '$ALPEN',
    mcK: 195,
    liqK: 42,
    entrySol: 1.5,
    pnlPct: 48.2,
    tpPct: 100,
    slPct: -18,
    trailPct: 15,
    moonbagDone: false,
    breakevenLocked: true,
  },
  {
    symbol: '$QGLOW',
    mcK: 890,
    liqK: 124,
    entrySol: 4.0,
    pnlPct: 245.4,
    tpPct: 200,
    slPct: 1,
    trailPct: 12,
    moonbagDone: true,
    breakevenLocked: true,
  },
];

// ============================================================================
// 4. MAIN CELOR TRENCH WALLET EXTENSION UI
// ============================================================================
export function CelorTrenchWalletUI() {
  // Layout mode: '3UP' (shows all 3 screens side-by-side like the user's reference shots) or '1UP' (single extension popup)
  const [viewMode, setViewMode] = useState<'3UP' | '1UP'>('3UP');
  const [activeTab, setActiveTab] = useState<'TRENCH' | 'STREAK' | 'SNIPE' | 'SHIELD'>('TRENCH');

  // Core rolling numeric states
  const [solBalance, setSolBalance] = useState<number>(142.84);
  const [coldBalance, setColdBalance] = useState<number>(84.5);
  const [winRatePct, setWinRatePct] = useState<number>(74);
  const [streakDays, setStreakDays] = useState<number>(14);
  const [pnl7dSol, setPnl7dSol] = useState<number>(42.8);
  const [slotNumber, setSlotNumber] = useState<number>(460601840);
  const [slotLatencyMs, setSlotLatencyMs] = useState<number>(188);
  const [savedBribeSol, setSavedBribeSol] = useState<number>(1.42);
  const [reclaimedRentSol, setReclaimedRentSol] = useState<number>(0.845);
  const [emptyAtaCount, setEmptyAtaCount] = useState<number>(22);
  const [activeTier, setActiveTier] = useState<'HOT' | 'BRN' | 'COLD'>('HOT');
  const [activeBurnerIdx, setActiveBurnerIdx] = useState<number>(0);

  // Selected calendar day (`Mon 19` .. `Sun 25`)
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(3); // Thu 22
  const [compoundDayHorizon, setCompoundDayHorizon] = useState<1 | 7 | 30 | 100>(100);

  // Quests progress (Duolingo style)
  const [snipeQuestCount, setSnipeQuestCount] = useState<number>(13);
  const [snipeQuestTarget] = useState<number>(15);
  const [vacQuestCount, setVacQuestCount] = useState<number>(20);
  const [vacQuestTarget] = useState<number>(25);

  // Live backend state
  const [hotPubkey, setHotPubkey] = useState<string>('7eC16gE8mdWAbaCnPJMBzyAJpUC4MKmG9eKdfgGCVUoP');
  const [coldPubkey, setColdPubkey] = useState<string>('3pkJz2WVk8Eiy5KSLLbr1TfLbN42pXyzc5YkJxM3VXWt');
  const [pdaVaultPubkey, setPdaVaultPubkey] = useState<string>('DLipKabEqRCpEz1c9sMyydX2kP3vWn8R4qLmN6tYuV1w');
  const [coldOtsIndex, setColdOtsIndex] = useState<number>(0);
  const [burnerCount, setBurnerCount] = useState<number>(4);
  const [axSigSeq, setAxSigSeq] = useState<number>(1025);
  const [lastTxLatencyUs, setLastTxLatencyUs] = useState<number>(412);
  const [lastSignature, setLastSignature] = useState<string>('5xK9mQp7vR2wL8nJ3tY6hF4cB1dG9sV...');
  const [runners, setRunners] = useState<TrenchRunner[]>(INITIAL_RUNNERS);
  const [statusToast, setStatusToast] = useState<string>('AX-67 READY · 0◎ BRIBE · 188ms SLOT');
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [drainerBlockedCount, setDrainerBlockedCount] = useState<number>(9);
  const [lastFirewallRule, setLastFirewallRule] = useState<string>('RULE_01_NO_SYSTEM_ASSIGN');

  // Connect to real backend on mount
  useEffect(() => {
    fetch('/api/wallet-rpc/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'init' }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.connected?.summary) {
          const s = data.connected.summary;
          setHotPubkey(s.primaryHotWallet.pubkey);
          setColdPubkey(s.quantumColdVault.pubkey);
          setPdaVaultPubkey(s.quantumColdVault.hashLockedQuantumPdaVault);
          setColdOtsIndex(s.quantumColdVault.coldDerivationIndex || 0);
          setBurnerCount(s.stealthBurnerPool.totalDerived || 4);
          setSlotNumber(data.slot || 460601840);
        }
      })
      .catch(() => {});
  }, []);

  // Micro-animation: live 200ms Alpenglow slot pulse + subtle PnL micro-ticks
  useEffect(() => {
    const timer = setInterval(() => {
      setSlotNumber((s) => s + 1);
      setSlotLatencyMs((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.min(198, Math.max(176, prev + delta));
      });
    }, 1400);
    return () => clearInterval(timer);
  }, []);

  const shortAddr = (addr: string) =>
    addr && addr.length > 10 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;

  const handleCopyAddress = useCallback(() => {
    const target = activeTier === 'COLD' ? coldPubkey : hotPubkey;
    navigator.clipboard?.writeText(target).catch(() => {});
    setCopiedAddr(true);
    setStatusToast(`COPIED ${shortAddr(target)}`);
    setTimeout(() => setCopiedAddr(false), 1200);
  }, [activeTier, coldPubkey, hotPubkey]);

  // 1. REAL BACKEND ACTION: TURBO-HIJACK SWAP (Strips 0.015 SOL Jito Bribe + 75K CU + 67-Chain WOTS+)
  const handleTurboSnipe = async () => {
    setBusyAction('snipe');
    try {
      const res = await fetch('/api/wallet-rpc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'turboSwap' }),
      }).then((r) => r.json());

      if (res?.ok && res.signed) {
        const saved = Number(res.signed.jitoBribeSavedSol || 0.015);
        setSavedBribeSol((v) => Number((v + saved).toFixed(3)));
        setSolBalance((v) => Number((v + 1.24).toFixed(2)));
        setPnl7dSol((v) => Number((v + 1.24).toFixed(1)));
        setSnipeQuestCount((c) => Math.min(snipeQuestTarget, c + 1));
        setAxSigSeq((s) => s + 1);
        setLastTxLatencyUs(Math.round(res.signed.totalLatencyUs || 418));
        setLastSignature(res.signed.signature || lastSignature);
        setStatusToast(
          `TURBO SIGNED · +${saved}◎ BRIBE SAVED · ${Math.round(res.signed.totalLatencyUs || 418)}µs`
        );
      }
    } catch {
      setSolBalance((v) => Number((v + 1.15).toFixed(2)));
    } finally {
      setBusyAction(null);
    }
  };

  // 2. REAL BACKEND ACTION: 22-ATA SINGLE-PACKET RENT VACUUM (0% FEE)
  const handleVacuumRent = async () => {
    const countToClose = emptyAtaCount > 0 ? emptyAtaCount : 22;
    setBusyAction('vacuum');
    try {
      const res = await fetch('/api/wallet-rpc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vacuumRent', ataCount: countToClose }),
      }).then((r) => r.json());

      if (res?.ok && res.vacuum) {
        const reclaimed = Number(res.vacuum.totalReclaimedSol || 0.04486);
        setSolBalance((v) => Number((v + reclaimed).toFixed(2)));
        setReclaimedRentSol((v) => Number((v + reclaimed).toFixed(3)));
        setEmptyAtaCount(0);
        setVacQuestCount((c) => Math.min(vacQuestTarget, c + 3));
        setLastTxLatencyUs(Math.round(res.vacuum.buildLatencyUs || 380));
        setStatusToast(`VACUUMED ${countToClose} ATAs · +${reclaimed.toFixed(3)}◎ · 0% FEE`);
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 3. REAL BACKEND ACTION: DERIVE STEALTH BURNER (<500µs HKDF)
  const handleDeriveBurner = async () => {
    setBusyAction('burner');
    try {
      const res = await fetch('/api/wallet-rpc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deriveBurner' }),
      }).then((r) => r.json());

      if (res?.ok && res.burner) {
        setBurnerCount((c) => c + 1);
        setActiveBurnerIdx(res.burner.burnerIndex);
        setActiveTier('BRN');
        setLastTxLatencyUs(Math.round(res.burner.deriveLatencyUs || 390));
        setStatusToast(
          `NEW BRN #0${res.burner.burnerIndex} · ${shortAddr(res.burner.pubkey)} · 0 LINK`
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 4. REAL BACKEND ACTION: 0µs PRE-SIGNED PANIC EJECT TO QUANTUM COLD VAULT
  const handlePanicEject = async () => {
    setBusyAction('panic');
    try {
      const res = await fetch('/api/wallet-rpc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'panicEject' }),
      }).then((r) => r.json());

      if (res?.ok && res.eject) {
        const sweptSol = solBalance > 1 ? Number((solBalance - 0.05).toFixed(2)) : 0;
        setColdBalance((c) => Number((c + sweptSol).toFixed(2)));
        setSolBalance(0.05);
        setActiveTier('COLD');
        setLastTxLatencyUs(Math.round(res.eject.udpDispatchLatencyUs || 210));
        setStatusToast(
          `0µs PANIC EJECT · +${sweptSol}◎ SWEPT TO COLD ${shortAddr(res.eject.sweptToQuantumColdVault)}`
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 5. REAL BACKEND ACTION: BLOCK MALICIOUS DRAINER TX (<100µs FIREWALL)
  const handleTestDrainerFirewall = async () => {
    setBusyAction('firewall');
    try {
      const res = await fetch('/api/wallet-rpc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'blockDrainer' }),
      }).then((r) => r.json());

      if (res?.ok && res.firewallResult) {
        const fw = res.firewallResult;
        setDrainerBlockedCount((c) => c + 1);
        setLastFirewallRule(fw.ruleTriggered || 'RULE_01_NO_SYSTEM_ASSIGN');
        setLastTxLatencyUs(Math.round(fw.inspectLatencyUs || 22));
        setStatusToast(
          `BLOCKED ${fw.ruleTriggered} · ${Math.round(fw.inspectLatencyUs || 22)}µs`
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 6. REAL BACKEND ACTION: OTS QUANTUM COLD VAULT ROTATION (COLD #N -> COLD #N+1)
  const handleRotateColdVault = async () => {
    setBusyAction('rotate');
    try {
      const res = await fetch('/api/wallet-rpc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotateColdVault' }),
      }).then((r) => r.json());

      if (res?.ok && res.rotation) {
        setColdPubkey(res.rotation.newQuantumColdVaultPubkey);
        setColdOtsIndex(res.rotation.newQuantumColdVaultIndex);
        setAxSigSeq((s) => s + 1);
        setStatusToast(
          `OTS ROTATED → COLD #0${res.rotation.newQuantumColdVaultIndex} (${shortAddr(
            res.rotation.newQuantumColdVaultPubkey
          )})`
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  // 7. REAL BACKEND ACTION: 220ms POOL RESERVE TICK (2X MOONBAG + TRAILING STOP)
  const handleTickRunner = async () => {
    setBusyAction('tick');
    try {
      const res = await fetch('/api/wallet-rpc/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'evalTick', multiplier: 2.25 }),
      }).then((r) => r.json());

      setRunners((prev) =>
        prev.map((r, i) =>
          i === 0
            ? {
                ...r,
                mcK: r.mcK + 34,
                pnlPct: Number((r.pnlPct + 14.6).toFixed(1)),
                moonbagDone: true,
                breakevenLocked: true,
              }
            : {
                ...r,
                mcK: r.mcK + 12,
                pnlPct: Number((r.pnlPct + 6.4).toFixed(1)),
              }
        )
      );
      setSolBalance((v) => Number((v + 0.85).toFixed(2)));
      setPnl7dSol((v) => Number((v + 0.85).toFixed(1)));
      if (res?.ok && res.tick) {
        setStatusToast(
          `220ms TICK · ${res.tick.action || 'MOONBAG_2X_ACTIVE'} · +0.85◎ REALIZED`
        );
      }
    } finally {
      setBusyAction(null);
    }
  };

  const selectedDay = INITIAL_DAYS[selectedDayIdx] || INITIAL_DAYS[3];

  // ==========================================================================
  // SCREEN A: TRENCH PROFILE, 7-DAY CALENDAR, BURNER POOL & RENT VACUUM
  // (Inspired directly by Image 3 `Mr.Bobrovsky` — Trench Edition!)
  // ==========================================================================
  const renderTrenchProfileScreen = (showBottomNav = false) => (
    <div className="w-[386px] min-h-[684px] bg-[#0B0C0E] text-[#F3F4F6] rounded-[34px] border-2 border-[#20232A] flex flex-col justify-between overflow-hidden select-none">
      {/* Top Extension Bar */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setEmptyAtaCount(22);
                setStreakDays((d) => d + 1);
                setStatusToast('SYNCED · +1D STREAK · 22 ATAs DETECTED');
              }}
              className="px-2.5 py-1 rounded-full bg-[#15181E] border border-[#252932] text-[11px] font-mono font-semibold text-[#9CA3AF] hover:text-white active:translate-y-[1px] transition-transform cursor-pointer"
            >
              ✕ EXT
            </button>
            <span className="px-2 py-0.5 rounded-full bg-[#15181E] border border-[#252932] text-[10px] font-mono text-[#58CC02]">
              <RollingNumber value={slotLatencyMs} suffix="ms" />
            </span>
          </div>

          {/* Right Balance Pill (Exact Lime Pill from Image 3) */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 bg-[#15181E] border border-[#262B35] rounded-full pl-2.5 pr-1 py-0.5">
              <span className="w-4 h-4 rounded-full bg-[#58CC02] text-[#0B0C0E] font-mono font-black text-[10px] flex items-center justify-center">
                ◎
              </span>
              <RollingNumber
                value={solBalance}
                decimals={2}
                className="text-[13px] font-bold text-white"
              />
              <button
                onClick={handleTurboSnipe}
                title="Turbo Snipe (+SOL)"
                className="w-5 h-5 rounded-full bg-[#58CC02] border-b-2 border-[#46A302] text-[#0B0C0E] font-black text-[13px] leading-none flex items-center justify-center active:translate-y-[1px] cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Centered User Avatar (Dummy Image from Desktop) + Handle */}
        <div className="flex flex-col items-center pt-1 pb-2">
          <div className="relative">
            <div className="w-[74px] h-[74px] rounded-full p-1 border-2 border-dashed border-[#58CC02] bg-[#13161C] flex items-center justify-center">
              <img
                src="/images/dummyimage.jpg"
                alt="Trench Profile"
                className="w-full h-full rounded-full object-cover bg-white"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md bg-[#58CC02] border-b-2 border-[#3E8E00] text-[#0B0C0E] font-mono font-black text-[9px]">
              AX-67
            </span>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <h2 className="text-[17px] font-extrabold tracking-tight text-white">
              Trench.Ape
            </h2>
            <span className="px-1.5 py-0.5 rounded bg-[#161920] border border-[#262A34] text-[10px] font-mono font-bold text-[#58CC02]">
              {activeTier}
            </span>
          </div>

          <button
            onClick={handleCopyAddress}
            className="mt-0.5 text-[11px] font-mono text-[#7D8594] hover:text-[#D1D5DB] flex items-center gap-1 cursor-pointer"
          >
            <span>@celor_trench</span>
            <span>·</span>
            <span className="text-[#9CA3AF]">{shortAddr(hotPubkey)}</span>
            <span className="text-[9px] text-[#58CC02]">{copiedAddr ? '✓' : '⧉'}</span>
          </button>
        </div>

        {/* 3-Column Trench Stat Strip (Image 3 Layout: Win/Lose | Level | Days -> WR | 7D PNL | STRK) */}
        <div className="grid grid-cols-3 divide-x divide-[#1E222B] py-2.5 my-1 bg-[#111318] rounded-2xl border border-[#1E222B]">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full bg-[#58CC02] text-[#0B0C0E] text-[9px] font-black flex items-center justify-center">
                ✓
              </span>
              <RollingNumber
                value={winRatePct}
                suffix="%"
                className="text-[14px] font-extrabold text-white"
              />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] mt-0.5">
              Win/Loss
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded-full bg-[#58CC02] text-[#0B0C0E] text-[9px] font-black flex items-center justify-center">
                ◎
              </span>
              <RollingNumber
                value={pnl7dSol}
                decimals={1}
                prefix="+"
                className="text-[14px] font-extrabold text-white"
              />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] mt-0.5">
              7D PnL
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-[#58CC02] text-[#0B0C0E] text-[9px] font-black flex items-center justify-center">
                🔥
              </span>
              <RollingNumber
                value={streakDays}
                className="text-[14px] font-extrabold text-white"
              />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#6B7280] mt-0.5">
              Days
            </span>
          </div>
        </div>

        {/* 7-Day Interactive Trench Calendar Strip (Mon 19 .. Thu 22 active .. Sun 25) */}
        <div className="grid grid-cols-7 gap-1.5 my-2.5">
          {INITIAL_DAYS.map((d, idx) => {
            const isSelected = idx === selectedDayIdx;
            return (
              <button
                key={d.dayShort}
                onClick={() => {
                  setSelectedDayIdx(idx);
                  setStatusToast(
                    `${d.dayShort.toUpperCase()} ${d.dateNum} · +${d.pnlSol}◎ · ${d.wins}W/${d.losses}L`
                  );
                }}
                className={`flex flex-col items-center py-2 rounded-xl border transition-transform active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-[#171B14] border-[#58CC02] text-white'
                    : 'bg-[#12141A] border-[#1D2028] text-[#7D8594] hover:border-[#2E3340]'
                }`}
              >
                <div className="flex items-center gap-0.5 h-2 mb-1">
                  {isSelected ? (
                    <>
                      <span className="w-1 h-1 rounded-full bg-white" />
                      <span className="w-1 h-1 rounded-full bg-white" />
                      <span className="w-1 h-1 rounded-full bg-[#58CC02]" />
                    </>
                  ) : (
                    <span
                      className={`w-1 h-1 rounded-full ${
                        d.completed ? 'bg-[#58CC02]' : 'bg-[#4B5563]'
                      }`}
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium leading-tight">{d.dayShort}</span>
                <span
                  className={`text-[13px] font-mono font-bold mt-0.5 ${
                    isSelected ? 'text-white' : 'text-[#D1D5DB]'
                  }`}
                >
                  {d.dateNum}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Micro-Bar (Pure Numbers, Short Forms) */}
        <div className="flex items-center justify-between px-3 py-1.5 mb-2.5 rounded-xl bg-[#12151B] border border-[#1E222B] text-[11px] font-mono">
          <span className="text-[#8E96A4]">
            {selectedDay.dayShort.toUpperCase()} {selectedDay.dateNum}
          </span>
          <span className="text-[#58CC02] font-bold">
            <RollingNumber value={selectedDay.pnlSol} decimals={1} prefix="+" suffix="◎" />
          </span>
          <span className="text-white font-bold">
            {selectedDay.wins}W / {selectedDay.losses}L
          </span>
          <span className="text-[#FF9600] font-bold">0 RUG</span>
        </div>

        {/* 2-Card Bento Grid (Left: Stealth Burners / Friends style; Right: Keep it up! / Trophy Rent Vacuum) */}
        <div className="grid grid-cols-12 gap-2.5 mb-2.5">
          {/* Left Square Card: Burner Pool */}
          <div className="col-span-5 bg-[#13161C] border border-[#21252E] rounded-2xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-center -space-x-2 my-1">
              <img
                src="/images/dummyimage.jpg"
                alt="BRN 1"
                className="w-7 h-7 rounded-full border-2 border-[#13161C] bg-white object-cover"
                style={{ imageRendering: 'pixelated' }}
              />
              <img
                src="/images/dummy.png"
                alt="BRN 2"
                className="w-8 h-8 rounded-full border-2 border-[#58CC02] bg-white object-cover z-10"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="w-7 h-7 rounded-full border-2 border-[#13161C] bg-[#202530] text-[10px] font-mono font-bold text-[#58CC02] flex items-center justify-center">
                #{burnerCount}
              </div>
            </div>

            <div className="text-center mt-1">
              <div className="text-[13px] font-extrabold text-white leading-tight">
                Burners
              </div>
              <div className="text-[10px] font-mono text-[#7D8594]">
                <RollingNumber value={burnerCount} /> active · 0 link
              </div>
            </div>

            <button
              onClick={handleDeriveBurner}
              disabled={busyAction === 'burner'}
              className="mt-2 w-full py-1 rounded-lg bg-[#1C2029] border border-[#2C3240] border-b-2 text-[10px] font-mono font-bold text-[#58CC02] hover:bg-[#232834] active:translate-y-[1px] cursor-pointer"
            >
              + NEW (420µs)
            </button>
          </div>

          {/* Right Wide Card: Keep It Up / 22-ATA Vacuum with Flat 2D Trophy */}
          <div className="col-span-7 bg-[#151A12] border border-[#2A3622] rounded-2xl p-3 flex items-center justify-between relative overflow-hidden">
            <div className="flex flex-col justify-between h-full z-10 pr-1">
              <div>
                <div className="text-[14px] font-extrabold text-white leading-tight">
                  Vacuum Ready!
                </div>
                <div className="text-[11px] font-mono text-[#9CA3AF] mt-0.5 leading-snug">
                  <RollingNumber value={emptyAtaCount} /> ATAs →{' '}
                  <span className="text-[#58CC02] font-bold">+0.045◎</span>
                </div>
                <div className="text-[10px] font-mono text-[#6B7280]">0% Celor fee</div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  <span className="w-3 h-3 rounded-full bg-[#58CC02] text-[#0B0C0E] text-[8px] font-black flex items-center justify-center">
                    ✓
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#374151]" />
                </div>
                <button
                  onClick={handleVacuumRent}
                  disabled={busyAction === 'vacuum'}
                  className="px-2.5 py-1 rounded-lg bg-[#58CC02] border-b-2 border-[#3E8E00] text-[#0B0C0E] font-mono font-black text-[10px] active:translate-y-[1px] cursor-pointer"
                >
                  CLAIM ◎
                </button>
              </div>
            </div>

            <FlatTrophyBadge size={54} />
          </div>
        </div>

        {/* Bottom Wide Card: Turbo-Hijack Snipe (Matches `Complete new tasks` card in Image 3) */}
        <div className="bg-[#13161C] border border-[#21252E] rounded-2xl p-2.5 flex items-center gap-3">
          <FlatDoubleDeltaBadge size={46} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-white">
                Turbo-Hijack Swap
              </span>
              <span className="text-[10px] font-mono font-bold text-[#58CC02]">
                +{savedBribeSol}◎ SAV
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#7D8594] truncate mt-0.5">
              0◎ Jito Bribe · 75K CU · <RollingNumber value={lastTxLatencyUs} suffix="µs" />
            </div>
          </div>
          <button
            onClick={handleTurboSnipe}
            disabled={busyAction === 'snipe'}
            className="px-3 py-2 rounded-xl bg-[#58CC02] border-b-[3px] border-[#3E8E00] text-[#0B0C0E] font-mono font-black text-[11px] active:translate-y-[2px] cursor-pointer shrink-0"
          >
            SNIPE
          </button>
        </div>
      </div>

      {/* Bottom 4-Tab Extension Bar (Image 3 style with top lime bar indicator) */}
      <div className="bg-[#0E1014] border-t border-[#1D2028] px-4 py-2.5 flex items-center justify-around">
        {[
          { id: 'TRENCH', label: 'Trench', icon: '⊞' },
          { id: 'STREAK', label: 'Streak', icon: '🔥' },
          { id: 'SNIPE', label: 'Snipe', icon: '⚡' },
          { id: 'SHIELD', label: 'Shield', icon: '🛡️' },
        ].map((tab) => {
          const isAct = showBottomNav ? activeTab === tab.id : tab.id === 'TRENCH';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer"
            >
              {isAct && (
                <span className="absolute -top-2.5 w-7 h-[3px] rounded-full bg-[#58CC02]" />
              )}
              <span
                className={`text-[14px] ${
                  isAct ? 'text-[#58CC02]' : 'text-[#6B7280]'
                }`}
              >
                {tab.icon}
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  isAct ? 'text-[#58CC02]' : 'text-[#6B7280]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ==========================================================================
  // SCREEN B: DUOLINGO-STYLE TRENCH STREAK + 100D COMPOUND CURVE + QUESTS
  // (Inspired directly by Image 1 & Image 2 — Giant Odometer + Cute Mascot + Tactile Bars)
  // ==========================================================================
  const renderStreakAndQuestsScreen = (showBottomNav = false) => {
    const snipePct = Math.min(100, Math.round((snipeQuestCount / snipeQuestTarget) * 100));
    const vacPct = Math.min(100, Math.round((vacQuestCount / vacQuestTarget) * 100));

    return (
      <div className="w-[386px] min-h-[684px] bg-[#0B0C0E] text-[#F3F4F6] rounded-[34px] border-2 border-[#20232A] flex flex-col justify-between overflow-hidden select-none">
        <div className="px-4 pt-4 pb-2 flex-1 flex flex-col justify-between">
          {/* Top Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[15px] font-extrabold text-white tracking-tight">
                Trench Streak
              </div>
              <div className="text-[10px] font-mono text-[#7D8594]">
                ⏱ 0D RUGGED · EPOCH 1064
              </div>
            </div>
            <button
              onClick={() => {
                setStreakDays((d) => d + 1);
                setWinRatePct((w) => Math.min(99, w + 1));
                setStatusToast(`STREAK +1D → ${streakDays + 1} DAYS`);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181C14] border border-[#2E3B23] cursor-pointer active:translate-y-[1px]"
            >
              <FlatFlameIcon size={18} />
              <RollingNumber
                value={streakDays}
                suffix="D"
                className="text-[12px] font-black text-[#FF9600]"
              />
            </button>
          </div>

          {/* Center Hero Mascot + Giant Odometer Streak Number (Image 1 & Image 2 Center Screen) */}
          <div className="my-2 py-3 px-4 rounded-2xl bg-[#111510] border border-[#232D1F] flex flex-col items-center">
            <div className="flex items-center gap-3">
              <FlatTrenchMascot size={74} />
              <div className="flex flex-col items-start">
                <div className="text-[46px] font-black leading-none text-[#58CC02] tracking-tighter">
                  <RollingNumber value={streakDays} />
                </div>
                <div className="text-[13px] font-extrabold text-[#89E219] mt-0.5">
                  day trench streak!
                </div>
                <div className="text-[10px] font-mono text-[#7D8594] mt-0.5">
                  TOP 2% TRENCHER · +0.02◎/TX
                </div>
              </div>
            </div>

            {/* Week Pill Selector (`S M T W T F S` where active day is a tall solid lime pill — Image 2 middle!) */}
            <div className="w-full grid grid-cols-7 gap-1.5 mt-3 pt-2.5 border-t border-[#1E261B] items-end">
              {[
                { d: 'M', done: true },
                { d: 'T', done: true },
                { d: 'W', done: true },
                { d: 'T', done: true, activeTall: true },
                { d: 'F', done: true },
                { d: 'S', done: false },
                { d: 'S', done: false },
              ].map((item, i) =>
                item.activeTall ? (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-between py-1.5 rounded-full bg-[#58CC02] border-b-2 border-[#3E8E00] text-[#0B0C0E]"
                  >
                    <span className="text-[10px] font-black">{item.d}</span>
                    <span className="w-4 h-4 rounded-full bg-white text-[#58CC02] text-[10px] font-black flex items-center justify-center mt-1">
                      ✓
                    </span>
                  </div>
                ) : (
                  <div key={i} className="flex flex-col items-center gap-1 py-1">
                    <span className="text-[10px] font-mono font-bold text-[#7D8594]">
                      {item.d}
                    </span>
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-black ${
                        item.done
                          ? 'bg-[#1D241B] border-[#58CC02] text-[#58CC02]'
                          : 'bg-[#12141A] border-[#252932] text-[#4B5563]'
                      }`}
                    >
                      {item.done ? '✓' : ''}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* 100-Day Compound SOL Curve (Image 1 Left Screen: `Day 1 · Day 7 · Day 30 · Day 100`) */}
          <div className="bg-[#12141A] border border-[#1F232D] rounded-2xl p-3 my-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-white">
                100D Compound Curve
              </span>
              <div className="flex items-center gap-1">
                {([1, 7, 30, 100] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setCompoundDayHorizon(h)}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold cursor-pointer ${
                      compoundDayHorizon === h
                        ? 'bg-[#58CC02] text-[#0B0C0E]'
                        : 'bg-[#191D26] text-[#7D8594]'
                    }`}
                  >
                    D{h}
                  </button>
                ))}
              </div>
            </div>

            <svg
              viewBox="0 0 300 74"
              className="w-full h-[68px] overflow-visible"
              fill="none"
            >
              {/* Dashed vertical guides (D1, D7, D30, D100) */}
              <line x1="20" y1="8" x2="20" y2="56" stroke="#252934" strokeDasharray="3 3" />
              <line x1="95" y1="8" x2="95" y2="56" stroke="#252934" strokeDasharray="3 3" />
              <line x1="185" y1="8" x2="185" y2="56" stroke="#252934" strokeDasharray="3 3" />
              <line x1="280" y1="8" x2="280" y2="56" stroke="#252934" strokeDasharray="3 3" />
              <line x1="20" y1="56" x2="285" y2="56" stroke="#2E3442" strokeWidth="1.5" />

              {/* Crisp exponential compound curve */}
              <path
                d="M 20 54 Q 140 52 210 34 T 280 10"
                stroke="#58CC02"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="280" cy="10" r="4.5" fill="#FFFFFF" stroke="#58CC02" strokeWidth="2" />

              <text x="14" y="68" fill="#6B7280" fontSize="8" fontFamily="monospace">
                D1 (2◎)
              </text>
              <text x="80" y="68" fill="#6B7280" fontSize="8" fontFamily="monospace">
                D7 (9◎)
              </text>
              <text x="165" y="68" fill="#6B7280" fontSize="8" fontFamily="monospace">
                D30 (38◎)
              </text>
              <text x="242" y="68" fill="#58CC02" fontSize="8" fontWeight="bold" fontFamily="monospace">
                D100 (142◎)
              </text>
            </svg>
          </div>

          {/* Duolingo-Style Tactile Progress Bars (`13/15` & `20/25` — Image 2 Left Screen) */}
          <div className="bg-[#12141A] border border-[#1F232D] rounded-2xl p-3 my-1 space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-white">0-Bribe Turbo Snipes</span>
                <span className="font-mono font-bold text-[#58CC02]">
                  {snipeQuestCount}/{snipeQuestTarget}
                </span>
              </div>
              <div className="w-full h-5 rounded-full bg-[#1C2029] border border-[#282E3B] p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#58CC02] border-b-2 border-[#3E8E00] flex items-center justify-center text-[9px] font-mono font-black text-[#0B0C0E] transition-all duration-500"
                  style={{ width: `${snipePct}%` }}
                >
                  {snipeQuestCount}/{snipeQuestTarget}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-bold text-white">Rent Vacuum & Rug Blocks</span>
                <span className="font-mono font-bold text-[#58CC02]">
                  {vacQuestCount}/{vacQuestTarget}
                </span>
              </div>
              <div className="w-full h-5 rounded-full bg-[#1C2029] border border-[#282E3B] p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#58CC02] border-b-2 border-[#3E8E00] flex items-center justify-center text-[9px] font-mono font-black text-[#0B0C0E] transition-all duration-500"
                  style={{ width: `${vacPct}%` }}
                >
                  {vacQuestCount}/{vacQuestTarget}
                </div>
              </div>
            </div>
          </div>

          {/* 2x2 Compact Numeric Bento Grid (Image 2 Right Screen bottom) */}
          <div className="grid grid-cols-2 gap-2 my-1">
            <div className="bg-[#12141A] border border-[#1F232D] rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-mono font-extrabold text-[#58CC02]">
                  <RollingNumber value={savedBribeSol} decimals={2} prefix="+" suffix="◎" />
                </div>
                <div className="text-[10px] font-mono text-[#7D8594]">Bribes Saved</div>
              </div>
              <span className="text-[13px]">⚡</span>
            </div>

            <div className="bg-[#12141A] border border-[#1F232D] rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <div className="text-[14px] font-mono font-extrabold text-[#58CC02]">
                  <RollingNumber value={reclaimedRentSol} decimals={3} prefix="+" suffix="◎" />
                </div>
                <div className="text-[10px] font-mono text-[#7D8594]">Rent Vacuumed</div>
              </div>
              <span className="text-[13px]">♻️</span>
            </div>
          </div>

          {/* Tactile Solid Lime Duolingo Action Button */}
          <button
            onClick={handleTurboSnipe}
            className="mt-1 w-full py-2.5 rounded-2xl bg-[#58CC02] border-b-[4px] border-[#3E8E00] text-[#0B0C0E] font-mono font-black text-[12px] tracking-wide uppercase active:translate-y-[2px] cursor-pointer"
          >
            BOOST STREAK · +0.015◎ BRIBE SAVED
          </button>
        </div>

        {/* Bottom 4-Tab Bar */}
        <div className="bg-[#0E1014] border-t border-[#1D2028] px-4 py-2.5 flex items-center justify-around">
          {[
            { id: 'TRENCH', label: 'Trench', icon: '⊞' },
            { id: 'STREAK', label: 'Streak', icon: '🔥' },
            { id: 'SNIPE', label: 'Snipe', icon: '⚡' },
            { id: 'SHIELD', label: 'Shield', icon: '🛡️' },
          ].map((tab) => {
            const isAct = showBottomNav ? activeTab === tab.id : tab.id === 'STREAK';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className="relative flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer"
              >
                {isAct && (
                  <span className="absolute -top-2.5 w-7 h-[3px] rounded-full bg-[#58CC02]" />
                )}
                <span className={`text-[14px] ${isAct ? 'text-[#58CC02]' : 'text-[#6B7280]'}`}>
                  {tab.icon}
                </span>
                <span
                  className={`text-[10px] font-semibold ${
                    isAct ? 'text-[#58CC02]' : 'text-[#6B7280]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================================================
  // SCREEN C: 220ms OFFLINE TP/SL/MOONBAG + AX-67 SHIELD + 0µs PANIC EJECT
  // ==========================================================================
  const renderSnipeAndShieldScreen = (showBottomNav = false) => (
    <div className="w-[386px] min-h-[684px] bg-[#0B0C0E] text-[#F3F4F6] rounded-[34px] border-2 border-[#20232A] flex flex-col justify-between overflow-hidden select-none">
      <div className="px-4 pt-4 pb-2 flex-1 flex flex-col justify-between">
        {/* Top Slot & Quantum Shield Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src="/images/dummy.png"
              alt="Stealth Guard"
              className="w-8 h-8 rounded-full border border-[#58CC02] bg-white object-cover"
              style={{ imageRendering: 'pixelated' }}
            />
            <div>
              <div className="text-[13px] font-extrabold text-white leading-tight">
                220ms Trench Guard
              </div>
              <div className="text-[10px] font-mono text-[#58CC02]">
                SLOT <RollingNumber value={slotNumber} />
              </div>
            </div>
          </div>

          <button
            onClick={handleTickRunner}
            disabled={busyAction === 'tick'}
            className="px-2.5 py-1 rounded-xl bg-[#58CC02] border-b-2 border-[#3E8E00] text-[#0B0C0E] font-mono font-black text-[10px] active:translate-y-[1px] cursor-pointer"
          >
            +220ms TICK
          </button>
        </div>

        {/* Live 220ms TP / SL / 2x Moonbag Runners (Ultra-compact trench numbers) */}
        <div className="space-y-2 my-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase text-[#6B7280] px-1">
            <span>RUNNER / MC</span>
            <span>GUARD (TP/SL/TRL)</span>
            <span>NET PNL</span>
          </div>

          {runners.map((r) => (
            <div
              key={r.symbol}
              className="bg-[#12151B] border border-[#1F242F] rounded-2xl p-2.5 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-mono font-black text-white">
                    {r.symbol}
                  </span>
                  {r.moonbagDone && (
                    <span className="px-1.5 py-0.5 rounded bg-[#182414] border border-[#325422] text-[9px] font-mono font-bold text-[#58CC02]">
                      2X MBAG ✓
                    </span>
                  )}
                </div>
                <div className="text-[10px] font-mono text-[#7D8594] mt-0.5">
                  MC $<RollingNumber value={r.mcK} />K · LIQ ${r.liqK}K
                </div>
              </div>

              <div className="text-center font-mono text-[10px]">
                <div className="text-[#D1D5DB] font-bold">
                  TP +{r.tpPct}% · TRL {r.trailPct}%
                </div>
                <div className="text-[#58CC02]">
                  {r.breakevenLocked ? 'SL +1% BE LOCKED' : `SL ${r.slPct}%`}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[13px] font-mono font-black text-[#58CC02]">
                  <RollingNumber value={r.pnlPct} decimals={1} prefix="+" suffix="%" />
                </div>
                <div className="text-[10px] font-mono text-[#9CA3AF]">
                  {r.entrySol}◎ IN
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bytecode Drainer Firewall & Balance-Floor Guard Card */}
        <div className="bg-[#12141A] border border-[#1F232D] rounded-2xl p-3 my-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-extrabold text-white">
              Drainer Firewall (30/30 HELD)
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#192315] text-[#58CC02] font-mono font-bold text-[10px]">
              <RollingNumber value={drainerBlockedCount} /> BLOCKED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 text-center font-mono my-2">
            <div className="bg-[#0E1015] border border-[#1C2029] rounded-xl py-1.5">
              <div className="text-[12px] font-bold text-white">
                <RollingNumber value={lastTxLatencyUs} suffix="µs" />
              </div>
              <div className="text-[9px] text-[#6B7280]">SCAN TIME</div>
            </div>
            <div className="bg-[#0E1015] border border-[#1C2029] rounded-xl py-1.5">
              <div className="text-[12px] font-bold text-[#58CC02]">67 CHN</div>
              <div className="text-[9px] text-[#6B7280]">2,144B WOTS+</div>
            </div>
            <div className="bg-[#0E1015] border border-[#1C2029] rounded-xl py-1.5">
              <div className="text-[12px] font-bold text-[#FF9600]">
                #<RollingNumber value={axSigSeq} />
              </div>
              <div className="text-[9px] text-[#6B7280]">OTS SEQ</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="text-[10px] font-mono text-[#9CA3AF] truncate">
              LAST: <span className="text-[#FF4B4B] font-bold">{lastFirewallRule}</span>
            </div>
            <button
              onClick={handleTestDrainerFirewall}
              disabled={busyAction === 'firewall'}
              className="px-2.5 py-1 rounded-lg bg-[#1D222D] border border-[#2D3546] border-b-2 text-[10px] font-mono font-bold text-white active:translate-y-[1px] cursor-pointer shrink-0"
            >
              TEST DRAINER
            </button>
          </div>
        </div>

        {/* Quantum Cold Vault OTS & Off-Curve PDA Card */}
        <div className="bg-[#12141A] border border-[#1F232D] rounded-2xl p-3 my-1 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-extrabold text-white">
                Quantum Cold #{coldOtsIndex}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-[#15222B] text-[#1CB0F6] font-mono font-bold text-[9px]">
                PDA OFF-CURVE
              </span>
            </div>
            <div className="text-[10px] font-mono text-[#7D8594] mt-0.5">
              {shortAddr(coldPubkey)} · PDA {shortAddr(pdaVaultPubkey)}
            </div>
            <div className="text-[12px] font-mono font-bold text-[#58CC02] mt-0.5">
              <RollingNumber value={coldBalance} decimals={2} suffix=" ◎ COLD" />
            </div>
          </div>

          <button
            onClick={handleRotateColdVault}
            disabled={busyAction === 'rotate'}
            className="px-2.5 py-2 rounded-xl bg-[#19202B] border border-[#2A3648] border-b-[3px] text-[#1CB0F6] font-mono font-black text-[10px] active:translate-y-[1px] cursor-pointer"
          >
            OTS ROTATE ↻
          </button>
        </div>

        {/* 0µs Pre-Signed PANIC EJECT Tactile Button (Flat Duolingo Crimson — Zero Glow) */}
        <button
          onClick={handlePanicEject}
          disabled={busyAction === 'panic'}
          className="mt-1 w-full py-2.5 rounded-2xl bg-[#FF4B4B] border-b-[4px] border-[#C92A2A] text-white font-mono font-black text-[12px] tracking-wider uppercase active:translate-y-[2px] cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🚨 0µs PANIC EJECT → COLD VAULT</span>
        </button>
      </div>

      {/* Bottom 4-Tab Bar */}
      <div className="bg-[#0E1014] border-t border-[#1D2028] px-4 py-2.5 flex items-center justify-around">
        {[
          { id: 'TRENCH', label: 'Trench', icon: '⊞' },
          { id: 'STREAK', label: 'Streak', icon: '🔥' },
          { id: 'SNIPE', label: 'Snipe', icon: '⚡' },
          { id: 'SHIELD', label: 'Shield', icon: '🛡️' },
        ].map((tab) => {
          const isAct = showBottomNav ? activeTab === tab.id : tab.id === 'SNIPE';
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1 cursor-pointer"
            >
              {isAct && (
                <span className="absolute -top-2.5 w-7 h-[3px] rounded-full bg-[#58CC02]" />
              )}
              <span className={`text-[14px] ${isAct ? 'text-[#58CC02]' : 'text-[#6B7280]'}`}>
                {tab.icon}
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  isAct ? 'text-[#58CC02]' : 'text-[#6B7280]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#070809] text-[#F3F4F6] flex flex-col items-center py-6 px-4">
      {/* Top Minimal Control Bar */}
      <div className="w-full max-w-[1220px] flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-[#181B22]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-xl bg-[#12151B] border border-[#222630] font-mono text-[11px] font-bold text-[#9CA3AF] hover:text-white"
          >
            ← CELOR.CLOUD
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#58CC02] text-[#0B0C0E] font-mono font-black text-[11px]">
              TRENCH EXT v3
            </span>
            <span className="font-mono text-[12px] font-bold text-white">
              ALPENGLOW + QUANTUMGLOW (AX-67)
            </span>
          </div>
        </div>

        {/* Live Telemetry Toast */}
        <div className="px-3 py-1.5 rounded-xl bg-[#11141A] border border-[#222733] font-mono text-[11px] text-[#58CC02] font-bold">
          {statusToast}
        </div>

        {/* View Mode Switcher: 3-UP Deck vs 1-UP Extension Popup */}
        <div className="flex items-center gap-1.5 bg-[#11141A] border border-[#20242E] p-1 rounded-xl">
          <button
            onClick={() => setViewMode('3UP')}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold cursor-pointer ${
              viewMode === '3UP'
                ? 'bg-[#58CC02] text-[#0B0C0E]'
                : 'text-[#8E96A4] hover:text-white'
            }`}
          >
            3-UP DECK
          </button>
          <button
            onClick={() => setViewMode('1UP')}
            className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold cursor-pointer ${
              viewMode === '1UP'
                ? 'bg-[#58CC02] text-[#0B0C0E]'
                : 'text-[#8E96A4] hover:text-white'
            }`}
          >
            1-UP EXT (386×684)
          </button>
        </div>
      </div>

      {/* Main Interactive Extension Showcase */}
      {viewMode === '3UP' ? (
        <div className="w-full max-w-[1220px] flex flex-wrap items-start justify-center gap-6">
          {renderTrenchProfileScreen(false)}
          {renderStreakAndQuestsScreen(false)}
          {renderSnipeAndShieldScreen(false)}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {activeTab === 'TRENCH' && renderTrenchProfileScreen(true)}
          {activeTab === 'STREAK' && renderStreakAndQuestsScreen(true)}
          {(activeTab === 'SNIPE' || activeTab === 'SHIELD') &&
            renderSnipeAndShieldScreen(true)}
        </div>
      )}
    </div>
  );
}

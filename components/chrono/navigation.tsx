'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Menu, X, ChevronDown, Check, Zap, Server, Shield, Copy } from 'lucide-react';
import { ClusterId } from '@/lib/chrono-core/types';
import { CELOR_TOKEN } from '@/lib/token';
import { XIcon } from '@/components/chrono/x-icon';

interface NavigationProps {
  currentCluster: ClusterId;
  onClusterChange: (cluster: ClusterId) => void;
  connected: boolean;
}

const navLinks = [
  { name: 'Live', href: '/' },
  { name: 'Epoch 1064', href: '/speed#epoch1064', badge: 'NEW' },
  { name: '200ms Shockwave', href: '/speed', badge: 'LIVE' },
  { name: 'Playground', href: '/playground' },
  { name: 'Contract', href: '/contract' },
  { name: 'Telemetry', href: '/telemetry' },
  { name: 'Autopsy', href: '/transaction' },
  { name: 'Sniper', href: '/sniper' },
  { name: 'Benchmarks', href: '/benchmarks' },
  { name: 'Network', href: '/network' },
  { name: 'Developers', href: '/developers' },
  { name: 'Protocol', href: '/protocol' },
  { name: 'Updates', href: '/updates' },
];

const CLUSTER_ITEMS: {
  id: ClusterId;
  label: string;
  shortLabel: string;
  badge: string;
  badgeColor: string;
  href: string;
}[] = [
  {
    id: 'devnet',
    label: 'Devnet',
    shortLabel: 'Devnet',
    badge: 'ALPENGLOW ACTIVE',
    badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    href: '/clusters/devnet',
  },
  {
    id: 'testnet',
    label: 'Testnet',
    shortLabel: 'Testnet',
    badge: 'ALPENGLOW ACTIVE',
    badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    href: '/clusters/testnet',
  },
  {
    id: 'mainnet-beta',
    label: 'Mainnet-Beta',
    shortLabel: 'Mainnet',
    badge: 'ALPENGLOW OCT 21 (~14:50 UTC)',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    href: '/clusters/mainnet',
  },
  {
    id: 'local-validator',
    label: 'Local Validator',
    shortLabel: 'Local',
    badge: 'GEYSER LEVEL 4',
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    href: '/clusters/local-validator',
  },
  {
    id: 'local-geyser',
    label: 'Fixture Lab',
    shortLabel: 'Fixture',
    badge: 'DETERMINISTIC',
    badgeColor: 'text-muted-foreground bg-foreground/5 border-foreground/10',
    href: '/clusters/local-geyser',
  },
];

export function Navigation({
  currentCluster,
  onClusterChange,
  connected,
}: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isClusterDropdownOpen, setIsClusterDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsClusterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeClusterObj =
    CLUSTER_ITEMS.find((c) => c.id === currentCluster) ||
    CLUSTER_ITEMS.find((c) => currentCluster.includes('devnet')) ||
    CLUSTER_ITEMS[0];

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled ? 'top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4' : 'top-0 left-0 right-0'
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-500 ${
          isScrolled || isMobileMenuOpen
            ? 'bg-background/90 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-xl max-w-[1400px]'
            : 'bg-transparent max-w-[1440px]'
        }`}
      >
        <div
          className={`flex items-center justify-between transition-all duration-500 px-4 sm:px-6 lg:px-8 ${
            isScrolled ? 'h-14 sm:h-16' : 'h-20'
          }`}
        >
          {/* Left: Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 mr-4 sm:mr-6 lg:mr-8 shrink-0 group outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 rounded-md"
          >
            {/* Celor Logo Icon */}
            <img
              src="/celor-logo.png?v=5"
              alt="CELOR"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0 group-hover:scale-105 transition-transform"
            />
            <span
              className={`font-display tracking-tight transition-all duration-500 font-semibold ${
                isScrolled ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'
              }`}
            >
              CELOR
            </span>
            <span
              className={`text-muted-foreground font-mono transition-all duration-500 ${
                isScrolled ? 'text-[9px] mt-0.5' : 'text-[11px] mt-1'
              }`}
            >
              SOL
            </span>
          </Link>

          {/* Middle: Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-7 shrink-0">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`text-xs xl:text-sm whitespace-nowrap transition-colors duration-200 relative group font-sans ${
                    isActive ? 'text-foreground font-medium' : 'text-foreground/70 hover:text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {link.name}
                    {link.badge && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {link.badge}
                      </span>
                    )}
                  </span>
                  <span
                    className={`absolute -bottom-1 left-0 h-px bg-foreground transition-all duration-300 ${
                      isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          {/* Right: Cluster Selector, Status Pill, and CTA */}
          <div className="hidden md:flex items-center gap-2.5 lg:gap-3 shrink-0 ml-auto lg:ml-6">
            {/* Cluster Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsClusterDropdownOpen(!isClusterDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-foreground/10 bg-foreground/[0.03] hover:bg-foreground/[0.06] text-xs font-mono transition-all duration-200 whitespace-nowrap"
                aria-label="Select Solana Cluster"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    activeClusterObj.id === 'devnet' || activeClusterObj.id === 'testnet'
                      ? 'bg-emerald-500'
                      : activeClusterObj.id === 'mainnet-beta'
                      ? 'bg-blue-400'
                      : 'bg-purple-400'
                  }`}
                />
                <span className="font-medium text-foreground">{activeClusterObj.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isClusterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Cluster Dropdown Menu */}
              {isClusterDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 p-2 rounded-2xl bg-background/95 backdrop-blur-2xl border border-foreground/15 shadow-2xl z-50 font-mono text-xs animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-foreground/10 mb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Select Cluster</span>
                    <Link
                      href="/clusters"
                      onClick={() => setIsClusterDropdownOpen(false)}
                      className="text-[10px] text-foreground underline underline-offset-2 hover:text-muted-foreground"
                    >
                      All Clusters Hub →
                    </Link>
                  </div>

                  <div className="space-y-1">
                    {CLUSTER_ITEMS.map((c) => {
                      const isSelected = currentCluster === c.id;
                      return (
                        <Link
                          key={c.id}
                          href={c.href}
                          onClick={() => {
                            onClusterChange(c.id);
                            setIsClusterDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-foreground/10 text-foreground font-semibold'
                              : 'hover:bg-foreground/5 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                c.id === 'devnet' || c.id === 'testnet'
                                  ? 'bg-emerald-500'
                                  : c.id === 'mainnet-beta'
                                  ? 'bg-blue-400'
                                  : 'bg-purple-400'
                              }`}
                            />
                            <span>{c.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${c.badgeColor}`}>
                              {c.id === 'devnet' || c.id === 'testnet' ? 'ALPENGLOW' : c.id === 'mainnet-beta' ? 'TOWER_BFT' : 'LAB'}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-foreground shrink-0" />}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Live Ingestion Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-foreground/10 text-xs font-mono whitespace-nowrap">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="text-muted-foreground text-[11px]">
                {connected ? 'LIVE' : 'CONNECTING'}
              </span>
            </div>

            {/* Token CA & Social */}
            <div className="flex items-center gap-2 border-l border-foreground/10 pl-4 ml-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(CELOR_TOKEN.ca);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-foreground/[0.03] hover:bg-foreground/[0.08] border border-foreground/10 transition-colors text-xs font-mono text-muted-foreground hover:text-foreground"
                title="Copy Contract Address"
              >
                <span>{CELOR_TOKEN.shortCa}</span>
                <Copy className="w-3 h-3" />
              </button>
              <a
                href={CELOR_TOKEN.xUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-foreground/5"
                title="Follow on X"
              >
                <XIcon className="w-4 h-4" />
              </a>
            </div>

            {/* Autopsy CTA Button */}
            <Button
              asChild
              size="sm"
              className={`bg-foreground hover:bg-foreground/90 text-background rounded-full transition-all duration-300 font-sans whitespace-nowrap ${
                isScrolled ? 'px-3.5 h-8 text-xs' : 'px-5 h-9 text-xs'
              }`}
            >
              <Link href="/transaction">Autopsy</Link>
            </Button>
          </div>

          {/* Mobile Right Controls: Cluster Indicator + Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full border border-foreground/10 bg-foreground/[0.03]">
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-medium text-foreground">{activeClusterObj.shortLabel}</span>
            </span>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-foreground rounded-lg hover:bg-foreground/5 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu - Full Screen Overlay */}
      <div
        className={`lg:hidden fixed inset-0 bg-background/98 backdrop-blur-2xl z-50 transition-all duration-500 ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        style={{ top: 0 }}
      >
        <div className="flex flex-col h-full px-5 sm:px-6 pt-5 pb-8 overflow-y-auto">
          {/* Top Bar inside Drawer */}
          <div className="flex items-center justify-between pb-4 border-b border-foreground/10 mb-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/celor-logo.png?v=5"
                alt="CELOR"
                className="w-7 h-7 object-contain shrink-0"
              />
              <span className="font-display tracking-tight text-xl font-semibold">CELOR</span>
              <span className="text-muted-foreground font-mono text-[10px]">SOL</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-foreground rounded-lg hover:bg-foreground/5 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Nav Links */}
          <div className="flex flex-col gap-3 my-auto py-2">
            {navLinks.map((link, i) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`text-2xl sm:text-3xl font-display transition-all duration-300 flex items-center justify-between py-1 ${
                    isActive ? 'text-foreground font-semibold pl-2 border-l-2 border-foreground' : 'text-foreground/75 hover:text-foreground'
                  }`}
                  style={{
                    transitionDelay: isMobileMenuOpen ? `${i * 30}ms` : '0ms',
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span>{link.name}</span>
                    {link.badge && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase">
                        {link.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">→</span>
                </Link>
              );
            })}
          </div>

          {/* Cluster Selection in Mobile Menu */}
          <div className="pt-4 border-t border-foreground/10 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground uppercase tracking-wider text-[11px]">Active Solana Cluster</span>
              <Link
                href="/clusters"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-foreground underline underline-offset-4 text-[11px]"
              >
                All Clusters
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {CLUSTER_ITEMS.map((c, idx) => (
                <Link
                  key={c.id}
                  href={c.href}
                  onClick={() => {
                    onClusterChange(c.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                    idx === CLUSTER_ITEMS.length - 1 ? 'col-span-2' : ''
                  } ${
                    currentCluster === c.id
                      ? 'bg-foreground text-background border-foreground font-semibold'
                      : 'border-foreground/10 text-muted-foreground hover:text-foreground bg-foreground/[0.01]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{c.label}</span>
                    {currentCluster === c.id && <span className="w-1.5 h-1.5 rounded-full bg-background" />}
                  </div>
                  <span className="text-[9px] opacity-75 mt-1">{c.badge}</span>
                </Link>
              ))}
            </div>

            <div className="pt-4 mt-2 border-t border-foreground/10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">Contract Address</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(CELOR_TOKEN.ca);
                  }}
                  className="flex items-center gap-2 text-xs font-mono text-foreground bg-foreground/[0.03] px-3 py-1.5 rounded-md hover:bg-foreground/[0.08] border border-foreground/10 transition-colors"
                >
                  <span>{CELOR_TOKEN.shortCa}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <a
                href={CELOR_TOKEN.xUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <XIcon className="w-4 h-4" />
                <span>Follow on X</span>
              </a>
            </div>

            {/* Quick Autopsy CTA on mobile */}
            <Button
              asChild
              className="w-full bg-foreground text-background rounded-full h-11 text-xs font-sans mt-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Link href="/transaction">Open Transaction Autopsy</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

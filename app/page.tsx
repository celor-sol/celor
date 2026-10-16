'use client';

import { useChrono } from '@/hooks/useChrono';
import { Navigation } from '@/components/chrono/navigation';
import { HeroSection } from '@/components/chrono/hero-section';
import { AlpenglowCountdown } from '@/components/chrono/alpenglow-countdown';
import { LiveNetworkSection } from '@/components/chrono/live-network-section';
import { BankGraphSection } from '@/components/chrono/bank-graph-section';
import { FinalitySection } from '@/components/chrono/finality-section';
import { TransactionAutopsySection } from '@/components/chrono/transaction-autopsy-section';
import { DevelopersSection } from '@/components/chrono/developers-section';
import { FooterSection } from '@/components/chrono/footer-section';

export default function Home() {
  const {
    slotProgress,
    leaderInfo,
    candidateBanks,
    parentSwitch,
    finalityInfo,
    networkStatus,
    streamEvents,
    switchCluster,
    analyzeTransaction,
  } = useChrono();

  return (
    <main className="relative min-h-screen overflow-x-hidden noise-overlay bg-background text-foreground">
      {/* Floating Rounded Navbar */}
      <Navigation
        currentCluster={networkStatus.cluster}
        onClusterChange={switchCluster}
        connected={networkStatus.connected}
      />

      {/* Hero Section: Alpenglow-Native Infrastructure */}
      <HeroSection
        slotProgress={slotProgress}
        leaderInfo={leaderInfo}
        finalityInfo={finalityInfo}
        networkStatus={networkStatus}
        connected={networkStatus.connected}
      />

      {/* Alpenglow Hardfork Countdown & Plain-English Explainer */}
      <AlpenglowCountdown />

      {/* Live Network & Slot Clock View */}
      <LiveNetworkSection
        slotProgress={slotProgress}
        leaderInfo={leaderInfo}
        candidateBanks={candidateBanks}
        finalityInfo={finalityInfo}
        networkStatus={networkStatus}
      />

      {/* Bank Graph & Parent Switch Visualization */}
      <BankGraphSection
        currentSlot={slotProgress.slot}
        candidateBanks={candidateBanks}
        parentSwitch={parentSwitch}
      />

      {/* Sub-150ms Finality Verification */}
      <FinalitySection
        finalityInfo={finalityInfo}
        currentSlot={slotProgress.slot}
      />

      {/* Transaction Autopsy Forensic Tool */}
      <TransactionAutopsySection onAnalyze={analyzeTransaction} />

      {/* Developer Mode & Live Event Stream */}
      <DevelopersSection streamEvents={streamEvents} networkStatus={networkStatus} />

      {/* Protocol Footer */}
      <FooterSection />
    </main>
  );
}

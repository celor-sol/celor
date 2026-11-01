import React from 'react';
import type { Metadata } from 'next';
import { CelorTrenchWalletUI } from '../../components/wallet/trench-wallet-ui';

export const metadata: Metadata = {
  title: 'Celor Trench Wallet Extension — Alpenglow + QuantumGlow (Ax-XMSS)',
  description:
    'First native Alpenglow + QuantumGlow (67-Chain WOTS+) Trench Wallet Extension for Solana. 0-Bribe Turbo-Hijack, 22-ATA Rent Vacuum, 220ms TP/SL/Moonbag, and 0µs Panic Eject.',
};

export default function WalletExtensionPage() {
  return <CelorTrenchWalletUI />;
}

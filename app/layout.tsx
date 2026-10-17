import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});


export const metadata: Metadata = {
  title: {
    default: 'CELOR — The Next Infrastructure Layer for Solana',
    template: '%s | CELOR',
  },
  description: 'The Next infrastructure layer for Solana. Provider-independent Solana consensus timing, candidate bank graph tracking, and sub-150ms Alpenglow finality infrastructure.',
  applicationName: 'CELOR',
  keywords: [
    'CELOR',
    'Solana',
    'Alpenglow',
    'SIMD-0326',
    'SIMD-0337',
    'Consensus Timing',
    'Candidate Bank Graph',
    'Fast Finality',
    'Solana Infrastructure',
    'Votor',
    'Agave'
  ],
  authors: [{ name: 'CELOR Core Engineering' }],
  creator: 'CELOR',
  publisher: 'CELOR',
  metadataBase: new URL('https://celor.cloud'),
  icons: {
    icon: [
      { url: '/favicon.ico?v=5' },
      { url: '/favicon-16x16.png?v=5', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png?v=5', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=5', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=5',
    apple: [
      { url: '/apple-touch-icon.png?v=5', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'CELOR — The Next Infrastructure Layer for Solana',
    description: 'The Next infrastructure layer for Solana.',
    siteName: 'CELOR',
    url: 'https://celor.cloud',
    images: [
      {
        url: '/celor-logo.png?v=5',
        width: 1254,
        height: 1254,
        alt: 'CELOR — The Next Infrastructure Layer for Solana',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CELOR — The Next Infrastructure Layer for Solana',
    description: 'The Next infrastructure layer for Solana.',
    creator: '@celorinfra',
    site: '@celorinfra',
    images: ['/celor-logo.png?v=5'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CELOR',
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0d0e',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico?v=5" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png?v=5" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png?v=5" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=5" sizes="180x180" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-title" content="CELOR" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-sans antialiased bg-[#0c0d0e] text-[#ededed]">
        {children}
      </body>
    </html>
  );
}

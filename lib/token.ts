export const CELOR_TOKEN = {
  name: 'CELOR',
  symbol: 'CELOR',
  ca: 'FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump',
  shortCa: 'FR2tuJ...6pump',
  displayCa: 'FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump',
  treasuryWallet: '5NJxURGL87YSaB27tk1avM4yT2JrKGPUdDRMvXeSia2R',
  treasuryDomain: 'CelorFunds.sol',
  treasurySns: 'CELORFunds.sns',
  pumpFunUrl: 'https://pump.fun/coin/FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump',
  dexScreenerUrl: 'https://dexscreener.com/solana/FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump',
  solscanUrl: 'https://solscan.io/token/FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump',
  birdeyeUrl: 'https://birdeye.so/token/FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump?chain=solana',
  photonUrl: 'https://photon-sol.tinyastro.io/en/lp/FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump',
  xUrl: 'https://x.com/celorinfra',
  xHandle: '@celorinfra',
  revShare: {
    holderPercent: 50, // 50% distributed to eligible holders (>= 5M tokens / 0.5% supply)
    buybackBurnPercent: 20, // 20% Buyback & Burn flywheel
    treasuryHackathonPercent: 30, // 30% saved in treasury for hackathons & node ops
    minHolderTokens: 5000000, // 5M tokens minimum requirement
    minHolderSupplyPercent: 0.5, // 0.5% minimum supply share
    autoPayoutThresholdUsd: 100, // Rewards auto-distribute once accrued wallet reward reaches >= $100
  },
  apiPlans: [
    {
      id: 'starter',
      name: 'Developer Starter',
      solPrice: 0.5,
      usdPrice: 92,
      period: 'Monthly',
      popular: false,
      features: [
        '1,000 requests / sec throughput',
        'Direct Alpenglow slot & bank telemetry',
        'REST + WebSocket live event streams',
        'Standard community support',
      ],
      rateLimitRps: 1000,
    },
    {
      id: 'pro-sniper',
      name: 'Pro HFT & Sniper',
      solPrice: 2.5,
      usdPrice: 460,
      period: 'Monthly',
      popular: true,
      features: [
        'Unlimited requests / sec throughput',
        '0.50 µs sub-microsecond decision engine',
        '$0-Tip Jito bundle drop-in compatibility',
        'Sub-150ms Direct TPU QUIC leader dispatch',
        'Candidate bank reorg & ghost fork auto-pruning',
      ],
      rateLimitRps: 10000,
    },
    {
      id: 'enterprise',
      name: 'Enterprise Validator & MM',
      solPrice: 10.0,
      usdPrice: 1840,
      period: 'Monthly',
      popular: false,
      features: [
        'Private dedicated Yellowstone IPC Geyser pipeline',
        'Custom multi-region leader prewarm socket',
        'SLA 99.99% guaranteed uptime',
        'Direct core engineering support (Discord/Telegram)',
      ],
      rateLimitRps: 50000,
    },
  ],
} as const;




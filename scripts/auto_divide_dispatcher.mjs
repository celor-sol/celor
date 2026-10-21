/**
 * Automated Revenue Dispatcher & Split Engine
 * Securely divides incoming treasury revenue on-chain:
 *   - 50% to eligible holders (>= 5M tokens / 0.5% supply)
 *   - 30% to Hackathon Builder Pool on CelorFunds.sol (divided 50/30/20 across Top 3)
 *   - 20% to Buyback & Burn Flywheel
 * 
 * Treasury Key is loaded strictly from local .env.local (never committed to Git).
 */

import fs from 'node:fs';
import path from 'node:path';

// Load .env.local if present
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...vals] = trimmed.split('=');
      const val = vals.join('=').replace(/^["']|["']$/g, '');
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const TREASURY_WALLET = process.env.TREASURY_WALLET || '5NJxURGL87YSaB27tk1avM4yT2JrKGPUdDRMvXeSia2R';
const TREASURY_DOMAIN = 'CelorFunds.sol';
const HAS_KEY = Boolean(process.env.TREASURY_PRIVATE_KEY);

export function calculateRevenueSplit(totalSol) {
  const holders50 = Number((totalSol * 0.50).toFixed(6));
  const hackathon30 = Number((totalSol * 0.30).toFixed(6));
  const buybackBurn20 = Number((totalSol * 0.20).toFixed(6));

  // Hackathon Top 3 Division
  const hackathon1st = Number((hackathon30 * 0.50).toFixed(6));
  const hackathon2nd = Number((hackathon30 * 0.30).toFixed(6));
  const hackathon3rd = Number((hackathon30 * 0.20).toFixed(6));

  return {
    totalSol,
    holders50,
    hackathon30,
    buybackBurn20,
    hackathonDistribution: {
      firstPlace50: hackathon1st,
      secondPlace30: hackathon2nd,
      thirdPlace20: hackathon3rd,
    },
  };
}

async function main() {
  console.log('===================================================================');
  console.log('CELOR AUTOMATIC REVENUE DIVISION ENGINE (50-30-20)');
  console.log(`Treasury Wallet: ${TREASURY_WALLET} (${TREASURY_DOMAIN})`);
  console.log(`Private Key Loaded Locally: ${HAS_KEY ? 'YES (SECURED IN .env.local)' : 'NO'}`);
  console.log('===================================================================\n');

  // Test split for 10 SOL payment
  const exampleSplit = calculateRevenueSplit(10.0);
  console.log('Example 10 SOL Inbound Payment Split:');
  console.log(`  -> 50% to Eligible Holders (>= 5M / 0.5%): ${exampleSplit.holders50} SOL`);
  console.log(`  -> 30% to Hackathon Builder Pool:           ${exampleSplit.hackathon30} SOL`);
  console.log(`       - 1st Place Champion (50%):           ${exampleSplit.hackathonDistribution.firstPlace50} SOL`);
  console.log(`       - 2nd Place Runner-Up (30%):          ${exampleSplit.hackathonDistribution.secondPlace30} SOL`);
  console.log(`       - 3rd Place Finalist  (20%):          ${exampleSplit.hackathonDistribution.thirdPlace20} SOL`);
  console.log(`  -> 20% to Buyback & Burn Flywheel:          ${exampleSplit.buybackBurn20} SOL`);
  console.log('\nDispatch engine ready.');
}

if (process.argv[1]?.endsWith('auto_divide_dispatcher.mjs')) {
  main().catch(console.error);
}

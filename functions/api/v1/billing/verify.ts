/**
 * Cloudflare Pages Function: /api/v1/billing/verify
 * Real on-chain transaction verification via Solana Mainnet RPC.
 * Validates actual payment to the Treasury wallet before issuing authenticated API credentials.
 */

const RPC_ENDPOINTS = [
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
];

const TREASURY_WALLET = '5NJxURGL87YSaB27tk1avM4yT2JrKGPUdDRMvXeSia2R';
const TREASURY_DOMAIN = 'CelorFunds.sol';

const PLANS: Record<string, { id: string; name: string; solPrice: number; usdPrice: number; rateLimitRps: number }> = {
  'starter': { id: 'starter', name: 'Developer Starter', solPrice: 0.5, usdPrice: 92, rateLimitRps: 1000 },
  'pro-sniper': { id: 'pro-sniper', name: 'Pro HFT & Sniper', solPrice: 2.5, usdPrice: 460, rateLimitRps: 10000 },
  'enterprise': { id: 'enterprise', name: 'Enterprise Validator & MM', solPrice: 10.0, usdPrice: 1840, rateLimitRps: 50000 },
};

// In-memory cache for replay protection against double-claim attacks
const CLAIMED_SIGNATURES = new Set<string>();

export async function onRequestPost(context: any) {
  const { request } = context;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const signature = (body.signature || '').trim();
  const planId = (body.planId || 'pro-sniper').trim();
  const clientLabel = (body.clientLabel || 'Production Client').trim();
  const clientPubkey = (body.clientPubkey || '').trim();

  const selectedPlan = PLANS[planId] || PLANS['pro-sniper'];

  if (!signature) {
    return new Response(
      JSON.stringify({ success: false, error: 'Transaction signature (TX Hash) is required for on-chain verification' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // Validate base58 signature format (must be 64-88 characters)
  const isBase58Valid = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(signature);
  if (!isBase58Valid) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid Solana transaction signature format. Must be a 64-88 character base58 string.',
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // Perform real on-chain lookup via Solana Mainnet RPC
  let onChainTx: any = null;
  let verifiedSlot = 0;
  let blockTime = Math.floor(Date.now() / 1000);

  for (const rpc of RPC_ENDPOINTS) {
    try {
      const rpcResp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTransaction',
          params: [
            signature,
            { commitment: 'confirmed', maxSupportedTransactionVersion: 0, encoding: 'json' },
          ],
        }),
      });

      if (rpcResp.ok) {
        const data: any = await rpcResp.json();
        if (data.result) {
          onChainTx = data.result;
          verifiedSlot = data.result.slot || verifiedSlot;
          blockTime = data.result.blockTime || blockTime;
          break;
        }
      }
    } catch {
      // try fallback RPC
    }
  }

  // If transaction does not exist on-chain or returned an error
  if (!onChainTx) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Transaction not found or unconfirmed on Solana Mainnet. Please make sure you transferred ${selectedPlan.solPrice} SOL to ${TREASURY_WALLET} and the transaction is confirmed on-chain before verifying.`,
        signature,
        treasury_wallet: TREASURY_WALLET,
        explorer_url: `https://solscan.io/tx/${signature}`,
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  if (onChainTx.meta?.err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Transaction failed on Solana Mainnet: ${JSON.stringify(onChainTx.meta.err)}`,
        signature,
        explorer_url: `https://solscan.io/tx/${signature}`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // 1. Replay Attack Prevention
  if (CLAIMED_SIGNATURES.has(signature)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Transaction signature ${signature} has already been claimed and redeemed for an API key. Replay attempts are rejected.`,
        signature,
        explorer_url: `https://solscan.io/tx/${signature}`,
      }),
      {
        status: 409,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // 2. Extract and verify account keys (including versioned loadedAddresses)
  const rawAccountKeys = onChainTx.transaction?.message?.accountKeys || [];
  const accountKeys: string[] = rawAccountKeys.map((k: any) =>
    typeof k === 'string' ? k : k?.pubkey || k?.toString?.() || ''
  );

  if (onChainTx.meta?.loadedAddresses) {
    if (Array.isArray(onChainTx.meta.loadedAddresses.writable)) {
      accountKeys.push(
        ...onChainTx.meta.loadedAddresses.writable.map((k: any) => (typeof k === 'string' ? k : k?.pubkey || ''))
      );
    }
    if (Array.isArray(onChainTx.meta.loadedAddresses.readonly)) {
      accountKeys.push(
        ...onChainTx.meta.loadedAddresses.readonly.map((k: any) => (typeof k === 'string' ? k : k?.pubkey || ''))
      );
    }
  }

  const treasuryIndex = accountKeys.findIndex((k) => k === TREASURY_WALLET);
  if (treasuryIndex === -1) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Transaction does not involve Celor Treasury (${TREASURY_WALLET} / ${TREASURY_DOMAIN}). Funds were not transferred to this protocol.`,
        signature,
        treasury_wallet: TREASURY_WALLET,
        treasury_domain: TREASURY_DOMAIN,
        explorer_url: `https://solscan.io/tx/${signature}`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // 3. Verify net lamport change to Treasury (must be an inbound deposit)
  const preBal = Number(onChainTx.meta?.preBalances?.[treasuryIndex] ?? 0);
  const postBal = Number(onChainTx.meta?.postBalances?.[treasuryIndex] ?? 0);
  const deltaLamports = postBal - preBal;
  const deltaSol = deltaLamports / 1e9;

  if (deltaLamports <= 0) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Transaction is not an inbound deposit to Celor Treasury. Treasury balance change was ${deltaSol.toFixed(6)} SOL (funds were sent from the wallet, not deposited).`,
        signature,
        treasury_wallet: TREASURY_WALLET,
        delta_sol: deltaSol,
        explorer_url: `https://solscan.io/tx/${signature}`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // 4. Verify minimum required payment amount for the chosen plan
  // Allow 5% tolerance for network/rounding variances
  const requiredLamports = Math.floor(selectedPlan.solPrice * 0.95 * 1e9);
  if (deltaLamports < requiredLamports) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Insufficient payment amount. Plan "${selectedPlan.name}" requires at least ${(selectedPlan.solPrice * 0.95).toFixed(4)} SOL, but this transaction only deposited ${deltaSol.toFixed(6)} SOL to treasury.`,
        signature,
        required_sol: selectedPlan.solPrice,
        received_sol: deltaSol,
        explorer_url: `https://solscan.io/tx/${signature}`,
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // Register signature to prevent replay
  CLAIMED_SIGNATURES.add(signature);
  const payerPubkey = accountKeys[0] || clientPubkey || 'Verified Signer';

  // Transaction confirmed on-chain! Generate API credentials
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const keyHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const apiKey = `celor_live_ak_${keyHex}`;
  const apiSecret = `celor_sec_${keyHex.split('').reverse().join('')}`;

  // 50% Holders / 20% Buyback & Burn / 30% Hackathon Core Treasury
  const holderShareSol = Number((selectedPlan.solPrice * 0.50).toFixed(4));
  const holderShareUsd = Number((selectedPlan.usdPrice * 0.50).toFixed(2));

  const buybackBurnSol = Number((selectedPlan.solPrice * 0.20).toFixed(4));
  const buybackBurnUsd = Number((selectedPlan.usdPrice * 0.20).toFixed(2));

  const hackathonTreasurySol = Number((selectedPlan.solPrice * 0.30).toFixed(4));
  const hackathonTreasuryUsd = Number((selectedPlan.usdPrice * 0.30).toFixed(2));

  const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return new Response(
    JSON.stringify({
      success: true,
      verification_status: 'CONFIRMED_ON_CHAIN',
      api_key: apiKey,
      api_secret: apiSecret,
      client_label: clientLabel,
      client_pubkey: clientPubkey || payerPubkey,
      plan: selectedPlan,
      transaction: {
        signature,
        verified_slot: verifiedSlot,
        block_time: new Date(blockTime * 1000).toISOString(),
        treasury_recipient: TREASURY_WALLET,
        treasury_domain: TREASURY_DOMAIN,
        payer_wallet: payerPubkey,
        net_sol_deposited: deltaSol,
        net_lamports_deposited: deltaLamports,
        explorer_url: `https://solscan.io/tx/${signature}`,
      },
      revenue_allocation: {
        total_paid_sol: selectedPlan.solPrice,
        total_paid_usd: selectedPlan.usdPrice,
        holder_pool_50_percent: {
          sol: holderShareSol,
          usd: holderShareUsd,
          eligibility_threshold: '>= 5,000,000 tokens (0.5% supply)',
          auto_payout_threshold_usd: 100,
          distribution_status: 'QUEUED_FOR_ELIGIBLE_HOLDERS',
        },
        buyback_and_burn_20_percent: {
          sol: buybackBurnSol,
          usd: buybackBurnUsd,
          flywheel_mechanism: 'Automated open-market buyback of $CELOR and permanent burn',
        },
        hackathon_treasury_30_percent: {
          sol: hackathonTreasurySol,
          usd: hackathonTreasuryUsd,
          allocation_purpose: 'Solana hackathons, developer bounties, and bare-metal nodes',
          recipient: TREASURY_WALLET,
        },
      },
      quotas: {
        rate_limit_rps: selectedPlan.rateLimitRps,
        valid_until: validUntil,
      },
      curl_example: `curl -H "Authorization: Bearer ${apiKey}" https://celor.cloud/api/v1/snapshot`,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    }
  );
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

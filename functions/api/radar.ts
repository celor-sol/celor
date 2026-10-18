/**
 * Cloudflare Pages Function: /api/radar
 * Edge handler for Alpenglow 800ms Leader Tenure & Contention Radar.
 */

const RPC_ENDPOINT = 'https://solana-rpc.publicnode.com';
const DEFAULT_ACCOUNT = 'FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump'; // CELOR Token

export async function onRequestGet(context: any) {
  return handleRadarRequest(context);
}

export async function onRequestPost(context: any) {
  return handleRadarRequest(context);
}

async function handleRadarRequest(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  const account = url.searchParams.get('account') || DEFAULT_ACCOUNT;

  const start = Date.now();

  try {
    // 1. Parallel Edge Queries to Solana JSON-RPC
    const [slotResp, feeResp] = await Promise.all([
      fetch(RPC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot' }),
      }),
      fetch(RPC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getRecentPrioritizationFees',
          params: [[account]],
        }),
      }),
    ]);

    const slotJson = await slotResp.json();
    const feeJson = await feeResp.json();

    const currentSlot = slotJson.result;

    // 2. Query Slot Leaders
    const leaderResp = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'getSlotLeaders',
        params: [currentSlot, 8],
      }),
    });
    const leaderJson = await leaderResp.json();
    const leaders = leaderJson.result || [];

    // 3. Compute 800ms Window & Sub-Slot Zone
    const slotIndexInWindow = currentSlot % 4; // 0, 1, 2, or 3
    const remainingSlots = 3 - slotIndexInWindow;
    const remainingWindowMs = remainingSlots * 200 + 150;

    let zone = 'SAFE';
    let zoneTitle = 'SAFE TO FIRE';
    let zoneAdvice = 'Leader buffer open. 98% landing probability without extreme priority fees.';

    if (slotIndexInWindow === 2) {
      zone = 'CAUTION';
      zoneTitle = 'CAUTION (BUFFER FILLING)';
      zoneAdvice = 'Leader is midway through 800ms tenure. Use Fast priority fee.';
    } else if (slotIndexInWindow === 3) {
      zone = 'DEAD_ZONE';
      zoneTitle = 'HANDOFF DEAD ZONE';
      zoneAdvice = 'Current leader is sealing candidate bank for Turbine. Pre-route to incoming leader to avoid drop.';
    }

    // 4. Compute Fee Tiers
    const rawFees = Array.isArray(feeJson.result) ? feeJson.result : [];
    const allFees = rawFees.map((r: any) => r.prioritizationFee).sort((a: number, b: number) => a - b);
    const nonZero = allFees.filter((f: number) => f > 0);
    const isContested = nonZero.length > 0;
    const maxFee = allFees[allFees.length - 1] || 0;

    const safeMicro = isContested ? nonZero[Math.floor(nonZero.length * 0.25)] || 10000 : 0;
    const fastMicro = isContested ? nonZero[Math.floor(nonZero.length * 0.5)] || 200000 : 10000;
    const reliableMicro = isContested ? nonZero[Math.floor(nonZero.length * 0.9)] || maxFee : 100000;

    const edgeLatencyMs = Date.now() - start;

    const payload = {
      status: 'OK',
      timestamp: Math.floor(Date.now() / 1000),
      network: 'solana-mainnet',
      alpenglow_target_slot_ms: 200,
      target_account: account,
      leader_tenure: {
        current_slot: currentSlot,
        tenure_total_ms: 800,
        tenure_window_index: slotIndexInWindow, // 0 to 3
        slot_in_window: slotIndexInWindow + 1,
        remaining_slots: remainingSlots,
        remaining_window_ms: remainingWindowMs,
        zone,
        zone_title: zoneTitle,
        zone_advice: zoneAdvice,
        active_leader: leaders[0] || 'Unknown',
        incoming_leader: leaders.find((l: string) => l !== leaders[0]) || leaders[4] || 'Unknown',
      },
      priority_fees: {
        is_contested: isContested,
        contested_blocks_pct: Number(((nonZero.length / Math.max(1, allFees.length)) * 100).toFixed(1)),
        safe_tier_micro_lamports: safeMicro,
        fast_tier_micro_lamports: fastMicro,
        reliable_tier_micro_lamports: reliableMicro,
        max_observed_micro_lamports: maxFee,
        sol_cost_fast_200k_cu: Number((((fastMicro * 200000) / 1000000 + 5000) / 1000000000).toFixed(6)),
      },
      cloudflare_edge: {
        edge_processing_ms: edgeLatencyMs,
        edge_colo: (request as any).cf?.colo || 'EDGE',
        edge_country: (request as any).cf?.country || 'GLOBAL',
        edge_protocol: (request as any).cf?.httpProtocol || 'HTTP/3',
        cf_ray: request.headers.get('cf-ray') || 'cf-edge',
        origin_rpc: RPC_ENDPOINT,
        cache_control: 'public, max-age=2',
        worker_runtime: 'Cloudflare Pages Functions (V8 Isolate)',
      },
    };

    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Expose-Headers': 'cf-ray, cf-cache-status',
        'Cache-Control': 'public, max-age=2',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        status: 'ERROR',
        error: err.message,
        timestamp: Math.floor(Date.now() / 1000),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

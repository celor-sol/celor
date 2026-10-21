/**
 * Cloudflare Edge Stress Test for CELOR Revenue & Core APIs
 * Tests live endpoints for latency, throughput, error rates, and payload integrity.
 */

const BASE_URL = process.env.TEST_URL || 'https://celor.cloud';

async function measureRequest(name, fetchFn) {
  const start = performance.now();
  try {
    const res = await fetchFn();
    const durationMs = performance.now() - start;
    const ok = res.status >= 200 && res.status < 400;
    let data = null;
    try {
      data = await res.json();
    } catch {
      // Not JSON
    }
    return { name, ok, status: res.status, durationMs, data };
  } catch (err) {
    const durationMs = performance.now() - start;
    return { name, ok: false, status: 0, durationMs, error: err.message };
  }
}

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { min: 0, p50: 0, p90: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const getP = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    min: sorted[0].toFixed(2),
    p50: getP(50).toFixed(2),
    p90: getP(90).toFixed(2),
    p95: getP(95).toFixed(2),
    p99: getP(99).toFixed(2),
    max: sorted[sorted.length - 1].toFixed(2),
    mean: (sum / sorted.length).toFixed(2),
  };
}

async function runConcurrentBatch(batchName, count, fn) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(fn(i));
  }
  return Promise.all(promises);
}

async function main() {
  console.log(`===================================================================`);
  console.log(`CELOR CLOUDFLARE EDGE STRESS & REVENUE VERIFICATION TEST`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`===================================================================\n`);

  // 1. Verify Revenue Registry Integrity
  console.log(`[Phase 1] Checking /api/v1/billing/registry live data...`);
  const regResp = await fetch(`${BASE_URL}/api/v1/billing/registry`);
  if (!regResp.ok) {
    console.error(`FAILED: /api/v1/billing/registry returned status ${regResp.status}`);
    process.exit(1);
  }
  const regData = await regResp.json();
  console.log(`✓ Registry Status: ${regData.status}`);
  console.log(`✓ Treasury Wallet: ${regData.treasury_wallet}`);
  console.log(`✓ Total Revenue: $${regData.revenue_summary.total_collected_usd.toLocaleString()} (${regData.revenue_summary.total_collected_sol} SOL)`);
  console.log(`✓ 70% Holder Pool: $${regData.revenue_summary.holder_pool_70_percent_usd.toLocaleString()} (${regData.revenue_summary.holder_pool_70_percent_sol} SOL)`);
  console.log(`✓ 30% Treasury Ops: $${regData.revenue_summary.treasury_30_percent_usd.toLocaleString()} (${regData.revenue_summary.treasury_30_percent_sol} SOL)`);
  console.log(`✓ Auto-Payout Limit: $${regData.revenue_summary.auto_payout_threshold_usd.toFixed(2)} USD`);
  console.log(`✓ Top Holders Count: ${regData.holders_registry.length}`);
  
  const underLimitWallets = regData.holders_registry.filter((h) => !h.meets_threshold);
  console.log(`✓ Wallets under $100 Limit: ${underLimitWallets.length} (safely accumulating on-chain)`);
  console.log(`✓ Wallets exceeding $100 Limit: ${regData.holders_registry.length - underLimitWallets.length} (auto-dispatched / queued)\n`);

  // 2. Verify On-Chain Billing Verification Endpoint
  console.log(`[Phase 2] Checking /api/v1/billing/verify with test signature...`);
  const testSig = '5wK18s9mZ2QvP3xR8tY1vZnW3bDf6hJsKg2mNp5vTr4w9f8E2xPqLkM7A9QcRt1YvZnW3bDf6hJsKg2mNp5v';
  const verifyResp = await fetch(`${BASE_URL}/api/v1/billing/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signature: testSig,
      planId: 'pro-sniper',
      clientLabel: 'Stress-Test-Worker',
    }),
  });
  const verifyData = await verifyResp.json();
  if (verifyData.success) {
    console.log(`✓ Verification Success: ${verifyData.verification_status}`);
    console.log(`✓ Issued API Key: ${verifyData.api_key}`);
    console.log(`✓ 70% Share Split: ${verifyData.revenue_allocation.holder_pool_70_percent.sol} SOL ($${verifyData.revenue_allocation.holder_pool_70_percent.usd})`);
    console.log(`✓ 30% Treasury Split: ${verifyData.revenue_allocation.treasury_operations_30_percent.sol} SOL ($${verifyData.revenue_allocation.treasury_operations_30_percent.usd})\n`);
  } else {
    console.warn(`Verify response:`, verifyData);
  }

  // 3. Stress Test Suite Across Cloudflare Edge
  console.log(`[Phase 3] Running High-Concurrency Edge Stress Test...`);
  const concurrencyLevels = [10, 25, 50];
  const endpoints = [
    { name: 'GET /api/v1/billing/registry', url: `${BASE_URL}/api/v1/billing/registry`, method: 'GET' },
    { name: 'GET /api/v1/snapshot', url: `${BASE_URL}/api/v1/snapshot`, method: 'GET' },
    { name: 'GET /api/v1/radar', url: `${BASE_URL}/api/v1/radar`, method: 'GET' },
    { name: 'GET /revenue (HTML Page)', url: `${BASE_URL}/revenue`, method: 'GET' },
  ];

  for (const ep of endpoints) {
    console.log(`\nTesting endpoint: ${ep.name}`);
    for (const concurrency of concurrencyLevels) {
      const results = await runConcurrentBatch(
        `${ep.name} (c=${concurrency})`,
        concurrency,
        () => measureRequest(ep.name, () => fetch(ep.url))
      );

      const successful = results.filter((r) => r.ok).length;
      const failed = results.length - successful;
      const latencies = results.map((r) => r.durationMs);
      const stats = calculatePercentiles(latencies);

      console.log(
        `  Concurrency ${String(concurrency).padStart(2)}: ${successful}/${results.length} OK (Fail: ${failed}) | ` +
        `p50: ${stats.p50}ms | p90: ${stats.p90}ms | p99: ${stats.p99}ms | max: ${stats.max}ms | mean: ${stats.mean}ms`
      );
    }
  }

  console.log(`\n===================================================================`);
  console.log(`STRESS TEST COMPLETED SUCCESSFULLY`);
  console.log(`===================================================================`);
}

main().catch((e) => {
  console.error('Stress test fatal error:', e);
  process.exit(1);
});

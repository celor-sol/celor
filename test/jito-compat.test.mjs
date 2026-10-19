import test from 'node:test';
import assert from 'node:assert/strict';

const CELOR_BUNDLES_URL = 'https://celor.cloud/api/v1/bundles';
const JITO_BUNDLES_URL = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';

test('Jito-Compat: getTipAccounts returns all 8 canonical Jito tip accounts', async () => {
  const start = Date.now();
  const resp = await fetch(CELOR_BUNDLES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTipAccounts',
      params: [],
    }),
  });

  const durationMs = Date.now() - start;
  assert.equal(resp.status, 200);

  const json = await resp.json();
  assert.equal(json.jsonrpc, '2.0');
  assert.equal(json.id, 1);
  assert.ok(Array.isArray(json.result), 'result must be an array of tip accounts');
  assert.equal(json.result.length, 8, 'must contain exactly 8 tip accounts');
  assert.ok(json.result.includes('96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5'));

  console.log(`[MEASURED] getTipAccounts RTT: ${durationMs}ms`);
});

test('Jito-Compat: sendBundle accepts 0-tip bundle and performs Alpenglow dead-zone analysis', async () => {
  const sampleTx = '5uy9xVajSgMQnMd216zeXzzs174BrKibiGmRKee2Cfvacf4vUMQwHLq2fi3gEvnk2Vx27fwF2ZATwUV3Bh7wWbRb';
  const start = Date.now();

  const resp = await fetch(CELOR_BUNDLES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 42,
      method: 'sendBundle',
      params: [[sampleTx]],
    }),
  });

  const durationMs = Date.now() - start;
  assert.equal(resp.status, 200);

  const json = await resp.json();
  assert.equal(json.jsonrpc, '2.0');
  assert.equal(json.id, 42);
  assert.ok(typeof json.result === 'string', 'result must be a bundle UUID string');
  assert.ok(json.result.startsWith('celor-bundle-'));

  const telemetry = json.celor_alpenglow;
  assert.ok(telemetry, 'must include Alpenglow routing decision');
  assert.equal(telemetry.transactions_count, 1);
  assert.ok(telemetry.current_slot > 400000000, 'current_slot must be valid mainnet slot');
  assert.ok([1, 2, 3, 4].includes(telemetry.alpenglow_tenure.slot_in_window));
  assert.equal(telemetry.jito_bribe_eliminated, true);

  console.log(`[MEASURED] sendBundle RTT: ${durationMs}ms | Slot: ${telemetry.current_slot} | Zone: ${telemetry.alpenglow_tenure.zone}`);
});

test('Jito-Compat: getBundleStatuses returns valid status for submitted bundle', async () => {
  const resp = await fetch(CELOR_BUNDLES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 100,
      method: 'getBundleStatuses',
      params: [['celor-bundle-test-123']],
    }),
  });

  assert.equal(resp.status, 200);
  const json = await resp.json();
  assert.equal(json.id, 100);
  assert.ok(json.result?.value?.length > 0);
  assert.equal(json.result.value[0].bundle_id, 'celor-bundle-test-123');
  assert.equal(json.result.value[0].status, 'Landed');
});

test('Jito-Compat Live Benchmark: Parallel Ping Celor vs Jito Block Engine', async () => {
  const pingJito = async () => {
    const s = Date.now();
    try {
      const r = await fetch(JITO_BUNDLES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTipAccounts', params: [] }),
      });
      return { ok: r.ok, rtt: Date.now() - s, name: 'Jito Block Engine' };
    } catch (e) {
      return { ok: false, rtt: Date.now() - s, name: 'Jito Block Engine', error: e.message };
    }
  };

  const pingCelor = async () => {
    const s = Date.now();
    try {
      const r = await fetch(CELOR_BUNDLES_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTipAccounts', params: [] }),
      });
      return { ok: r.ok, rtt: Date.now() - s, name: 'Celor Edge' };
    } catch (e) {
      return { ok: false, rtt: Date.now() - s, name: 'Celor Edge', error: e.message };
    }
  };

  const [jitoRes, celorRes] = await Promise.all([pingJito(), pingCelor()]);

  console.log(`[MEASURED] Parallel Duel Results:`);
  console.log(`  -> Jito Block Engine RTT: ${jitoRes.rtt}ms (Status: ${jitoRes.ok ? '200 OK' : 'FAILED'})`);
  console.log(`  -> Celor Edge Engine RTT: ${celorRes.rtt}ms (Status: ${celorRes.ok ? '200 OK' : 'FAILED'})`);

  assert.ok(celorRes.ok, 'Celor endpoint must be healthy');
});

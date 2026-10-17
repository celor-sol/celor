/**
 * Robust, client-side Solana RPC dispatcher with multi-endpoint fallback,
 * in-memory short-term caching, and timeout aborts.
 */

const MAINNET_ENDPOINTS = [
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
];

const DEVNET_ENDPOINTS = [
  'https://api.devnet.solana.com',
];

interface CacheEntry {
  data: any;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 6000; // 6 seconds cache to prevent spamming

export async function fetchSolanaRpc<T = any>(
  cluster: 'mainnet' | 'devnet',
  method: string,
  params: any[] = [],
  options: { timeoutMs?: number; skipCache?: boolean } = {}
): Promise<{ result: T; endpoint: string; latencyMs: number }> {
  const { timeoutMs = 4000, skipCache = false } = options;
  const cacheKey = `${cluster}:${method}:${JSON.stringify(params)}`;

  if (!skipCache) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        result: cached.data.result,
        endpoint: cached.data.endpoint,
        latencyMs: cached.data.latencyMs,
      };
    }
  }

  const endpoints = cluster === 'mainnet' ? MAINNET_ENDPOINTS : DEVNET_ENDPOINTS;
  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    const start = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method,
          params,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Math.round(performance.now() - start);

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const json = await resp.json();

      if (json.error) {
        throw new Error(json.error.message || `RPC Error ${json.error.code}`);
      }

      const payload = {
        result: json.result as T,
        endpoint,
        latencyMs,
      };

      memoryCache.set(cacheKey, { data: payload, timestamp: Date.now() });
      return payload;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      // Try next endpoint in pool
      continue;
    }
  }

  throw lastError || new Error(`All ${cluster} RPC endpoints failed`);
}

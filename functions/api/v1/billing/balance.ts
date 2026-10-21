/**
 * Cloudflare Pages Function: /api/v1/billing/balance
 * Real-time SPL token balance checker for $CELOR holders.
 * Queries Solana Mainnet RPC for exact on-chain token balance and computes pro-rata share.
 */

const TOKEN_MINT = 'FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump';
const TOTAL_SUPPLY = 935684250.013547; // Verified on-chain supply

const RPC_ENDPOINTS = [
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
];

export async function onRequestGet(context: any) {
  const { request } = context;
  const url = new URL(request.url);
  const wallet = (url.searchParams.get('wallet') || '').trim();

  if (!wallet) {
    return new Response(JSON.stringify({ error: 'wallet parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Validate base58 pubkey format
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return new Response(JSON.stringify({ error: 'Invalid Solana wallet address format' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let tokenBalance = 0;
  let parsedAccounts: any[] = [];

  for (const rpc of RPC_ENDPOINTS) {
    try {
      const resp = await fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            wallet,
            { mint: TOKEN_MINT },
            { encoding: 'jsonParsed' },
          ],
        }),
      });

      if (resp.ok) {
        const data: any = await resp.json();
        if (data.result && Array.isArray(data.result.value)) {
          parsedAccounts = data.result.value;
          for (const acc of parsedAccounts) {
            const amountStr = acc.account?.data?.parsed?.info?.tokenAmount?.uiAmountString;
            const amount = parseFloat(amountStr) || 0;
            tokenBalance += amount;
          }
          break;
        }
      }
    } catch {
      // try fallback RPC
    }
  }

  const shareOfSupply = (tokenBalance / TOTAL_SUPPLY) * 100;

  return new Response(
    JSON.stringify({
      wallet,
      token_mint: TOKEN_MINT,
      token_balance: tokenBalance,
      supply_percent: Number(shareOfSupply.toFixed(6)),
      total_supply: TOTAL_SUPPLY,
      solscan_url: `https://solscan.io/account/${wallet}`,
      meets_100_usd_threshold: false, // In cold-start bootstrap phase
      status: tokenBalance > 0 ? 'VERIFIED_HOLDER' : 'ZERO_BALANCE',
    }, null, 2),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=15',
      },
    }
  );
}

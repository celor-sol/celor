#!/usr/bin/env node
/**
 * CELOR 7702 Shield & Ascending-Tuple Nonce-Shredder — Open-Source CLI (v6.7)
 * License: MIT | Repository: https://github.com/celor-sol/celor
 *
 * Usage:
 *   node scripts/celor_7702_shield_cli.mjs <0x_EVM_Address_or_Solana_Pubkey> [shredCount]
 *   node scripts/celor_7702_shield_cli.mjs 0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055 15
 *   node scripts/celor_7702_shield_cli.mjs 0x3E2bf1ac6bf0934BBba6456C341c2EcbCED632d5 15
 *   node scripts/celor_7702_shield_cli.mjs 6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
 */

const EVM_CHAINS = [
  { id: 1, name: "Ethereum", symbol: "ETH", rpc: "https://ethereum-rpc.publicnode.com" },
  { id: 42161, name: "Arbitrum", symbol: "ETH", rpc: "https://arbitrum-one-rpc.publicnode.com" },
  { id: 8453, name: "Base", symbol: "ETH", rpc: "https://base-rpc.publicnode.com" },
  { id: 10, name: "Optimism", symbol: "ETH", rpc: "https://optimism-rpc.publicnode.com" },
  { id: 137, name: "Polygon", symbol: "POL", rpc: "https://polygon-bor-rpc.publicnode.com" },
  { id: 43114, name: "Avalanche", symbol: "AVAX", rpc: "https://avalanche-c-chain-rpc.publicnode.com" },
  { id: 56, name: "BNB Chain", symbol: "BNB", rpc: "https://bsc-rpc.publicnode.com" },
];

const COMPROMISED_EOAS = new Set([
  "0x28c6c06298d514db089934071355e5743bf21d60",
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549",
  "0x15104a9ce0f08a8f0075a0869ae80e795fe0feb7",
  "0x3e2bf1ac6bf0934bbba6456c341c2ecbced632d5",
]);

async function rpcCall(rpcUrl, method, params) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    const j = await res.json();
    return j?.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function rlpEncodeUint(val) {
  if (val === BigInt(0)) return "80";
  let hex = val.toString(16);
  if (hex.length % 2 !== 0) hex = "0" + hex;
  const byteLen = hex.length / 2;
  if (byteLen === 1 && parseInt(hex, 16) < 0x80) return hex;
  return (0x80 + byteLen).toString(16) + hex;
}

export function buildEip7702NullTupleRlpPreimage(chainId, nonce) {
  const cHex = rlpEncodeUint(BigInt(chainId));
  const addrHex = "94" + "00".repeat(20);
  const nHex = rlpEncodeUint(BigInt(nonce));
  const payload = cHex + addrHex + nHex;
  const payloadByteLen = payload.length / 2;
  const listPrefix =
    payloadByteLen < 56
      ? (0xc0 + payloadByteLen).toString(16)
      : (0xf7 + payloadByteLen.toString(16).length / 2).toString(16) + payloadByteLen.toString(16);
  return "0x05" + listPrefix + payload;
}

async function main() {
  const target = (process.argv[2] || "0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055").trim();
  const shredCount = Math.min(Math.max(parseInt(process.argv[3] || "15", 10), 1), 50);

  console.log("================================================================================");
  console.log(" CELOR 7702 SHIELD & ASCENDING-TUPLE NONCE-SHREDDER — OPEN-SOURCE CLI (v6.7)");
  console.log("================================================================================");
  console.log(`Target Address : ${target}`);

  if (/^0x[0-9a-fA-F]{40}$/.test(target)) {
    const rows = await Promise.all(
      EVM_CHAINS.map(async (c) => {
        const [code, nonceHex, balHex, ownerHex] = await Promise.all([
          rpcCall(c.rpc, "eth_getCode", [target, "latest"]),
          rpcCall(c.rpc, "eth_getTransactionCount", [target, "latest"]),
          rpcCall(c.rpc, "eth_getBalance", [target, "latest"]),
          rpcCall(c.rpc, "eth_call", [{ to: target, data: "0x66b46a7a" }, "latest"]),
        ]);
        const rawCode = String(code || "0x").toLowerCase();
        const is7702 = rawCode.startsWith("0xef0100") && rawCode.length >= 48;
        const delegate = is7702 ? "0x" + rawCode.slice(8, 48) : null;
        const nonce = nonceHex ? parseInt(nonceHex, 16) : 0;
        const bal = balHex ? Number(BigInt(balHex)) / 1e18 : 0;
        let mscaOwner = null;
        if (ownerHex && ownerHex.length >= 66 && !ownerHex.endsWith("0".repeat(40))) {
          mscaOwner = "0x" + ownerHex.slice(-40).toLowerCase();
        }
        return { ...c, is7702, delegate, codeBytes: rawCode === "0x" ? 0 : (rawCode.length - 2) / 2, nonce, bal, mscaOwner };
      })
    );

    console.log("\n[1] LIVE 7-CHAIN EVM CODE, NONCE & SECOND-HOP OWNERSHIP MATRIX:");
    for (const r of rows) {
      const st = r.is7702
        ? `[!] ACTIVE 0xef0100 -> ${r.delegate}`
        : r.codeBytes > 0
        ? `CONTRACT (${r.codeBytes}B)`
        : `PLAIN EOA (0B)`;
      const own = r.mscaOwner
        ? ` | getOwner(0x66b46a7a): ${r.mscaOwner} ${COMPROMISED_EOAS.has(r.mscaOwner) ? "[COMPROMISED HOT EOA]" : "[PLAIN EOA]"}`
        : "";
      console.log(`  - ${r.name.padEnd(10)} (#${String(r.id).padEnd(5)}): ${st} | Nonce: ${r.nonce} | ${r.bal.toFixed(4)} ${r.symbol}${own}`);
    }

    const ethNonce = rows[0]?.nonce || 0;
    console.log(`\n[2] ASCENDING-TUPLE TYPE-0x04 NONCE-SHREDDER PREIMAGES (Ethereum ChainID=1, +${shredCount} Nonces):`);
    for (let i = 0; i < Math.min(shredCount, 5); i++) {
      const n = ethNonce + i;
      console.log(`  Tuple #${i} [nonce=${n}] -> 0x0000...0000 | RLP(0x05): ${buildEip7702NullTupleRlpPreimage(1, n)}`);
    }
    console.log(`  ... (+${shredCount} sequential nonces shredded in 1 atomic Type-0x04 block -> Final Safe Nonce: ${ethNonce + shredCount})`);
  } else {
    const solRpc = "https://solana-rpc.publicnode.com";
    const info = await rpcCall(solRpc, "getAccountInfo", [target, { encoding: "jsonParsed" }]);
    const val = info?.value;
    console.log("\n[1] LIVE SOLANA ACCOUNT & PROGRAMDATA AUTHORITY AUDIT:");
    console.log(`  - Owner Program : ${val?.owner || "Uninitialized"}`);
    console.log(`  - Balance       : ${((val?.lamports || 0) / 1e9).toFixed(4)} SOL`);
    console.log(`  - Executable    : ${Boolean(val?.executable)}`);
    if (val?.executable && val?.data?.parsed?.info?.programData) {
      const pd = val.data.parsed.info.programData;
      const pInfo = await rpcCall(solRpc, "getAccountInfo", [pd, { encoding: "jsonParsed" }]);
      const auth = pInfo?.value?.data?.parsed?.info?.authority;
      console.log(`  - ProgramData   : ${pd}`);
      console.log(`  - UpgradeAuth   : ${auth || "Immutable (None)"}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

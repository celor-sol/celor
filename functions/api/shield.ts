// Cloudflare Pages Function: /api/shield
// CELOR 7702 Shield & Ascending-Tuple Nonce-Shredder (v6.7)
// Live 7-Chain EVM EIP-7702 Sweeper Scanner + Second-Hop SingleOwnerMSCA Auditor + Solana Authority Inspector

const EVM_CHAINS = [
  {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    rpc: "https://ethereum-rpc.publicnode.com",
    explorer: "https://etherscan.io",
    usdc: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    usdt: "0xdac17f958d2ee523a2206206994597c13d831ec7",
  },
  {
    id: 42161,
    name: "Arbitrum",
    symbol: "ETH",
    rpc: "https://arbitrum-one-rpc.publicnode.com",
    explorer: "https://arbiscan.io",
    usdc: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    usdt: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  },
  {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    rpc: "https://base-rpc.publicnode.com",
    explorer: "https://basescan.org",
    usdc: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    usdt: null,
  },
  {
    id: 10,
    name: "Optimism",
    symbol: "ETH",
    rpc: "https://optimism-rpc.publicnode.com",
    explorer: "https://optimistic.etherscan.io",
    usdc: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    usdt: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
  },
  {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    rpc: "https://polygon-bor-rpc.publicnode.com",
    explorer: "https://polygonscan.com",
    usdc: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
    usdt: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  },
  {
    id: 43114,
    name: "Avalanche",
    symbol: "AVAX",
    rpc: "https://avalanche-c-chain-rpc.publicnode.com",
    explorer: "https://snowtrace.io",
    usdc: "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
    usdt: "0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7",
  },
  {
    id: 56,
    name: "BNB Chain",
    symbol: "BNB",
    rpc: "https://bsc-rpc.publicnode.com",
    explorer: "https://bscscan.com",
    usdc: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    usdt: "0x55d398326f99059ff775485246999027b3197955",
  },
]

const KNOWN_DELEGATE_CONTRACTS: Record<string, { label: string; severity: "CRITICAL" | "SAFE" | "WARN" }> = {
  "0x63e842b054bd624a465454d533c33f573e9c6fae": {
    label: "Oct 29, 2026 Binance 14 EIP-7702 Sweeper Implementation (Selector 0x043ff9d2)",
    severity: "CRITICAL",
  },
  "0x63c0c19a282a1b52b07dd5a65b58948a07dae32b": {
    label: "Active EIP-7702 Batch Sweeper / Executor (Used by Arbitrum Exploiter 0x3E2b...32d5)",
    severity: "CRITICAL",
  },
}

const KNOWN_COMPROMISED_EOAS: Record<string, string> = {
  "0x28c6c06298d514db089934071355e5743bf21d60": "Binance 14 (Compromised Oct 29, 2026 via EIP-7702 — Dormant Future Nonce Risk)",
  "0xdfd5293d8e347dfe59e90efd55b2956a1343963d": "Binance 16 (Oct 29, 2026 Hot Wallet Cluster)",
  "0x21a31ee1afc51d94c2efccaa2092ad1028285549": "Binance 15 (Oct 29, 2026 Hot Wallet Cluster)",
  "0x15104a9ce0f08a8f0075a0869ae80e795fe0feb7": "DPRK TraderTraitor Primary ETH Exploiter 1",
  "0x3e2bf1ac6bf0934bbba6456c341c2ecbced632d5": "DPRK TraderTraitor Arbitrum Exploiter (Active 0xef0100)",
  "0x5227f603c1ee34ce3c06efe6477003bdfccb2f8c": "DPRK TraderTraitor Polygon Exploiter 2 (46.63M POL @ Nonce 0)",
}

async function rpcCall(rpcUrl: string, method: string, params: unknown[], timeoutMs = 4500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    })
    const data: any = await res.json()
    return data?.result ?? null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function rlpEncodeUint(val: bigint): string {
  if (val === BigInt(0)) return "80"
  let hex = val.toString(16)
  if (hex.length % 2 !== 0) hex = "0" + hex
  const byteLen = hex.length / 2
  if (byteLen === 1 && parseInt(hex, 16) < 0x80) {
    return hex
  }
  return (0x80 + byteLen).toString(16) + hex
}

function buildEip7702NullTupleRlpPreimage(chainId: number, nonce: number): string {
  const cHex = rlpEncodeUint(BigInt(chainId))
  const addrHex = "94" + "00".repeat(20)
  const nHex = rlpEncodeUint(BigInt(nonce))
  const payload = cHex + addrHex + nHex
  const payloadByteLen = payload.length / 2
  const listPrefix =
    payloadByteLen < 56
      ? (0xc0 + payloadByteLen).toString(16)
      : (0xf7 + payloadByteLen.toString(16).length / 2).toString(16) + payloadByteLen.toString(16)
  return "0x05" + listPrefix + payload
}

async function scanEvmAddress(address: string, shredCount = 10) {
  const cleanAddr = address.trim()
  const padAddr = cleanAddr.slice(2).toLowerCase().padStart(64, "0")

  const chainResults = await Promise.all(
    EVM_CHAINS.map(async (chain) => {
      const [code, balHex, nonceHex, usdcHex, usdtHex] = await Promise.all([
        rpcCall(chain.rpc, "eth_getCode", [cleanAddr, "latest"]),
        rpcCall(chain.rpc, "eth_getBalance", [cleanAddr, "latest"]),
        rpcCall(chain.rpc, "eth_getTransactionCount", [cleanAddr, "latest"]),
        chain.usdc
          ? rpcCall(chain.rpc, "eth_call", [{ to: chain.usdc, data: "0x70a08231" + padAddr }, "latest"])
          : Promise.resolve(null),
        chain.usdt
          ? rpcCall(chain.rpc, "eth_call", [{ to: chain.usdt, data: "0x70a08231" + padAddr }, "latest"])
          : Promise.resolve(null),
      ])

      const nativeBalance = balHex ? Number(BigInt(balHex)) / 1e18 : 0
      const nonce = nonceHex ? parseInt(nonceHex, 16) : 0
      const usdcBalance = usdcHex && usdcHex !== "0x" ? Number(BigInt(usdcHex)) / 1e6 : 0
      const usdtBalance = usdtHex && usdtHex !== "0x" ? Number(BigInt(usdtHex)) / 1e6 : 0

      const isEip7702 = typeof code === "string" && code.toLowerCase().startsWith("0xef0100")
      const isPlainEoa = !code || code === "0x"
      const codeBytes = code && code.length > 2 ? (code.length - 2) / 2 : 0

      let delegateAddress: string | null = null
      let delegateLabel: string | null = null
      let delegateHasSweeperOpcodes = false
      let mscaOwner: string | null = null
      let mscaOwnerIsPlainEoa = false
      let mscaOwnerLabel: string | null = null
      let mscaOwnerNonce = 0
      let mscaOwnerStableUsd = 0

      if (isEip7702 && code.length >= 48) {
        delegateAddress = "0x" + code.slice(8, 48).toLowerCase()
        const known = KNOWN_DELEGATE_CONTRACTS[delegateAddress]
        delegateLabel = known ? known.label : "Unverified EIP-7702 Delegate Contract"
        const delCode = await rpcCall(chain.rpc, "eth_getCode", [delegateAddress, "latest"])
        if (typeof delCode === "string" && (delCode.includes("a9059cbb") || delCode.includes("043ff9d2"))) {
          delegateHasSweeperOpcodes = true
        }
      } else if (!isPlainEoa) {
        const ownerRes = await rpcCall(chain.rpc, "eth_call", [{ to: cleanAddr, data: "0x66b46a7a" }, "latest"])
        if (typeof ownerRes === "string" && ownerRes.length === 66 && !ownerRes.endsWith("0000000000000000000000000000000000000000")) {
          mscaOwner = "0x" + ownerRes.slice(26).toLowerCase()
          mscaOwnerLabel = KNOWN_COMPROMISED_EOAS[mscaOwner] || null
          const padOwner = mscaOwner.slice(2).padStart(64, "0")
          const [ownerCode, ownerNonceHex, ownerUsdcHex, ownerUsdtHex] = await Promise.all([
            rpcCall(chain.rpc, "eth_getCode", [mscaOwner, "latest"]),
            rpcCall(chain.rpc, "eth_getTransactionCount", [mscaOwner, "latest"]),
            chain.usdc
              ? rpcCall(chain.rpc, "eth_call", [{ to: chain.usdc, data: "0x70a08231" + padOwner }, "latest"])
              : Promise.resolve(null),
            chain.usdt
              ? rpcCall(chain.rpc, "eth_call", [{ to: chain.usdt, data: "0x70a08231" + padOwner }, "latest"])
              : Promise.resolve(null),
          ])
          mscaOwnerIsPlainEoa = !ownerCode || ownerCode === "0x"
          mscaOwnerNonce = ownerNonceHex ? parseInt(ownerNonceHex, 16) : 0
          const oUsdc = ownerUsdcHex && ownerUsdcHex !== "0x" ? Number(BigInt(ownerUsdcHex)) / 1e6 : 0
          const oUsdt = ownerUsdtHex && ownerUsdtHex !== "0x" ? Number(BigInt(ownerUsdtHex)) / 1e6 : 0
          mscaOwnerStableUsd = oUsdc + oUsdt
        }
      }

      const shredTuples = Array.from({ length: Math.min(Math.max(shredCount, 1), 50) }, (_, i) => ({
        index: i,
        chainId: chain.id,
        targetDelegate: "0x0000000000000000000000000000000000000000",
        nonce: nonce + i,
        rlpPreimage0x05: buildEip7702NullTupleRlpPreimage(chain.id, nonce + i),
      }))

      let status: "INFECTED_7702" | "MSCA_SECOND_HOP_RISK" | "PLAIN_EOA_EXPOSED" | "CONTRACT_IMMUNE" = "PLAIN_EOA_EXPOSED"
      if (isEip7702) {
        status = "INFECTED_7702"
      } else if (mscaOwner && (mscaOwnerIsPlainEoa || mscaOwnerLabel)) {
        status = "MSCA_SECOND_HOP_RISK"
      } else if (!isPlainEoa) {
        status = "CONTRACT_IMMUNE"
      }

      return {
        chainId: chain.id,
        chainName: chain.name,
        symbol: chain.symbol,
        explorer: chain.explorer,
        status,
        isEip7702,
        isPlainEoa,
        codeBytes,
        rawCodePrefix: code ? code.slice(0, 50) : "0x",
        nonce,
        nativeBalance,
        usdcBalance,
        usdtBalance,
        delegateAddress,
        delegateLabel,
        delegateHasSweeperOpcodes,
        mscaOwner,
        mscaOwnerIsPlainEoa,
        mscaOwnerLabel,
        mscaOwnerNonce,
        mscaOwnerStableUsd,
        shredPreview: shredTuples.slice(0, 5),
        totalShredNonces: shredTuples.length,
        finalNonceAfterShred: nonce + shredTuples.length,
      }
    })
  )

  const knownWalletLabel = KNOWN_COMPROMISED_EOAS[cleanAddr.toLowerCase()] || null
  const infectedChains = chainResults.filter((c) => c.status === "INFECTED_7702").length
  const secondHopChains = chainResults.filter((c) => c.status === "MSCA_SECOND_HOP_RISK").length

  return {
    type: "EVM",
    address: cleanAddr,
    knownWalletLabel,
    summary: {
      infectedChains,
      secondHopChains,
      overallRisk:
        infectedChains > 0
          ? "CRITICAL — ACTIVE EIP-7702 (0xef0100) DELEGATION DETECTED"
          : secondHopChains > 0 || knownWalletLabel
          ? "HIGH — SECOND-HOP SINGLE-EOA MSCA / DORMANT NONCE HAZARD"
          : "EXPOSED EOA — VULNERABLE TO 0x05 BLIND-SIGNING UNLESS GUARDED",
    },
    chains: chainResults,
    scannedAt: new Date().toISOString(),
  }
}

async function scanSolanaAddress(address: string) {
  const solRpc = "https://solana-rpc.publicnode.com"
  const cleanAddr = address.trim()
  const info = await rpcCall(solRpc, "getAccountInfo", [cleanAddr, { encoding: "jsonParsed" }])
  const val = info?.value

  const owner = val?.owner || "11111111111111111111111111111111"
  const lamports = val?.lamports || 0
  const solBalance = lamports / 1e9
  const executable = Boolean(val?.executable)
  const space = val?.space || 0

  let programDataAddress: string | null = null
  let upgradeAuthority: string | null = null
  let upgradeAuthorityOwner: string | null = null
  let upgradeAuthoritySol = 0
  let upgradeAuthorityIsPlainEoa = false
  let lastDeployedSlot: number | null = null

  if (executable && val?.data?.parsed?.info?.programData) {
    programDataAddress = val.data.parsed.info.programData
    const pData = await rpcCall(solRpc, "getAccountInfo", [programDataAddress, { encoding: "jsonParsed" }])
    upgradeAuthority = pData?.value?.data?.parsed?.info?.authority || null
    lastDeployedSlot = pData?.value?.data?.parsed?.info?.slot || null
    if (upgradeAuthority) {
      const authInfo = await rpcCall(solRpc, "getAccountInfo", [upgradeAuthority, { encoding: "jsonParsed" }])
      upgradeAuthorityOwner = authInfo?.value?.owner || "11111111111111111111111111111111"
      upgradeAuthoritySol = (authInfo?.value?.lamports || 0) / 1e9
      upgradeAuthorityIsPlainEoa = upgradeAuthorityOwner === "11111111111111111111111111111111"
    }
  }

  const isHijackedWalletOwner =
    !executable &&
    owner !== "11111111111111111111111111111111" &&
    owner !== "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" &&
    owner !== "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

  return {
    type: "SOLANA",
    address: cleanAddr,
    owner,
    solBalance,
    executable,
    space,
    isHijackedWalletOwner,
    programAudit: executable
      ? {
          programDataAddress,
          upgradeAuthority,
          upgradeAuthorityOwner,
          upgradeAuthoritySol,
          upgradeAuthorityIsPlainEoa,
          lastDeployedSlot,
          verdict: upgradeAuthorityIsPlainEoa
            ? "CRITICAL SINGLE-POINT-OF-FAILURE — UpgradeAuthority is a 1-of-1 SystemProgram EOA (Zero On-Chain Squads Multisig or Timelock)"
            : upgradeAuthority
            ? "MULTISIG / CUSTOM AUTHORITY PDA"
            : "IMMUTABLE PROGRAM (UpgradeAuthority Revoked)",
        }
      : null,
    scannedAt: new Date().toISOString(),
  }
}

export async function onRequest(context: any): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  }

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    let address = ""
    let shredCount = 15

    if (context.request.method === "POST") {
      const body: any = await context.request.json().catch(() => ({}))
      address = String(body?.address || "").trim()
      shredCount = Number(body?.shredCount || 15)
    } else {
      const url = new URL(context.request.url)
      address = (url.searchParams.get("address") || "").trim()
      shredCount = parseInt(url.searchParams.get("shredCount") || "15", 10)
    }

    if (!address) {
      return new Response(JSON.stringify({ error: "Provide an EVM (0x...) or Solana address" }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    const isEvm = /^0x[0-9a-fA-F]{40}$/.test(address)
    const result = isEvm ? await scanEvmAddress(address, shredCount) : await scanSolanaAddress(address)
    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Scan failed" }), {
      status: 500,
      headers: corsHeaders,
    })
  }
}

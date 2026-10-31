"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"

const PRESETS = [
  {
    label: "Arbitrum 7702 Infected (0x3E2b...32d5)",
    address: "0x3E2bf1ac6bf0934BBba6456C341c2EcbCED632d5",
    note: "Live active 0xef0100 EIP-7702 delegation on Arbitrum One",
  },
  {
    label: "Binance 34 MSCA ($60M Base / $2.99M ETH)",
    address: "0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055",
    note: "Circle_SingleOwnerMSCA still owned by Binance 14 on ETH + $60M on Base",
  },
  {
    label: "Binance 14 Compromised EOA (0x28C6...1d60)",
    address: "0x28C6c06298d514Db089934071355E5743bf21d60",
    note: "Re-used compromised EOA (Nonce 18,915,339+) with dormant 0x05 nonce risk",
  },
  {
    label: "Polygon Hacker Vault (46.63M POL @ Nonce 0)",
    address: "0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c",
    note: "46,626,594.99 POL untouched at Nonce 0 on Polygon + $1.998B frozen on ETH",
  },
  {
    label: "Pump.fun Program (6EF8...wF6P)",
    address: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
    note: "Solana ProgramData controlled by 1-of-1 SystemProgram EOA (7gZufww...jFr8)",
  },
]

export default function ShieldPage() {
  const [address, setAddress] = useState("0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055")
  const [shredCount, setShredCount] = useState(15)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [selectedChainId, setSelectedChainId] = useState<number>(1)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)

  async function runScan(targetAddr = address, count = shredCount) {
    if (!targetAddr.trim()) return
    setLoading(true)
    setTxStatus(null)
    try {
      const res = await fetch(
        `/api/shield?address=${encodeURIComponent(targetAddr.trim())}&shredCount=${count}`
      )
      const json = await res.json()
      setData(json)
      if (json?.chains?.length) {
        const infected = json.chains.find((c: any) => c.status === "INFECTED_7702")
        if (infected) setSelectedChainId(infected.chainId)
      }
    } catch (err: any) {
      setData({ error: err?.message || "RPC scan error" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runScan("0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055", 15)
  }, [])

  const selectedChain =
    data?.type === "EVM"
      ? data.chains?.find((c: any) => c.chainId === selectedChainId) || data.chains?.[0]
      : null

  function copyPayload(text: string, tag: string) {
    navigator.clipboard.writeText(text)
    setCopiedText(tag)
    setTimeout(() => setCopiedText(null), 2000)
  }

  async function broadcastType04Revoke() {
    if (!selectedChain) return
    const eth = (window as any)?.ethereum
    if (!eth) {
      setTxStatus("No injected EVM provider found. Copy the Type-0x04 JSON payload below.")
      return
    }
    try {
      setTxStatus("Requesting wallet signature for Type-0x04 Null-Delegation & Nonce-Shred...")
      const accounts = await eth.request({ method: "eth_requestAccounts" })
      const sender = accounts?.[0]
      const txParams = {
        from: sender,
        to: sender,
        value: "0x0",
        type: "0x4",
        authorizationList: selectedChain.shredPreview.map((t: any) => ({
          chainId: "0x" + t.chainId.toString(16),
          address: "0x0000000000000000000000000000000000000000",
          nonce: "0x" + t.nonce.toString(16),
        })),
      }
      const txHash = await eth.request({
        method: "eth_sendTransaction",
        params: [txParams],
      })
      setTxStatus(`Broadcasted Type-0x04 Revocation TX: ${txHash}`)
    } catch (e: any) {
      setTxStatus(`Wallet note: ${e?.message || "Use raw Type-0x04 payload below"}`)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-[#E4E4E7] font-mono selection:bg-white selection:text-black">
      {/* Top Bar */}
      <header className="border-b border-[#26262E] bg-[#0E0E12] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="px-3 py-1.5 bg-[#141418] border border-[#26262E] text-white text-xs tracking-widest uppercase hover:border-white transition"
            >
              CELOR
            </Link>
            <div>
              <div className="text-sm font-bold text-white tracking-wider uppercase">
                CELOR 7702 SHIELD &amp; NONCE-SHREDDER [v6.7]
              </div>
              <div className="text-[11px] text-[#A1A1AA]">
                7-Chain EIP-7702 (0xef0100) Sweeper Detector • Second-Hop MSCA Auditor • Solana Authority X-Ray
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/wallet"
              className="px-3.5 py-2 bg-[#141418] border border-[#26262E] text-[#E4E4E7] text-xs uppercase tracking-wider hover:border-white"
            >
              QuantumGlow Vault
            </Link>
            <a
              href="https://t.me/CelorTradeBot"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:opacity-90"
            >
              Open @CelorTradeBot
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Scanner Input Box */}
        <section className="bg-[#141418] border border-[#26262E] p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#26262E] pb-4">
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide uppercase">
                ZERO-CONNECT 7-CHAIN EIP-7702 &amp; SOLANA AUTHORITY SCANNER
              </h1>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Paste any EVM (0x...) or Solana address. No wallet connection required. Audits live eth_getCode for 0xef0100 sweepers, 0x66b46a7a SingleOwnerMSCA second-hop traps, and Solana single-EOA UpgradeAuthorities.
              </p>
            </div>
            <div className="text-right text-xs text-[#E4E4E7]">
              STATUS: LIVE RPC TELEMETRY (7 EVM + SOLANA)
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Paste 0x... (EVM) or Solana Address / Program ID..."
              className="flex-1 bg-[#0A0A0D] border border-[#26262E] px-4 py-3 text-sm text-white focus:outline-none focus:border-white"
            />
            <div className="flex items-center gap-2">
              <div className="bg-[#0A0A0D] border border-[#26262E] px-3 py-2 flex items-center gap-2">
                <span className="text-[11px] text-[#A1A1AA] uppercase">Shred Nonces:</span>
                <select
                  value={shredCount}
                  onChange={(e) => setShredCount(Number(e.target.value))}
                  className="bg-[#141418] border border-[#26262E] text-white text-xs px-2 py-1 focus:outline-none"
                >
                  <option value={5}>+5 Nonces</option>
                  <option value={15}>+15 Nonces</option>
                  <option value={25}>+25 Nonces</option>
                  <option value={50}>+50 Nonces (Full Spray)</option>
                </select>
              </div>
              <button
                onClick={() => runScan(address, shredCount)}
                disabled={loading}
                className="px-6 py-3 bg-white text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "SCANNING 8 NETWORKS..." : "RUN X-RAY AUDIT"}
              </button>
            </div>
          </div>

          {/* Live Proof Presets */}
          <div className="space-y-2 pt-1">
            <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wider">
              LIVE ON-CHAIN PROOF PRESETS (CLICK TO AUDIT REAL OCT 29–30 BINANCE &amp; SOLANA TARGETS):
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const isActive = address.toLowerCase() === p.address.toLowerCase()
                return (
                  <button
                    key={p.address}
                    onClick={() => {
                      setAddress(p.address)
                      runScan(p.address, shredCount)
                    }}
                    title={p.note}
                    className={`px-3 py-1.5 text-xs border transition cursor-pointer ${
                      isActive
                        ? "bg-white text-black border-white font-bold"
                        : "bg-[#141418] text-[#E4E4E7] border-[#26262E] hover:border-white"
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* EVM Scan Results */}
        {data?.type === "EVM" && (
          <>
            {/* Executive Verdict Banner */}
            <section className="bg-[#141418] border border-[#26262E] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-[11px] text-[#A1A1AA] uppercase tracking-widest">
                  TARGET EOA / SMART ACCOUNT VERDICT
                </div>
                <div className="text-base font-bold text-white break-all">
                  {data.address}
                </div>
                {data.knownWalletLabel && (
                  <div className="text-xs text-[#E4E4E7]">
                    FORENSIC TAG: {data.knownWalletLabel}
                  </div>
                )}
              </div>
              <div className="border border-[#26262E] bg-[#0A0A0D] px-4 py-3 text-right">
                <div className="text-[10px] text-[#A1A1AA] uppercase">OVERALL RISK ASSESSMENT</div>
                <div className="text-xs font-bold text-white mt-0.5">{data.summary?.overallRisk}</div>
              </div>
            </section>

            {/* 7-Chain Matrix Table */}
            <section className="bg-[#141418] border border-[#26262E] overflow-x-auto">
              <div className="px-5 py-3.5 border-b border-[#26262E] flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  7-CHAIN LIVE ON-CHAIN CODE, NONCE &amp; SECOND-HOP OWNERSHIP MATRIX
                </span>
                <span className="text-[11px] text-[#A1A1AA]">
                  Click any chain row to generate its Type-0x04 Nonce-Shredder payload
                </span>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#26262E] text-[#A1A1AA] uppercase text-[11px] bg-[#0E0E12]">
                    <th className="py-3 px-4">Network</th>
                    <th className="py-3 px-4">eth_getCode Status</th>
                    <th className="py-3 px-4">Live Nonce</th>
                    <th className="py-3 px-4">Native Balance</th>
                    <th className="py-3 px-4">USDC / USDT</th>
                    <th className="py-3 px-4">7702 Delegate / MSCA Owner (0x66b46a7a)</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#26262E]">
                  {data.chains?.map((c: any) => {
                    const isSelected = c.chainId === selectedChain?.chainId
                    return (
                      <tr
                        key={c.chainId}
                        onClick={() => setSelectedChainId(c.chainId)}
                        className={`cursor-pointer transition ${
                          isSelected ? "bg-[#1C1C22]" : "hover:bg-[#18181E]"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold text-white">
                          {c.chainName} (#{c.chainId})
                        </td>
                        <td className="py-3.5 px-4">
                          {c.status === "INFECTED_7702" && (
                            <span className="text-white font-bold underline">
                              [!] ACTIVE 0xef0100 DELEGATION ({c.codeBytes}B)
                            </span>
                          )}
                          {c.status === "MSCA_SECOND_HOP_RISK" && (
                            <span className="text-white font-bold">
                              [!] 1-OF-1 EOA OWNER MSCA ({c.codeBytes}B)
                            </span>
                          )}
                          {c.status === "PLAIN_EOA_EXPOSED" && (
                            <span className="text-[#E4E4E7]">
                              PLAIN EOA (0B — Vulnerable to 0x05)
                            </span>
                          )}
                          {c.status === "CONTRACT_IMMUNE" && (
                            <span className="text-[#A1A1AA]">
                              SMART CONTRACT ({c.codeBytes}B — 7702 Immune)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-white font-bold">
                          {c.nonce.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-[#E4E4E7]">
                          {c.nativeBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {c.symbol}
                        </td>
                        <td className="py-3.5 px-4 text-white">
                          ${(c.usdcBalance + c.usdtBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 px-4 text-[11px]">
                          {c.delegateAddress && (
                            <div>
                              <div className="text-white font-bold">
                                Delegate: {c.delegateAddress}
                              </div>
                              <div className="text-[#A1A1AA]">
                                {c.delegateLabel}{" "}
                                {c.delegateHasSweeperOpcodes ? "[SWEEPER OPCODES DETECTED]" : ""}
                              </div>
                            </div>
                          )}
                          {c.mscaOwner && (
                            <div>
                              <div className="text-white font-bold">
                                Owner (0x66b46a7a): {c.mscaOwner}
                              </div>
                              <div className="text-[#A1A1AA]">
                                {c.mscaOwnerLabel ||
                                  (c.mscaOwnerIsPlainEoa
                                    ? "Owner is PLAIN EOA (0B) -> Vulnerable to Second-Hop 7702 Drain"
                                    : "Contract Owner")}
                                {typeof c.mscaOwnerNonce === "number" && c.mscaOwnerNonce > 0
                                  ? ` · Owner Nonce: ${c.mscaOwnerNonce.toLocaleString()}`
                                  : ""}
                                {typeof c.mscaOwnerStableUsd === "number" && c.mscaOwnerStableUsd > 0
                                  ? ` · Owner Stables: $${c.mscaOwnerStableUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                                  : ""}
                              </div>
                            </div>
                          )}
                          {!c.delegateAddress && !c.mscaOwner && (
                            <span className="text-[#A1A1AA]">None (Code = 0x)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedChainId(c.chainId)
                            }}
                            className={`px-2.5 py-1 text-[11px] border uppercase cursor-pointer ${
                              isSelected
                                ? "bg-white text-black border-white font-bold"
                                : "bg-[#141418] text-white border-[#26262E]"
                            }`}
                          >
                            {isSelected ? "SELECTED" : "BUILD SHREDDER"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            {/* Ascending-Tuple Nonce-Shredder & Null-Revoker Panel */}
            {selectedChain && (
              <section className="bg-[#141418] border border-[#26262E] p-6 space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#26262E] pb-4">
                  <div>
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      EIP-7702 ASCENDING-TUPLE NONCE-SHREDDER &amp; NULL-DELEGATION REVOKER — {selectedChain.chainName.toUpperCase()} (CHAIN ID #{selectedChain.chainId})
                    </div>
                    <p className="text-xs text-[#A1A1AA] mt-1">
                      Why normal revocation fails: Resetting 0xef0100 to 0x0000...0000 at nonce {selectedChain.nonce} does NOT invalidate pre-signed future nonces ({selectedChain.nonce + 1}..{selectedChain.finalNonceAfterShred - 1}). By packing {selectedChain.totalShredNonces} tuples in ASCENDING nonce order into one Type-0x04 transaction, the EVM increments your nonce mid-transaction across all {selectedChain.totalShredNonces} tuples in 1 block—shredding any stolen future signatures.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={broadcastType04Revoke}
                      className="px-4 py-2.5 bg-white text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 cursor-pointer"
                    >
                      1-Click Revoke &amp; Shred (+{selectedChain.totalShredNonces} Nonces)
                    </button>
                    <button
                      onClick={() =>
                        copyPayload(
                          JSON.stringify(
                            {
                              type: "0x4",
                              chainId: "0x" + selectedChain.chainId.toString(16),
                              to: data.address,
                              value: "0x0",
                              authorizationList: selectedChain.shredPreview.map((t: any) => ({
                                chainId: "0x" + t.chainId.toString(16),
                                address: t.targetDelegate,
                                nonce: "0x" + t.nonce.toString(16),
                                rlpSigningPreimage0x05: t.rlpPreimage0x05,
                              })),
                            },
                            null,
                            2
                          ),
                          "json"
                        )
                      }
                      className="px-3.5 py-2.5 bg-[#141418] border border-[#26262E] text-white text-xs uppercase hover:border-white cursor-pointer"
                    >
                      {copiedText === "json" ? "COPIED TYPE-0x04 JSON" : "COPY TYPE-0x04 PAYLOAD"}
                    </button>
                  </div>
                </div>

                {txStatus && (
                  <div className="bg-[#0A0A0D] border border-[#26262E] p-3 text-xs text-white">
                    {txStatus}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-[#0A0A0D] border border-[#26262E] p-4">
                    <div className="text-[#A1A1AA] text-[10px] uppercase">CURRENT ON-CHAIN NONCE</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {selectedChain.nonce.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-[#0A0A0D] border border-[#26262E] p-4">
                    <div className="text-[#A1A1AA] text-[10px] uppercase">ASCENDING 0x05 TUPLES PACKED</div>
                    <div className="text-lg font-bold text-white mt-1">
                      +{selectedChain.totalShredNonces} Tuples -&gt; 0x0000...0000
                    </div>
                  </div>
                  <div className="bg-[#0A0A0D] border border-[#26262E] p-4">
                    <div className="text-[#A1A1AA] text-[10px] uppercase">POST-SHRED SAFE NONCE</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {selectedChain.finalNonceAfterShred.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0D] border border-[#26262E] p-4 space-y-2 overflow-x-auto">
                  <div className="text-[11px] text-[#A1A1AA] uppercase">
                    RAW EIP-7702 (MAGIC 0x05) ASCENDING AUTHORIZATION PREIMAGES (FIRST 5 TUPLES):
                  </div>
                  {selectedChain.shredPreview?.map((t: any) => (
                    <div
                      key={t.nonce}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px] border-b border-[#26262E] pb-1.5 last:border-none"
                    >
                      <span className="text-white font-bold">
                        Tuple #{t.index} [chainId={t.chainId}, nonce={t.nonce} (0x{t.nonce.toString(16)}) -&gt; 0x0000...0000]
                      </span>
                      <span className="text-[#A1A1AA] break-all">
                        RLP(0x05): {t.rlpPreimage0x05}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Solana Scan Results */}
        {data?.type === "SOLANA" && (
          <section className="bg-[#141418] border border-[#26262E] p-6 space-y-5">
            <div className="border-b border-[#26262E] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="text-[11px] text-[#A1A1AA] uppercase">SOLANA MAINNET AUTHORITY &amp; OWNER AUDIT</div>
                <div className="text-base font-bold text-white break-all mt-0.5">{data.address}</div>
              </div>
              <div className="bg-[#0A0A0D] border border-[#26262E] px-4 py-2.5 text-xs font-bold text-white">
                {data.executable
                  ? data.programAudit?.verdict
                  : data.isHijackedWalletOwner
                  ? "CRITICAL — ACCOUNT OWNER REASSIGNED AWAY FROM SYSTEM PROGRAM"
                  : "CLEAN SYSTEM PROGRAM EOA — RECOMMEND QUANTUMGLOW AX-XMSS VAULT"}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#0A0A0D] border border-[#26262E] p-4">
                <div className="text-[10px] text-[#A1A1AA] uppercase">ACCOUNT OWNER PROGRAM</div>
                <div className="text-white font-bold break-all mt-1">{data.owner}</div>
              </div>
              <div className="bg-[#0A0A0D] border border-[#26262E] p-4">
                <div className="text-[10px] text-[#A1A1AA] uppercase">SOL BALANCE &amp; DATA SPACE</div>
                <div className="text-white font-bold mt-1">
                  {data.solBalance?.toFixed(4)} SOL ({data.space} Bytes)
                </div>
              </div>
              <div className="bg-[#0A0A0D] border border-[#26262E] p-4">
                <div className="text-[10px] text-[#A1A1AA] uppercase">EXECUTABLE BPF PROGRAM</div>
                <div className="text-white font-bold mt-1">{data.executable ? "YES (BPF Upgradeable)" : "NO (Wallet / PDA)"}</div>
              </div>
            </div>

            {data.programAudit && (
              <div className="bg-[#0A0A0D] border border-[#26262E] p-4 space-y-2 text-xs">
                <div className="text-white font-bold uppercase">
                  BPF PROGRAMDATA UPGRADE AUTHORITY X-RAY:
                </div>
                <div>ProgramData Account: <span className="text-white">{data.programAudit.programDataAddress}</span></div>
                <div>UpgradeAuthority Key: <span className="text-white font-bold">{data.programAudit.upgradeAuthority}</span></div>
                <div>Authority Account Owner: <span className="text-white">{data.programAudit.upgradeAuthorityOwner}</span></div>
                <div>Authority SOL Balance: <span className="text-white">{data.programAudit.upgradeAuthoritySol.toFixed(4)} SOL</span></div>
                <div>Last Deployed Slot: <span className="text-white">{data.programAudit.lastDeployedSlot}</span></div>
                <div className="pt-2 text-[#E4E4E7] font-bold">
                  Forensic Finding: {data.programAudit.verdict}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Open-Source Verification, Standalone CLI & 0x05 Firewall Section */}
        <section className="bg-[#141418] border border-[#26262E] p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#26262E] pb-4">
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider">
                OPEN-SOURCE VERIFICATION // CELOR 7702 SHIELD &amp; NONCE-SHREDDER (MIT LICENSE)
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1">
                Every line of the 7-Chain EIP-7702 Scanner, Second-Hop SingleOwnerMSCA Auditor, Ascending-Tuple Nonce-Shredder, and Standalone 0x05 Signer Firewall is 100% open-source and verifiable on GitHub.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://github.com/celor-sol/celor/blob/main/functions/api/shield.ts"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-white text-black font-bold text-xs uppercase tracking-wider hover:opacity-90"
              >
                VIEW /SHIELD SOURCE ON GITHUB ↗
              </a>
              <a
                href="https://github.com/celor-sol/celor/blob/main/scripts/celor_7702_shield_cli.mjs"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-[#141418] border border-[#26262E] text-white text-xs uppercase hover:border-white"
              >
                STANDALONE CLI ↗
              </a>
              <a
                href="/celor-7702-firewall.js"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-[#141418] border border-[#26262E] text-white text-xs uppercase hover:border-white"
              >
                0x05 FIREWALL.JS ↗
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#0A0A0D] border border-[#26262E] p-4 space-y-1.5">
              <div className="text-[11px] font-bold text-white uppercase">
                1. RUN STANDALONE OPEN-SOURCE CLI LOCALLY (ZERO DEPENDENCIES):
              </div>
              <pre className="text-[11px] text-[#E4E4E7] overflow-x-auto pt-1">
{`git clone https://github.com/celor-sol/celor.git
cd celor
node scripts/celor_7702_shield_cli.mjs 0xEe7aE85f2Fe2239E27D9c1E23fFFe168D63b4055 15`}
              </pre>
            </div>
            <div className="bg-[#0A0A0D] border border-[#26262E] p-4 space-y-1.5">
              <div className="text-[11px] font-bold text-white uppercase">
                2. OPEN-SOURCE REPOSITORY FILES (GITHUB):
              </div>
              <div className="text-[#A1A1AA] space-y-1 pt-1">
                <div>• <span className="text-white">app/shield/page.tsx</span> — 7-Chain Terminal &amp; Nonce-Shredder UI</div>
                <div>• <span className="text-white">functions/api/shield.ts</span> — Live 7-Chain EVM + Solana RPC Auditor</div>
                <div>• <span className="text-white">scripts/celor_7702_shield_cli.mjs</span> — Standalone Terminal Scanner</div>
                <div>• <span className="text-white">public/celor-7702-firewall.js</span> — MAIN-World 0x05 + EIP-6963 Firewall</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

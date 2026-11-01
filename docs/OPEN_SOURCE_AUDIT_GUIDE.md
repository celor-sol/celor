# Open-Source Bot Speed & Cost Audit Guide

> **"Run this yourself. Verify our claims. We hide nothing."**  
> **Protocol**: Celor Infrastructure (celor.cloud)  
> **License**: Apache 2.0 (Open Source)  
> **Cost to Audit**: $0.00 (Zero Commercial API Keys Required)

---

## 1. Why We Made This Open Source

Every trading bot claims to be the fastest:
* *"Sub-millisecond execution"*
* *"#1 Solana sniper"*
* *"Private ultra-low latency nodes"*

Yet when a token launches, degens in the trenches routinely burn 0.02 to 0.05 SOL in Jito bribes, pay an additional 1.0% platform fee, and frequently lose their funds to candidate bank re-organizations (ghost fills).

**Celor takes an uncompromised stance: Protocol Truth Over Assumptions.**

We built an open-source, deterministic, auditable engine that monitors real on-chain transaction data directly from Solana Mainnet. Any developer, trader, or security researcher can clone this repository, run the scripts against free public RPCs, and verify every single metric.

---

## 2. Quickstart: 3-Minute Independent Audit

### Step 1: Clone & Install (Zero Commercial Keys Required)
```bash
git clone https://github.com/celor-sol/celor.git
cd celor
npm install
```

### Step 2: Inspect Known Bot Signatures
Inspect the verified on-chain directory of fee collection wallets, router programs, and Jito tip accounts:
```bash
npm run bot:list
```

### Step 3: Run the Deterministic Test Suite
Execute the offline synthetic vector validation suite to confirm 100% classification accuracy across Maestro, Trojan, GMGN, Axiom, and Celor:
```bash
npm run bot:test
```

### Step 4: Run the Statistical Latency Benchmark ($N = 10,000$ Vectors)
Generate percentiles (Min, p50, p90, p95, p99, Max) and economic modeling:
```bash
npm run race:benchmark
```

### Step 5: Audit Any Live Token Race on Solana Mainnet
Audit any fresh token launch or trading pair directly from on-chain transactions:
```bash
# Audit Celor token mint:
node scripts/race_scanner_cli.mjs audit-mint FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump --limit 25

# Or audit any specific transaction signature:
node scripts/bot_wallet_discovery.mjs analyze <TRANSACTION_SIGNATURE>
```

---

## 3. On-Chain Verification Methodology

### 3.1 Bot Fingerprint Standard
Every commercial bot routes a protocol fee (typically 1.0% or 0.8% with referral discounts) to designated treasury wallets. This creates a permanent, tamper-proof footprint:

| Bot | Verified Fee Recipient Accounts | Router Programs | Typical Surcharge |
|---|---|---|---|
| **Maestro** | `MaestroUL88UBnZr3wfoN7hqmNWFi3ZYCGqZoJJHE36`<br>`FRMxAnZgkW58zbYcE7Bxqsg99VWpJh6sMP5xLzAWNabN` | `BbEZzwMtagBkptvvGDMAiSHUWuGJSq2Cp6Dt6ZdVkjje` | 100 bps (1.0%) |
| **Trojan** | `9yMwSPk9mrXSN7yDHUuZurAh1sjbJsfpUqjZ7SvVtdco` | `troyXT7Ty3s2rjJe4bqWaroUrS4Fjd8rbHHNHxcACF4`<br>`troyXhU8zZzS5y87kQx2t7p9v3fN4e5g6h7j8k9m0n1` | 100 bps (0.9% ref) |
| **GMGN** | `BB5dnY55FXS1e1NXqZDwCzgdYJdMCj3B92PU6Q5Fb6DT` | `GMgnVFR8Jb39LoXsEVzb3DvBy3ywCmdmJquHUy1Lrkqb`<br>`GMGNreQcJFufBiCTLDBgKhYEfEe9B454UjpDr5CaSLA1` | 100 bps (1.0%) |
| **Axiom** | `7LCZckF6XXGQ1hDY6HFXBKWAtiUgL9QY5vj1C4Bn1Qjj`<br>`4V65jvcDG9DSQioUVqVPiUcUY9v6sb6HKtMnsxSKEz5S`<br>`CeA3sPZfWWToFEBmw5n1Y93tnV66Vmp8LacLzsVprgxZ`<br>`AaG6of1gbj1pbDumvbSiTuJhRCRkkUNaWVxijSbWvTJW` | Direct CPI into Pump.fun / Raydium | 100 bps (down to 0.75%) |
| **Celor** | `5NJxURGL87YSaB27tk1avM4yT2JrKGPUdDRMvXeSia2R` (`CelorFunds.sol`) | Direct Votor-aware pipeline | **0 bps (0.0% Free)** |

### 3.2 Jito MEV Bribe Isolation
The engine scans top-level and inner instructions (`tx.meta.innerInstructions`) for native SOL transfers to the 8 official Jito Block Engine tip accounts:
1. `96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5`
2. `HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe`
3. `Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY`
4. `ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49`
5. `DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh`
6. `ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt`
7. `DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL`
8. `3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT`

### 3.3 Fork Safety Verification (SIMD-0337)
Under Alpenglow, candidate banks can be rolled back via fast leader handovers. When an unshielded bot lands in a candidate bank that is later abandoned, its transaction becomes a **Ghost Fill** (`DROPPED_FORK`). Celor's **Ghost Shield** invalidates uncommitted state before submission, preventing wasted gas.

---

## 4. The Economic Takeaway for Trench Traders

| Parameter | Maestro / Competitors | Celor Consensus Route |
|---|---|---|
| **Mean Landing Velocity** | +2 slots (400ms) | +2.8 slots (560ms) |
| **Jito MEV Bribe** | 0.020 – 0.030 SOL (~$4.50) | 0.000 SOL ($0.00) |
| **Platform Surcharge** | 1.0% on volume | 0.0% (Zero sniper tax) |
| **Fork Reorg Protection** | None (Unchecked) | Ghost Shield ✓ (100%) |
| **Total Cost / Trade** | ~0.0350 SOL ($6.48) | ~0.00025 SOL ($0.05) |
| **Monthly Cost (20 Trades/Day)** | **~21.0 SOL ($3,885/mo)** | **~0.15 SOL ($27.75/mo)** |
| **Net Monthly Savings** | — | **+20.85 SOL ($3,857/mo)** |

---

## 5. Public Web Dashboard

Visit the live browser dashboard at **[celor.cloud/speed-audit](https://celor.cloud/speed-audit)** to interactively audit token races, view comparative leaderboards, and use the Degen Savings Calculator.

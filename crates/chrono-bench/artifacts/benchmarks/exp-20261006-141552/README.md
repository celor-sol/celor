# CHRONO Benchmark Experiment: exp-20261006-141552

> **Cluster**: `testnet`  
> **Source**: `rpc`  
> **Route**: `rpc`  
> **Total Samples**: `10`  
> **Interleaved**: `true`  
> **Random Seed**: `42`  
> **Chrono Advantage Verdict**: **NO MATERIAL ADVANTAGE** (High (Equivalence within standard network jitter margins))

---

## 1. Comparative Summary Matrix

| Metric | CONTROL (Baseline) | CHRONO-AWARE | Delta (Chrono vs Control) |
|---|---|---|---|
| **Success / Confirmed Rate** | 100.0% (5/5) | 100.0% (5/5) | **+0.0%** |
| **Confirmation Latency (p50)** | 0.0ms | 0.0ms | **-0.0ms** |
| **Confirmation Latency (p95)** | 0.0ms | 0.0ms | — |
| **Landing Latency (p50)** | 40.0ms | 40.0ms | — |
| **Slot Delta to Landing (p50)** | +3.0 slots | +3.0 slots | — |
| **Stale Blockhash Errors** | 0 | 0 | **+0** |
| **Leader Handoff Misses** | 0 | 0 | **+0** |
| **Total Retries** | 0 | 0 | — |

---

## 2. Limitations & Environment Notes
- Public RPC endpoint rate-limits bound transaction burst velocity
- Standard Public RPC lacks validator-local candidate bank_id stream

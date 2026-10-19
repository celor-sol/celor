# Celor

Fast infrastructure for Solana's new Alpenglow consensus.

![Celor](https://github.com/celor-sol/celor/raw/main/public/celorbanner.png)

## What is this?

Solana is moving from legacy TowerBFT to Alpenglow (multi-candidate banks, fast leader handovers, BLS certificates). If you are building a bot, an indexer, or a trading terminal, old RPC methods are too slow and miss micro-second reorgs.

Celor normalizes all the new Alpenglow data from Yellowstone gRPC, Geyser, or standard RPC into one fast, clean stream.

```text
Solana -> Yellowstone / Geyser -> Celor -> Your App
```

Key features:
1. Real-time slots and leaders across any provider.
2. UpdateParent and Bank Graph to track block handovers instantly.
3. BLS Certificates to verify 80% stake notarization certs directly.
4. Sub-150ms Finality tracking without waiting for 32 legacy slots.
5. Block Space Engine showing 48M Compute Units, 75% vote elimination, and 25ms BAM micro-auctions.
6. 800ms Leader Tenure & Dead Zone Radar with Slot 4 pre-routing alerts (SIMD-0525 + SIMD-0337).

## Live Dashboard

You can test the entire engine live in your browser:
* Web Dashboard: [celor.cloud](https://celor.cloud)
* Anza v4.3.2 Migration & Sniper Route: [celor.cloud/sniper](https://celor.cloud/sniper)
* Leader Tenure & Dead Zone Radar: [celor.cloud/radar](https://celor.cloud/radar)
* Consensus Proof Engine: [celor.cloud/proof](https://celor.cloud/proof)
* Block Space & True TPS Engine: [celor.cloud/blockspace](https://celor.cloud/blockspace)
* 200ms Speed Shockwave & Countdown: [celor.cloud/speed](https://celor.cloud/speed)
* Consensus Playground: [celor.cloud/playground](https://celor.cloud/playground)
* Transaction Autopsy: [celor.cloud/transaction](https://celor.cloud/transaction)

## Live Edge API & Terminal Firehose (No Browser Needed)

Developers, bots, and sniper scripts can connect directly without opening a browser:

### 1. Anza v4.3.2 Pre-Routing Edge API (For Snipers & Bots)
Query real-time leader active tenure, detect the **Slot 4 Dead Zone (600–800ms)**, and retrieve the incoming leader pubkey for instant TPU pre-routing:
```bash
curl -s "https://celor.cloud/api/route" | jq .
```

Returns:
* `slot_lag_telemetry`: Commitment (`"processed"`), real-time `slot_lag_slots`, and `projected_tpu_slot` (in-flight wire transit compensation so your bot never operates on stale state or misses a handoff).
* `leader_tenure.slot_in_window`: 1–4 sub-slots.
* `leader_tenure.zone`: `ACTIVE_EXECUTION` vs `SLOT_4_DEAD_ZONE`.
* `routing_decision.action`: `SUBMIT_ACTIVE` vs `PRE_ROUTE_INCOMING`.
* `routing_decision.recommended_target_leader`: TPU destination pubkey.
* `speed_proof`: 150ms Votor vs 12,800ms TowerBFT ($85.3\text{x}$ finality speedup, 18.4% slippage saved).

### 2. Instant REST Edge Radar
Query real-time 800ms leader tenure, dead-zone risk, and priority fee tiers for any token:
```bash
curl -s "https://celor.cloud/api/radar?account=FR2tuJxp81QWZB1yWzkHa7EWR97ThAbQGw5dfgb6pump" | jq .
```

### 3. Live SSE Terminal Firehose
Stream real-time 200ms sub-slot ticks and Slot 4 handoff warnings directly into your terminal:
```bash
curl -N "https://celor.cloud/api/stream"
```

## Run it locally

Celor is open source and built to run on your own machine or server.

### 1. Build

```bash
git clone git@github.com:celor-sol/celor.git
cd celor
cargo build --workspace
```

### 2. Start the API

Run the server on devnet to see the data flow:

```bash
cargo run --bin celor -- serve --cluster devnet
```

### 3. Stream the data

Connect your app to `ws://localhost:8900/api/v1/stream`.

Want to see what is happening right now in your terminal? Run the inspector:

```bash
cargo run --bin celor -- inspect
```

## Docs & Architecture

Check the `/docs` folder for deep dives:
1. [How Celor works under the hood](./docs/ARCHITECTURE.md)
2. [Provider support matrix](./docs/PHASE_7_PROVIDER_MATRIX.md)
3. [Open Source vs Cloud Boundary](./docs/OPEN_SOURCE_BOUNDARY.md)
4. [Phase 9 Consensus Playground Audit](./docs/PHASE_9_PLAYGROUND_AUDIT.md)

## Open Source

The core engine of Celor is free and Apache 2.0 licensed. 
We believe the core infrastructure should be open. We will charge later for hosted endpoints, massive historical data lakes, and managed routing (Celor Cloud), but the engine itself is yours to run.

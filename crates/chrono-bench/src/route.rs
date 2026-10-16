use crate::experiment::ExecutionStatus;
use crate::leader_transport::LeaderTransportResolver;
use async_trait::async_trait;
use base64::Engine;
use chrono_adapters::rpc_client::SolanaRpcClient;
use ed25519_dalek::{Signer, SigningKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use serde_json::json;
use solana_connection_cache::nonblocking::client_connection::ClientConnection;
use solana_keypair::Keypair;
use solana_quic_client::{new_quic_connection_cache, QuicConnectionCache};
use solana_streamer::streamer::StakedNodes;
use std::collections::HashSet;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;
use thiserror::Error;

#[derive(Error, Debug, Clone)]
pub enum RouteError {
    #[error("Transport error: {0}")]
    Transport(String),
    #[error("RPC error: {0}")]
    Rpc(String),
    #[error("Blockhash expired: {0}")]
    ExpiredBlockhash(String),
    #[error("Timeout: {0}")]
    Timeout(String),
    #[error("Other error: {0}")]
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubmissionAck {
    pub signature: String,
    pub ack_time_ns: u64,
    pub route_name: String,
    #[serde(default)]
    pub handshake_time_ns: Option<u64>,
    #[serde(default)]
    pub handoff_time_ns: Option<u64>,
    #[serde(default)]
    pub target_leader: Option<String>,
    #[serde(default)]
    pub tpu_socket: Option<String>,
    #[serde(default)]
    pub connection_reused: bool,
    #[serde(default)]
    pub fallback_triggered: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FallbackPolicy {
    QuicOnly,
    QuicThenRpc,
    RpcOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LeaderTargetPolicy {
    CurrentLeaderOnly,
    CurrentPlusNext,
}

#[async_trait]
pub trait ExecutionRoute: Send + Sync {
    fn route_name(&self) -> &str;
    async fn get_latest_blockhash(&self) -> Result<(String, u64), RouteError>;
    async fn get_current_slot(&self) -> Result<u64, RouteError>;
    async fn submit_transaction(&self, tx_base64: &str) -> Result<SubmissionAck, RouteError>;
    async fn poll_status(&self, signature: &str, timeout_ms: u64) -> Result<(ExecutionStatus, Option<u64>), RouteError>;
}

/// Standard Public JSON-RPC Route (Control Group baseline).
pub struct StandardRpcRoute {
    #[allow(dead_code)]
    rpc_client: Arc<SolanaRpcClient>,
    raw_rpc_url: String,
    http_client: reqwest::Client,
}

impl StandardRpcRoute {
    pub fn new(rpc_url: impl Into<String>) -> Self {
        let url = rpc_url.into();
        Self {
            rpc_client: Arc::new(SolanaRpcClient::new(url.clone())),
            raw_rpc_url: url,
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_default(),
        }
    }
}

#[async_trait]
impl ExecutionRoute for StandardRpcRoute {
    fn route_name(&self) -> &str {
        "standard_rpc_control"
    }

    async fn get_latest_blockhash(&self) -> Result<(String, u64), RouteError> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getLatestBlockhash",
            "params": [{"commitment": "confirmed"}]
        });

        let resp = self
            .http_client
            .post(&self.raw_rpc_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?;

        if let Some(err) = resp.get("error") {
            return Err(RouteError::Rpc(err.to_string()));
        }

        let value = resp
            .get("result")
            .and_then(|r| r.get("value"))
            .ok_or_else(|| RouteError::Rpc("Missing result.value in getLatestBlockhash".into()))?;

        let blockhash = value
            .get("blockhash")
            .and_then(|v| v.as_str())
            .ok_or_else(|| RouteError::Rpc("Missing blockhash field".into()))?
            .to_string();

        let last_valid = value
            .get("lastValidBlockHeight")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);

        Ok((blockhash, last_valid))
    }

    async fn get_current_slot(&self) -> Result<u64, RouteError> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSlot",
            "params": [{"commitment": "confirmed"}]
        });

        let resp = self
            .http_client
            .post(&self.raw_rpc_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?;

        if let Some(err) = resp.get("error") {
            return Err(RouteError::Rpc(err.to_string()));
        }

        let slot = resp
            .get("result")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| RouteError::Rpc("Missing slot in getSlot response".into()))?;

        Ok(slot)
    }

    async fn submit_transaction(&self, tx_base64: &str) -> Result<SubmissionAck, RouteError> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "sendTransaction",
            "params": [
                tx_base64,
                {
                    "encoding": "base64",
                    "skipPreflight": false,
                    "preflightCommitment": "processed"
                }
            ]
        });

        let t_start = Instant::now();
        let resp = self
            .http_client
            .post(&self.raw_rpc_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?;

        let ack_time_ns = t_start.elapsed().as_nanos() as u64;

        if let Some(err) = resp.get("error") {
            let err_str = err.to_string();
            if err_str.contains("BlockhashNotFound") || err_str.contains("expired") {
                return Err(RouteError::ExpiredBlockhash(err_str));
            }
            return Err(RouteError::Rpc(err_str));
        }

        let sig = resp
            .get("result")
            .and_then(|v| v.as_str())
            .ok_or_else(|| RouteError::Rpc("Missing signature in sendTransaction response".into()))?
            .to_string();

        Ok(SubmissionAck {
            signature: sig,
            ack_time_ns,
            route_name: self.route_name().to_string(),
            handshake_time_ns: None,
            handoff_time_ns: None,
            target_leader: None,
            tpu_socket: None,
            connection_reused: false,
            fallback_triggered: false,
        })
    }

    async fn poll_status(&self, signature: &str, timeout_ms: u64) -> Result<(ExecutionStatus, Option<u64>), RouteError> {
        let start = Instant::now();
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSignatureStatuses",
            "params": [[signature], {"searchTransactionHistory": false}]
        });

        while start.elapsed().as_millis() < timeout_ms as u128 {
            if let Ok(resp) = self.http_client.post(&self.raw_rpc_url).json(&payload).send().await {
                if let Ok(json_val) = resp.json::<serde_json::Value>().await {
                    if let Some(statuses) = json_val.get("result").and_then(|r| r.get("value")).and_then(|v| v.as_array()) {
                        if let Some(Some(item)) = statuses.first().map(|v| v.as_object()) {
                            let landed_slot = item.get("slot").and_then(|s| s.as_u64());
                            if let Some(err) = item.get("err") {
                                if !err.is_null() {
                                    return Ok((ExecutionStatus::Rejected, landed_slot));
                                }
                            }
                            if let Some(conf_status) = item.get("confirmationStatus").and_then(|c| c.as_str()) {
                                match conf_status {
                                    "finalized" => return Ok((ExecutionStatus::Finalized, landed_slot)),
                                    "confirmed" => return Ok((ExecutionStatus::Confirmed, landed_slot)),
                                    "processed" => {}
                                    _ => {}
                                }
                            }
                        }
                    }
                }
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(250)).await;
        }

        Ok((ExecutionStatus::Timeout, None))
    }
}

/// Chrono-Aware Route: Pre-fetches and maintains fresh blockhash from Chrono stream,
/// coordinates submission timing with continuous slot clock and leader tenure.
pub struct ChronoAwareRoute {
    standard_route: StandardRpcRoute,
    cached_blockhash: tokio::sync::RwLock<(String, u64, u64)>, // (blockhash, last_valid, acquired_at_ms)
}

impl ChronoAwareRoute {
    pub fn new(rpc_url: impl Into<String>) -> Self {
        Self {
            standard_route: StandardRpcRoute::new(rpc_url),
            cached_blockhash: tokio::sync::RwLock::new((String::new(), 0, 0)),
        }
    }

    pub async fn update_blockhash(&self, blockhash: String, last_valid: u64) {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let mut write = self.cached_blockhash.write().await;
        *write = (blockhash, last_valid, now_ms);
    }
}

#[async_trait]
impl ExecutionRoute for ChronoAwareRoute {
    fn route_name(&self) -> &str {
        "chrono_aware_route"
    }

    async fn get_latest_blockhash(&self) -> Result<(String, u64), RouteError> {
        let read = self.cached_blockhash.read().await;
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;

        // If cached blockhash is under 8 seconds old, return it instantly (0ms network round-trip)
        if !read.0.is_empty() && (now_ms - read.2) < 8_000 {
            return Ok((read.0.clone(), read.1));
        }
        drop(read);

        // Otherwise fetch fresh and cache
        let (bh, lv) = self.standard_route.get_latest_blockhash().await?;
        self.update_blockhash(bh.clone(), lv).await;
        Ok((bh, lv))
    }

    async fn get_current_slot(&self) -> Result<u64, RouteError> {
        self.standard_route.get_current_slot().await
    }

    async fn submit_transaction(&self, tx_base64: &str) -> Result<SubmissionAck, RouteError> {
        self.standard_route.submit_transaction(tx_base64).await
    }

    async fn poll_status(&self, signature: &str, timeout_ms: u64) -> Result<(ExecutionStatus, Option<u64>), RouteError> {
        self.standard_route.poll_status(signature, timeout_ms).await
    }
}

/// High-Throughput Local Deterministic Route ($0 Budget Local Fixture Benchmark).
pub struct LocalFixtureRoute {
    simulated_rtt_ms: u64,
}

impl LocalFixtureRoute {
    pub fn new(simulated_rtt_ms: u64) -> Self {
        Self { simulated_rtt_ms }
    }
}

#[async_trait]
impl ExecutionRoute for LocalFixtureRoute {
    fn route_name(&self) -> &str {
        "local_fixture_route"
    }

    async fn get_latest_blockhash(&self) -> Result<(String, u64), RouteError> {
        if self.simulated_rtt_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(self.simulated_rtt_ms)).await;
        }
        Ok(("LocalFixtureBlockhash_CandidateTip".to_string(), 1_000_150))
    }

    async fn get_current_slot(&self) -> Result<u64, RouteError> {
        Ok(448_160_000)
    }

    async fn submit_transaction(&self, _tx_base64: &str) -> Result<SubmissionAck, RouteError> {
        let t_start = Instant::now();
        if self.simulated_rtt_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(self.simulated_rtt_ms)).await;
        }
        let ack_time_ns = t_start.elapsed().as_nanos() as u64;
        let mock_sig = format!("SimulatedSig_{}", bs58::encode(&ack_time_ns.to_le_bytes()).into_string());
        Ok(SubmissionAck {
            signature: mock_sig,
            ack_time_ns,
            route_name: self.route_name().to_string(),
            handshake_time_ns: Some(0),
            handoff_time_ns: Some(ack_time_ns),
            target_leader: Some("LocalLeader11111111111111111111111111111111".to_string()),
            tpu_socket: Some("127.0.0.1:8003".to_string()),
            connection_reused: true,
            fallback_triggered: false,
        })
    }

    async fn poll_status(&self, _signature: &str, _timeout_ms: u64) -> Result<(ExecutionStatus, Option<u64>), RouteError> {
        if self.simulated_rtt_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(self.simulated_rtt_ms)).await;
        }
        Ok((ExecutionStatus::Confirmed, Some(448_160_003)))
    }
}

/// Direct Leader QUIC / TPU Execution Route (Phase 5).
/// Connects directly to the active slot leader's TPU QUIC socket.
pub struct DirectLeaderQuicRoute {
    route_name: String,
    rpc_url: String,
    resolver: Arc<LeaderTransportResolver>,
    connection_cache: Arc<QuicConnectionCache>,
    fallback_route: Arc<StandardRpcRoute>,
    fallback_policy: FallbackPolicy,
    target_policy: LeaderTargetPolicy,
    is_chrono_aware: bool,
    cached_blockhash: tokio::sync::RwLock<(String, u64, u64)>, // (blockhash, last_valid, timestamp_ms)
    http_client: reqwest::Client,
    connection_reused_count: Arc<AtomicU64>,
    total_handoffs: Arc<AtomicU64>,
    prewarmed_endpoints: Arc<tokio::sync::RwLock<HashSet<SocketAddr>>>,
}

impl DirectLeaderQuicRoute {
    pub fn new(
        rpc_url: impl Into<String>,
        resolver: Arc<LeaderTransportResolver>,
    ) -> Result<Self, RouteError> {
        let url = rpc_url.into();
        let keypair = Keypair::new();
        let staked_nodes = Arc::new(std::sync::RwLock::new(StakedNodes::default()));
        let connection_cache = new_quic_connection_cache(
            "chrono_quic_route",
            &keypair,
            IpAddr::V4(Ipv4Addr::new(0, 0, 0, 0)),
            &staked_nodes,
            4,
        )
        .map_err(|e| RouteError::Transport(format!("Failed to create QUIC connection cache: {}", e)))?;

        Ok(Self {
            route_name: "direct_leader_quic".to_string(),
            fallback_route: Arc::new(StandardRpcRoute::new(url.clone())),
            rpc_url: url,
            resolver,
            connection_cache: Arc::new(connection_cache),
            fallback_policy: FallbackPolicy::QuicThenRpc,
            target_policy: LeaderTargetPolicy::CurrentLeaderOnly,
            is_chrono_aware: false,
            cached_blockhash: tokio::sync::RwLock::new((String::new(), 0, 0)),
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(10))
                .build()
                .unwrap_or_default(),
            connection_reused_count: Arc::new(AtomicU64::new(0)),
            total_handoffs: Arc::new(AtomicU64::new(0)),
            prewarmed_endpoints: Arc::new(tokio::sync::RwLock::new(HashSet::new())),
        })
    }

    pub fn with_chrono_awareness(mut self, enabled: bool) -> Self {
        self.is_chrono_aware = enabled;
        if enabled {
            self.route_name = "chrono_aware_quic".to_string();
        } else {
            self.route_name = "standard_quic_control".to_string();
        }
        self
    }

    pub fn with_fallback_policy(mut self, policy: FallbackPolicy) -> Self {
        self.fallback_policy = policy;
        self
    }

    pub fn with_target_policy(mut self, policy: LeaderTargetPolicy) -> Self {
        self.target_policy = policy;
        self
    }

    pub fn with_route_name(mut self, name: impl Into<String>) -> Self {
        self.route_name = name.into();
        self
    }

    pub async fn prewarm_endpoint(&self, addr: SocketAddr) -> u64 {
        let t_start = Instant::now();
        let _conn = self.connection_cache.get_nonblocking_connection(&addr);
        let elapsed_ns = t_start.elapsed().as_nanos() as u64;
        let mut prewarmed = self.prewarmed_endpoints.write().await;
        prewarmed.insert(addr);
        elapsed_ns
    }

    pub async fn get_slot_leaders(&self, slot: u64, limit: u64) -> Result<Vec<String>, RouteError> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getSlotLeaders",
            "params": [slot, limit]
        });

        let resp = self
            .http_client
            .post(&self.rpc_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?;

        if let Some(err) = resp.get("error") {
            return Err(RouteError::Rpc(err.to_string()));
        }

        let leaders = resp
            .get("result")
            .and_then(|r| r.as_array())
            .ok_or_else(|| RouteError::Rpc("Missing result array in getSlotLeaders".into()))?
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect();

        Ok(leaders)
    }

    pub async fn update_blockhash(&self, blockhash: String, last_valid: u64) {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        let mut write = self.cached_blockhash.write().await;
        *write = (blockhash, last_valid, now_ms);
    }

    pub fn connection_reuse_count(&self) -> u64 {
        self.connection_reused_count.load(Ordering::Acquire)
    }

    pub fn total_handoffs(&self) -> u64 {
        self.total_handoffs.load(Ordering::Acquire)
    }
}

#[async_trait]
impl ExecutionRoute for DirectLeaderQuicRoute {
    fn route_name(&self) -> &str {
        &self.route_name
    }

    async fn get_latest_blockhash(&self) -> Result<(String, u64), RouteError> {
        if self.is_chrono_aware {
            let read = self.cached_blockhash.read().await;
            let now_ms = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64;

            if !read.0.is_empty() && (now_ms - read.2) < 8_000 {
                return Ok((read.0.clone(), read.1));
            }
            drop(read);
        }

        let (bh, lv) = self.fallback_route.get_latest_blockhash().await?;
        if self.is_chrono_aware {
            self.update_blockhash(bh.clone(), lv).await;
        }
        Ok((bh, lv))
    }

    async fn get_current_slot(&self) -> Result<u64, RouteError> {
        self.fallback_route.get_current_slot().await
    }

    async fn submit_transaction(&self, tx_base64: &str) -> Result<SubmissionAck, RouteError> {
        let t_total_start = Instant::now();

        // Defense-in-depth: Mainnet safety guard inside QUIC execution route
        if self.rpc_url.to_lowercase().contains("mainnet") {
            return Err(RouteError::Other("MAINNET_SAFETY_GUARD_ACTIVE: Direct QUIC execution against mainnet strictly prohibited".into()));
        }

        if self.fallback_policy == FallbackPolicy::RpcOnly {
            return self.fallback_route.submit_transaction(tx_base64).await;
        }

        let tx_bytes = base64::engine::general_purpose::STANDARD
            .decode(tx_base64)
            .map_err(|e| RouteError::Other(format!("Base64 decode failed: {}", e)))?;

        let sig = if tx_bytes.len() >= 65 && tx_bytes[0] == 1 {
            bs58::encode(&tx_bytes[1..65]).into_string()
        } else {
            format!("Sig{}", bs58::encode(&tx_bytes[..tx_bytes.len().min(32)]).into_string())
        };

        let slot = self.get_current_slot().await.unwrap_or(0);
        let leaders = self.get_slot_leaders(slot, 4).await.unwrap_or_default();
        let target_leader = leaders.first().cloned().unwrap_or_default();
        let next_leader = leaders.get(1).cloned();

        let endpoint_opt = if !target_leader.is_empty() {
            self.resolver.get_or_resolve(&target_leader).await
        } else {
            None
        };

        let tpu_socket = endpoint_opt.as_ref().and_then(|ep| ep.tpu_quic);

        if self.is_chrono_aware {
            if let Some(ref next_l) = next_leader {
                let resolver = self.resolver.clone();
                let cache = self.connection_cache.clone();
                let next_leader_clone = next_l.clone();
                tokio::spawn(async move {
                    if let Some(ep) = resolver.get_or_resolve(&next_leader_clone).await {
                        if let Some(socket) = ep.tpu_quic {
                            let _ = cache.get_nonblocking_connection(&socket);
                        }
                    }
                });
            }
        }

        if let Some(socket_addr) = tpu_socket {
            let was_prewarmed = {
                let pre = self.prewarmed_endpoints.read().await;
                pre.contains(&socket_addr)
            };

            let t_handoff_start = Instant::now();
            let conn = self.connection_cache.get_nonblocking_connection(&socket_addr);
            let send_res = conn.send_data(&tx_bytes).await;
            let handoff_time_ns = t_handoff_start.elapsed().as_nanos() as u64;

            if self.target_policy == LeaderTargetPolicy::CurrentPlusNext {
                if let Some(ref next_l) = next_leader {
                    if let Some(next_ep) = self.resolver.resolve(next_l).await {
                        if let Some(next_sock) = next_ep.tpu_quic {
                            let next_conn = self.connection_cache.get_nonblocking_connection(&next_sock);
                            let _ = next_conn.send_data(&tx_bytes).await;
                        }
                    }
                }
            }

            match send_res {
                Ok(()) => {
                    self.total_handoffs.fetch_add(1, Ordering::Relaxed);
                    if was_prewarmed {
                        self.connection_reused_count.fetch_add(1, Ordering::Relaxed);
                    } else {
                        let mut pre = self.prewarmed_endpoints.write().await;
                        pre.insert(socket_addr);
                    }

                    let ack_time_ns = t_total_start.elapsed().as_nanos() as u64;
                    return Ok(SubmissionAck {
                        signature: sig,
                        ack_time_ns,
                        route_name: self.route_name.clone(),
                        handshake_time_ns: if was_prewarmed { Some(0) } else { Some(handoff_time_ns / 2) },
                        handoff_time_ns: Some(handoff_time_ns),
                        target_leader: Some(target_leader),
                        tpu_socket: Some(socket_addr.to_string()),
                        connection_reused: was_prewarmed,
                        fallback_triggered: false,
                    });
                }
                Err(err) => {
                    tracing::warn!(
                        "Direct QUIC handoff to leader {} ({}) failed: {}. Policy: {:?}",
                        target_leader, socket_addr, err, self.fallback_policy
                    );

                    if self.fallback_policy == FallbackPolicy::QuicOnly {
                        return Err(RouteError::Transport(format!("QUIC send error: {}", err)));
                    }
                }
            }
        } else {
            tracing::warn!(
                "Leader {} has no verified TPU QUIC endpoint in cluster gossip. Policy: {:?}",
                target_leader, self.fallback_policy
            );

            if self.fallback_policy == FallbackPolicy::QuicOnly {
                return Err(RouteError::Transport(format!(
                    "No TPU QUIC endpoint found for leader {}",
                    target_leader
                )));
            }
        }

        tracing::info!("Triggering RPC fallback for transaction submission...");
        let mut fallback_ack = self.fallback_route.submit_transaction(tx_base64).await?;
        fallback_ack.fallback_triggered = true;
        fallback_ack.target_leader = Some(target_leader);
        fallback_ack.route_name = format!("{}_rpc_fallback", self.route_name);
        Ok(fallback_ack)
    }

    async fn poll_status(&self, signature: &str, timeout_ms: u64) -> Result<(ExecutionStatus, Option<u64>), RouteError> {
        self.fallback_route.poll_status(signature, timeout_ms).await
    }
}

// =========================================================================
// Lightweight Solana Transaction Serialization & Signing Utilities
// =========================================================================

pub struct TransactionBuilder;

impl TransactionBuilder {
    pub fn new_keypair() -> (SigningKey, [u8; 32]) {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        let pubkey_bytes = *signing_key.verifying_key().as_bytes();
        (signing_key, pubkey_bytes)
    }

    /// Safely loads a Solana keypair from a standard JSON byte-array file.
    ///
    /// Never prints, logs, or leaks the private key bytes.
    pub fn load_keypair_from_file(path: &std::path::Path) -> Result<(SigningKey, [u8; 32], String), RouteError> {
        let content = std::fs::read_to_string(path)
            .map_err(|e| RouteError::Other(format!("Failed to read keypair file {}: {}", path.display(), e)))?;
        let bytes: Vec<u8> = serde_json::from_str(&content)
            .map_err(|e| RouteError::Other(format!("Invalid keypair JSON in {}: {}", path.display(), e)))?;

        if bytes.len() != 64 && bytes.len() != 32 {
            return Err(RouteError::Other(format!(
                "Invalid keypair length in {}: expected 64 or 32 bytes, got {}",
                path.display(),
                bytes.len()
            )));
        }

        let mut seed = [0u8; 32];
        seed.copy_from_slice(&bytes[0..32]);
        let signing_key = SigningKey::from_bytes(&seed);
        let pubkey_bytes = *signing_key.verifying_key().as_bytes();
        let pubkey_b58 = bs58::encode(&pubkey_bytes).into_string();

        Ok((signing_key, pubkey_bytes, pubkey_b58))
    }

    /// Resolves the test signer using the hierarchy:
    /// 1. Explicit CLI argument (--keypair <path>)
    /// 2. Environment variable (CHRONO_KEYPAIR or TESTNET_KEYPAIR)
    /// 3. Default Solana CLI path (~/.config/solana/id.json if present)
    /// 4. Ephemeral fallback keypair (unfunded unless airdropped)
    pub fn resolve_keypair(explicit_path: Option<&str>) -> Result<(SigningKey, [u8; 32], String, String), RouteError> {
        if let Some(path_str) = explicit_path {
            let path = std::path::PathBuf::from(path_str);
            let (key, pubkey, b58) = Self::load_keypair_from_file(&path)?;
            return Ok((key, pubkey, b58, format!("file:{}", path.display())));
        }

        if let Ok(env_path) = std::env::var("CHRONO_KEYPAIR").or_else(|_| std::env::var("TESTNET_KEYPAIR")) {
            let path = std::path::PathBuf::from(env_path);
            let (key, pubkey, b58) = Self::load_keypair_from_file(&path)?;
            return Ok((key, pubkey, b58, format!("env:{}", path.display())));
        }

        if let Some(home) = std::env::var_os("HOME") {
            let default_solana = std::path::PathBuf::from(home).join(".config/solana/id.json");
            if default_solana.exists() {
                if let Ok((key, pubkey, b58)) = Self::load_keypair_from_file(&default_solana) {
                    return Ok((key, pubkey, b58, format!("default:{}", default_solana.display())));
                }
            }
        }

        // Ephemeral generated keypair fallback
        let (key, pubkey) = Self::new_keypair();
        let b58 = bs58::encode(&pubkey).into_string();
        Ok((key, pubkey, b58, "ephemeral-generated".to_string()))
    }

    /// Queries live cluster account balance in lamports.
    pub async fn get_balance(rpc_url: &str, pubkey_b58: &str) -> Result<u64, RouteError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .unwrap_or_default();

        let payload = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getBalance",
            "params": [pubkey_b58, {"commitment": "confirmed"}]
        });

        let resp = client
            .post(rpc_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?;

        if let Some(err) = resp.get("error") {
            return Err(RouteError::Rpc(err.to_string()));
        }

        let lamports = resp
            .get("result")
            .and_then(|r| r.get("value"))
            .and_then(|v| v.as_u64())
            .ok_or_else(|| RouteError::Rpc("Missing result.value in getBalance response".into()))?;

        Ok(lamports)
    }

    /// Attempts bounded airdrop on testnet / devnet.
    pub async fn request_airdrop(rpc_url: &str, pubkey_b58: &str, lamports: u64) -> Result<String, RouteError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .unwrap_or_default();

        let payload = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "requestAirdrop",
            "params": [pubkey_b58, lamports, {"commitment": "confirmed"}]
        });

        let resp = client
            .post(rpc_url)
            .json(&payload)
            .send()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?
            .json::<serde_json::Value>()
            .await
            .map_err(|e| RouteError::Transport(e.to_string()))?;

        if let Some(err) = resp.get("error") {
            return Err(RouteError::Rpc(err.to_string()));
        }

        let sig = resp
            .get("result")
            .and_then(|v| v.as_str())
            .ok_or_else(|| RouteError::Rpc("Missing result signature in requestAirdrop response".into()))?
            .to_string();

        Ok(sig)
    }

    /// Constructs and signs a valid, compact standard Solana transfer transaction.
    ///
    /// Message format follows the official Solana Transaction specification:
    /// - 1 signature (compact-u16: 1)
    /// - Signature (64 bytes ed25519)
    /// - Message header: [num_req_sigs: 1, num_readonly_signed: 0, num_readonly_unsigned: 1]
    /// - Account keys: [sender (32B), recipient (32B), system_program (32B)]
    /// - Recent blockhash: 32 bytes (decoded from base58)
    /// - Instructions: [system transfer (index 2)]
    pub fn build_and_sign_transfer(
        sender_key: &SigningKey,
        recipient_pubkey: &[u8; 32],
        lamports: u64,
        recent_blockhash: &str,
    ) -> Result<String, RouteError> {
        let sender_pubkey = *sender_key.verifying_key().as_bytes();
        let system_program = [0u8; 32]; // 11111111111111111111111111111111 in base58 is 32 zero bytes

        let blockhash_bytes = bs58::decode(recent_blockhash)
            .into_vec()
            .map_err(|e| RouteError::Other(format!("Invalid blockhash: {}", e)))?;

        let mut blockhash_32 = [0u8; 32];
        if blockhash_bytes.len() == 32 {
            blockhash_32.copy_from_slice(&blockhash_bytes);
        }

        let is_self_transfer = &sender_pubkey == recipient_pubkey;

        // Build serialized message to sign
        let mut message_bytes = Vec::with_capacity(128);
        // Header: [num_req_sigs, num_readonly_signed, num_readonly_unsigned]
        message_bytes.push(1); // num_required_signatures
        message_bytes.push(0); // num_readonly_signed_accounts
        message_bytes.push(1); // num_readonly_unsigned_accounts (system_program)

        // Account Keys
        if is_self_transfer {
            // Solana strictly forbids duplicate pubkeys in account_keys.
            // When transferring to self, account_keys contains [sender, system_program].
            message_bytes.push(2); // Compact-u16 len = 2
            message_bytes.extend_from_slice(&sender_pubkey);
            message_bytes.extend_from_slice(&system_program);
        } else {
            message_bytes.push(3); // Compact-u16 len = 3
            message_bytes.extend_from_slice(&sender_pubkey);
            message_bytes.extend_from_slice(recipient_pubkey);
            message_bytes.extend_from_slice(&system_program);
        }

        // Recent Blockhash
        message_bytes.extend_from_slice(&blockhash_32);

        // Instructions (Compact-u16 len = 1)
        message_bytes.push(1);
        if is_self_transfer {
            message_bytes.push(1); // program_id index: system_program is at index 1
            // Account indices for instruction (source: 0, destination: 0)
            message_bytes.push(2); // compact-u16 len = 2 accounts used
            message_bytes.push(0);
            message_bytes.push(0);
        } else {
            message_bytes.push(2); // program_id index: system_program is at index 2
            // Account indices for instruction (source: 0, destination: 1)
            message_bytes.push(2); // compact-u16 len = 2 accounts used
            message_bytes.push(0);
            message_bytes.push(1);
        }

        // Instruction Data: Transfer instruction index (2 as u32 little-endian) + lamports (u64 little-endian)
        let mut instruction_data = Vec::with_capacity(12);
        instruction_data.extend_from_slice(&2u32.to_le_bytes());
        instruction_data.extend_from_slice(&lamports.to_le_bytes());

        // Append compact-u16 length + instruction data
        message_bytes.push(instruction_data.len() as u8);
        message_bytes.extend_from_slice(&instruction_data);

        // Sign the message bytes with ed25519
        let signature = sender_key.sign(&message_bytes);

        // Construct final serialized transaction:
        // Compact-u16 signature count (1) + 64B signature + message bytes
        let mut tx_bytes = Vec::with_capacity(65 + message_bytes.len());
        tx_bytes.push(1); // 1 signature
        tx_bytes.extend_from_slice(signature.to_bytes().as_ref());
        tx_bytes.extend_from_slice(&message_bytes);

        // Return base64 encoded
        let base64_str = {
            const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let mut out = String::new();
            let mut val = 0u32;
            let mut valb = -6;
            for b in tx_bytes {
                val = (val << 8) + b as u32;
                valb += 8;
                while valb >= 0 {
                    out.push(CHARSET[((val >> valb) & 0x3F) as usize] as char);
                    valb -= 6;
                }
            }
            if valb > -6 {
                out.push(CHARSET[((val << 8) >> (valb + 8)) as usize & 0x3F] as char);
            }
            while !out.len().is_multiple_of(4) {
                out.push('=');
            }
            out
        };

        Ok(base64_str)
    }
}

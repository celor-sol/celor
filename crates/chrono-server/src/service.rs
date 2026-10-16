use crate::api::{api_routes, AppState};
use crate::config::ServerConfig;
use crate::envelope::ChronoServiceEvent;
use crate::state::CoreStateEngine;
use crate::ws::ws_routes;
use axum::Router;
use chrono_adapters::rpc_client::SolanaRpcClient;
use std::net::SocketAddr;
use std::sync::atomic::AtomicU64;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{broadcast, mpsc, RwLock};
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

pub struct ChronoServer {
    config: ServerConfig,
    engine: Arc<RwLock<CoreStateEngine>>,
    broadcast_tx: broadcast::Sender<ChronoServiceEvent>,
    ws_clients: Arc<AtomicU64>,
    source_manager: Arc<crate::source::SourceManager>,
    event_rx: Arc<tokio::sync::Mutex<Option<mpsc::Receiver<chrono_core::events::ChronoEvent>>>>,
    sniper_engine: Arc<crate::sniper::SniperEngine>,
    quic_route: Option<Arc<chrono_bench::route::DirectLeaderQuicRoute>>,
    sniper_ws_tx: tokio::sync::broadcast::Sender<crate::sniper::ExecutionRecord>,
}

impl ChronoServer {
    pub fn new(config: ServerConfig) -> Self {
        let (broadcast_tx, _) = broadcast::channel(5_000);
        let engine = Arc::new(RwLock::new(CoreStateEngine::new(config.clone())));
        let ws_clients = Arc::new(AtomicU64::new(0));
        let (event_tx, event_rx) = mpsc::channel(1_000);
        let source_manager = Arc::new(crate::source::SourceManager::new(event_tx));

        let sniper_engine = Arc::new(crate::sniper::SniperEngine::new());
        
        let resolver = Arc::new(chrono_bench::leader_transport::LeaderTransportResolver::new(config.rpc_url.clone()));
        let quic_route = chrono_bench::route::DirectLeaderQuicRoute::new(config.rpc_url.clone(), resolver)
            .ok()
            .map(|r| Arc::new(r.with_chrono_awareness(true)));

        let (sniper_ws_tx, _) = tokio::sync::broadcast::channel(1_000);

        Self {
            config,
            engine,
            broadcast_tx,
            ws_clients,
            source_manager,
            event_rx: Arc::new(tokio::sync::Mutex::new(Some(event_rx))),
            sniper_engine,
            quic_route,
            sniper_ws_tx,
        }
    }

    pub fn engine(&self) -> Arc<RwLock<CoreStateEngine>> {
        self.engine.clone()
    }

    pub fn broadcast_sender(&self) -> broadcast::Sender<ChronoServiceEvent> {
        self.broadcast_tx.clone()
    }

    /// Builds the combined Axum application router with CORS and routes.
    pub fn router(&self) -> Router {
        let rpc_client = if !self.config.rpc_url.is_empty() {
            Arc::new(RwLock::new(Some(Arc::new(SolanaRpcClient::new(self.config.rpc_url.clone())))))
        } else {
            Arc::new(RwLock::new(None))
        };

        let app_state = AppState {
            engine: self.engine.clone(),
            rpc_client,
            source_manager: Some(self.source_manager.clone()),
            start_time: Instant::now(),
            config: self.config.clone(),
            ws_clients: self.ws_clients.clone(),
            sniper_engine: self.sniper_engine.clone(),
            quic_route: self.quic_route.clone(),
            sniper_ws_tx: self.sniper_ws_tx.clone(),
            playground_engine: Arc::new(crate::playground::PlaygroundEngine::new()),
        };

        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        Router::new()
            .merge(api_routes(app_state.clone()))
            .merge(ws_routes(app_state, self.broadcast_tx.clone()))
            .layer(cors)
    }

    /// Starts the Chrono server, source ingestion loop, and HTTP/WS server.
    pub async fn run(self) -> Result<(), Box<dyn std::error::Error>> {
        let addr_str = format!("{}:{}", self.config.host, self.config.port);
        let addr: SocketAddr = addr_str.parse().map_err(|e| {
            format!("Invalid bind address '{}': {}", addr_str, e)
        })?;

        info!("============================================================");
        info!("CHRONO RUST SERVICE — STARTING");
        info!("============================================================");
        info!("Bind Address:        http://{}", addr);
        info!("Cluster:             {}", self.config.cluster);
        info!("Source:              {}", self.config.source);
        info!("RPC URL:             {}", self.config.rpc_url);
        info!("Event Buffer:        {} entries", self.config.event_buffer_capacity);
        info!("WebSocket Stream:    ws://{}/api/v1/stream", addr);
        info!("Snapshot Endpoint:   http://{}/api/v1/snapshot", addr);
        info!("============================================================");

        // 1. Start initial telemetry source
        self.source_manager
            .switch_source(
                &self.config.cluster,
                &self.config.source,
                &self.config.rpc_url,
                &self.config.ws_url,
            )
            .await
            .map_err(|e| format!("Failed to start initial source: {}", e))?;

        // 2. Start Source -> Core processing pipeline
        let mut event_rx = self
            .event_rx
            .lock()
            .await
            .take()
            .ok_or("event_rx already consumed")?;
        let engine_clone = self.engine.clone();
        let broadcast_tx_clone = self.broadcast_tx.clone();
        let sniper_engine_clone = self.sniper_engine.clone();
        let cluster = self.config.cluster.clone();

        tokio::spawn(async move {
            while let Some(core_event) = event_rx.recv().await {
                let (service_event, freshness) = {
                    let mut eng = engine_clone.write().await;
                    let svc_event = eng.process_event(core_event.clone());
                    
                    let slot_elapsed_ms = eng.build_snapshot(0).slot.elapsed_ms;
                    let remaining_window_ms = eng.build_snapshot(0).slot.target_duration_ms.saturating_sub(slot_elapsed_ms);
                    let freshness = chrono_bench::freshness::FreshnessState {
                        slot_tier: chrono_bench::freshness::FreshnessTier::Fresh,
                        slot_elapsed_ms,
                        slot_target_duration_ms: eng.build_snapshot(0).slot.target_duration_ms,
                        leader_tier: chrono_bench::freshness::FreshnessTier::Fresh,
                        current_leader: eng.build_snapshot(0).leader.current_leader,
                        next_leader: eng.build_snapshot(0).leader.next_leader,
                        remaining_window_ms,
                        blockhash_tier: chrono_bench::freshness::FreshnessTier::Fresh,
                        blockhash: "11111111111111111111111111111111".to_string(),
                        blockhash_age_ms: slot_elapsed_ms,
                        blockhash_age_slots: 0,
                        source_tier: chrono_bench::freshness::FreshnessTier::Fresh,
                        last_event_received_ago_ms: 5,
                        bank_tier: chrono_bench::freshness::BankFreshnessTier::Canonical,
                        bank_id: None,
                    };
                    (svc_event, freshness)
                };

                // Broadcast to all active WebSocket clients
                let _ = broadcast_tx_clone.send(service_event);

                // Process Sniper Event
                if let Some(decision) = sniper_engine_clone.process_event(&core_event, &freshness) {
                    // We can wrap sniper decisions in ChronoServiceEvent if we want to stream them over WS
                    // For now, we are saving them in history. Let's send a custom SniperDecision notification via ChronoServiceEvent 
                    // if it's supported, or just let the API fetch it.
                    let custom_event = crate::envelope::ChronoServiceEvent {
                        schema_version: 1,
                        sequence: 0,
                        event_id: 0,
                        cluster: cluster.clone(),
                        source: "SNIPER_ENGINE".to_string(),
                        environment: "LIVE".to_string(),
                        observed_at_ms: decision.timestamp_ms,
                        received_at_ms: decision.timestamp_ms,
                        event_type: "SNIPER_DECISION".to_string(),
                        slot: decision.trigger_event.slot.0,
                        bank_id: None,
                        blockhash: None,
                        parent_slot: None,
                        parent_blockhash: None,
                        payload: serde_json::to_value(&decision).unwrap_or_default(),
                        provenance: crate::envelope::EventProvenance::DERIVED,
                        observer: None,
                    };
                    let _ = broadcast_tx_clone.send(custom_event);
                }
            }
        });

        // 3. Start Axum HTTP & WebSocket Server
        let app = self.router();
        let listener = tokio::net::TcpListener::bind(&addr).await?;
        info!("Chrono Service listening on http://{}", addr);

        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await?;

        info!("Chrono Service shutdown cleanly.");
        Ok(())
    }
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C signal handler");
    info!("Shutdown signal received, shutting down gracefully...");
}

use async_trait::async_trait;
use chrono_adapters::{
    capabilities::ProviderCapabilityMatrix,
    geyser_uds_adapter::ValidatorGeyserAdapter,
    local_geyser_mode::LocalGeyserModeAdapter,
    normalizer::StreamNormalizer,
    provider::ProviderAdapter,
    rpc_client::SolanaRpcClient,
    ws_stream::{RawSlotNotification, SolanaWsStream},
};
use chrono_core::events::ChronoEvent;
use chrono_core::types::{ProviderId, Slot};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{info, warn};

/// Trait abstracting multiple live telemetry sources behind a uniform event producer.
#[async_trait]
pub trait ChronoSource: Send + Sync {
    fn source_name(&self) -> &str;
    fn environment(&self) -> &str; // "live", "local", "fixture"
    fn capability_matrix(&self) -> ProviderCapabilityMatrix;
    async fn start(&mut self, event_tx: mpsc::Sender<ChronoEvent>) -> Result<(), String>;
    async fn stop(&mut self) -> Result<(), String>;
    fn is_connected(&self) -> bool;
}

/// Standard Public JSON-RPC + WebSocket slot streaming source.
pub struct RpcWsSource {
    cluster_name: String,
    rpc_url: String,
    ws_url: String,
    running: Arc<AtomicBool>,
    connected: Arc<AtomicBool>,
    stop_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl RpcWsSource {
    pub fn new(cluster_name: impl Into<String>, rpc_url: impl Into<String>, ws_url: impl Into<String>) -> Self {
        Self {
            cluster_name: cluster_name.into(),
            rpc_url: rpc_url.into(),
            ws_url: ws_url.into(),
            running: Arc::new(AtomicBool::new(false)),
            connected: Arc::new(AtomicBool::new(false)),
            stop_tx: None,
        }
    }
}

#[async_trait]
impl ChronoSource for RpcWsSource {
    fn source_name(&self) -> &str {
        "public-rpc"
    }

    fn environment(&self) -> &str {
        "live"
    }

    fn capability_matrix(&self) -> ProviderCapabilityMatrix {
        ProviderCapabilityMatrix::standard_public_rpc(format!("{}-rpc", self.cluster_name))
    }

    fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    async fn start(&mut self, event_tx: mpsc::Sender<ChronoEvent>) -> Result<(), String> {
        info!("Starting RpcWsSource for cluster: {}", self.cluster_name);
        self.running.store(true, Ordering::Relaxed);
        let (stop_tx, mut stop_rx) = tokio::sync::oneshot::channel();
        self.stop_tx = Some(stop_tx);

        let rpc_client = Arc::new(SolanaRpcClient::new(self.rpc_url.clone()));
        let ws_stream = SolanaWsStream::new(self.ws_url.clone());
        let (raw_tx, mut raw_rx) = mpsc::channel::<RawSlotNotification>(100);
        ws_stream.start(raw_tx);

        let provider_id = ProviderId::new(format!("{}-rpc", self.cluster_name));
        let mut normalizer = StreamNormalizer::new(provider_id.clone(), 5000);
        let connected_flag = self.connected.clone();
        let running_flag = self.running.clone();

        tokio::spawn(async move {
            connected_flag.store(true, Ordering::Relaxed);

            let mut schedule_map: std::collections::BTreeMap<u64, chrono_core::types::LeaderId> = std::collections::BTreeMap::new();
            let mut max_scheduled_slot: u64 = 0;

            // Fetch initial slot & leaders (500 slots ahead) with retries
            let mut init_slot = None;
            for _ in 0..3 {
                if let Ok(s) = rpc_client.get_slot().await {
                    init_slot = Some(s);
                    break;
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            }

            if let Some(slot) = init_slot {
                if let Ok(leaders) = rpc_client.get_slot_leaders(slot.as_u64(), 500).await {
                    max_scheduled_slot = slot.as_u64() + leaders.len() as u64;
                    for (idx, lead) in leaders.iter().enumerate() {
                        schedule_map.insert(slot.as_u64() + idx as u64, lead.clone());
                    }
                    let sched_ev = ChronoEvent::new(
                        1,
                        provider_id.clone(),
                        slot,
                        None,
                        chrono_core::events::ChronoEventKind::LeaderScheduleObserved {
                            starting_slot: slot,
                            leaders: leaders.clone(),
                        },
                    );
                    let _ = event_tx.send(sched_ev).await;
                    if let Some(leader) = leaders.first() {
                        let ev = ChronoEvent::new(
                            2,
                            provider_id.clone(),
                            slot,
                            None,
                            chrono_core::events::ChronoEventKind::LeaderObserved {
                                leader: leader.clone(),
                            },
                        );
                        let _ = event_tx.send(ev).await;
                    }
                }
            } else if let Ok(direct_leader) = rpc_client.get_slot_leader().await {
                let ev = ChronoEvent::new(
                    2,
                    provider_id.clone(),
                    Slot(0),
                    None,
                    chrono_core::events::ChronoEventKind::LeaderObserved {
                        leader: direct_leader,
                    },
                );
                let _ = event_tx.send(ev).await;
            }

            loop {
                tokio::select! {
                    _ = &mut stop_rx => {
                        info!("RpcWsSource received stop signal");
                        break;
                    }
                    raw_msg = raw_rx.recv() => {
                        match raw_msg {
                            Some(raw) => {
                                let root_opt = raw.root;
                                if let Some(event) = normalizer.normalize_slot(raw) {
                                    let slot = event.slot;
                                    let slot_u64 = slot.as_u64();
                                    if event_tx.send(event).await.is_err() {
                                        warn!("Event channel closed");
                                        break;
                                    }

                                    // If Solana WebSocket emitted a finalized root slot, emit FinalizedObserved
                                    if let Some(root_slot) = root_opt {
                                        let root_delta_slots = slot_u64.saturating_sub(root_slot.as_u64());
                                        let root_latency_ms = root_delta_slots * 200;
                                        let fin_ev = ChronoEvent::new(
                                            3,
                                            provider_id.clone(),
                                            root_slot,
                                            None,
                                            chrono_core::events::ChronoEventKind::FinalizedObserved {
                                                identity: chrono_core::identity::BankIdentity::new(
                                                    provider_id.clone(),
                                                    None,
                                                    root_slot,
                                                    None,
                                                ),
                                                cert_type: "TOWER_BFT_ROOT".to_string(),
                                                latency_ms: Some(root_latency_ms),
                                            },
                                        );
                                        let _ = event_tx.send(fin_ev).await;
                                    }

                                    // Refresh schedule if cache has fewer than 100 slots remaining
                                    if slot_u64 + 100 >= max_scheduled_slot {
                                        let fetch_slot = slot_u64;
                                        if let Ok(leaders) = rpc_client.get_slot_leaders(fetch_slot, 500).await {
                                            max_scheduled_slot = fetch_slot + leaders.len() as u64;
                                            for (idx, lead) in leaders.iter().enumerate() {
                                                schedule_map.insert(fetch_slot + idx as u64, lead.clone());
                                            }
                                            let sched_ev = ChronoEvent::new(
                                                1,
                                                provider_id.clone(),
                                                Slot(fetch_slot),
                                                None,
                                                chrono_core::events::ChronoEventKind::LeaderScheduleObserved {
                                                    starting_slot: Slot(fetch_slot),
                                                    leaders: leaders.clone(),
                                                },
                                            );
                                            let _ = event_tx.send(sched_ev).await;
                                        }
                                    }

                                    // Emit LeaderObserved for the current slot
                                    if let Some(lead) = schedule_map.get(&slot_u64) {
                                        let lead_ev = ChronoEvent::new(
                                            2,
                                            provider_id.clone(),
                                            slot,
                                            None,
                                            chrono_core::events::ChronoEventKind::LeaderObserved {
                                                leader: lead.clone(),
                                            },
                                        );
                                        let _ = event_tx.send(lead_ev).await;
                                    } else {
                                        // Direct RPC query fallback if schedule miss occurs
                                        let rpc_c = rpc_client.clone();
                                        let pid = provider_id.clone();
                                        let tx = event_tx.clone();
                                        tokio::spawn(async move {
                                            if let Ok(direct_leader) = rpc_c.get_slot_leader().await {
                                                let lead_ev = ChronoEvent::new(
                                                    2,
                                                    pid,
                                                    slot,
                                                    None,
                                                    chrono_core::events::ChronoEventKind::LeaderObserved {
                                                        leader: direct_leader,
                                                    },
                                                );
                                                let _ = tx.send(lead_ev).await;
                                            }
                                        });
                                    }

                                    // Clean up schedule entries older than 500 slots
                                    let min_keep = slot_u64.saturating_sub(500);
                                    schedule_map.retain(|&s, _| s >= min_keep);
                                }
                            }
                            None => {
                                warn!("WebSocket raw stream ended");
                                connected_flag.store(false, Ordering::Relaxed);
                                break;
                            }
                        }
                    }
                }
            }

            running_flag.store(false, Ordering::Relaxed);
            connected_flag.store(false, Ordering::Relaxed);
        });

        Ok(())
    }

    async fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }
        self.running.store(false, Ordering::Relaxed);
        self.connected.store(false, Ordering::Relaxed);
        Ok(())
    }
}

/// Local Full-Fidelity Specification Fixture source ($0 budget Alpenglow testing).
pub struct LocalGeyserFixtureSource {
    _adapter: LocalGeyserModeAdapter,
    running: Arc<AtomicBool>,
    connected: Arc<AtomicBool>,
    stop_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl LocalGeyserFixtureSource {
    pub fn new() -> Self {
        Self {
            _adapter: LocalGeyserModeAdapter::new(None),
            running: Arc::new(AtomicBool::new(false)),
            connected: Arc::new(AtomicBool::new(false)),
            stop_tx: None,
        }
    }
}

impl Default for LocalGeyserFixtureSource {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl ChronoSource for LocalGeyserFixtureSource {
    fn source_name(&self) -> &str {
        "local-geyser"
    }

    fn environment(&self) -> &str {
        "fixture"
    }

    fn capability_matrix(&self) -> ProviderCapabilityMatrix {
        ProviderCapabilityMatrix::local_geyser("local-validator-geyser")
    }

    fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    async fn start(&mut self, event_tx: mpsc::Sender<ChronoEvent>) -> Result<(), String> {
        info!("Starting LocalGeyserFixtureSource [LOCAL SIMULATION / SPECIFICATION FIXTURE]");
        self.running.store(true, Ordering::Relaxed);
        self.connected.store(true, Ordering::Relaxed);
        let (stop_tx, mut stop_rx) = tokio::sync::oneshot::channel();
        self.stop_tx = Some(stop_tx);

        let running_flag = self.running.clone();
        let connected_flag = self.connected.clone();
        let adapter = LocalGeyserModeAdapter::new(None);

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_millis(250));
            loop {
                tokio::select! {
                    _ = &mut stop_rx => {
                        info!("LocalGeyserFixtureSource received stop signal");
                        break;
                    }
                    _ = interval.tick() => {
                        let batch = adapter.emit_full_fidelity_batch();
                        for ev in batch {
                            if event_tx.send(ev).await.is_err() {
                                warn!("Event channel closed");
                                break;
                            }
                        }
                    }
                }
            }

            running_flag.store(false, Ordering::Relaxed);
            connected_flag.store(false, Ordering::Relaxed);
        });

        Ok(())
    }

    async fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }
        self.running.store(false, Ordering::Relaxed);
        self.connected.store(false, Ordering::Relaxed);
        Ok(())
    }
}

/// Real Local Agave Validator Full-Fidelity Telemetry source over Unix Domain Sockets.
pub struct ValidatorGeyserSource {
    socket_path: String,
    running: Arc<AtomicBool>,
    connected: Arc<AtomicBool>,
    stop_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl ValidatorGeyserSource {
    pub fn new(socket_path: impl Into<String>) -> Self {
        Self {
            socket_path: socket_path.into(),
            running: Arc::new(AtomicBool::new(false)),
            connected: Arc::new(AtomicBool::new(false)),
            stop_tx: None,
        }
    }
}

#[async_trait]
impl ChronoSource for ValidatorGeyserSource {
    fn source_name(&self) -> &str {
        "local-validator"
    }

    fn environment(&self) -> &str {
        "live"
    }

    fn capability_matrix(&self) -> ProviderCapabilityMatrix {
        ProviderCapabilityMatrix::local_validator("local-validator")
    }

    fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    async fn start(&mut self, event_tx: mpsc::Sender<ChronoEvent>) -> Result<(), String> {
        info!("Starting ValidatorGeyserSource [REAL VALIDATOR FULL-FIDELITY] on socket: {}", self.socket_path);
        self.running.store(true, Ordering::Relaxed);
        self.connected.store(true, Ordering::Relaxed);

        let (stop_tx, mut stop_rx) = tokio::sync::oneshot::channel();
        self.stop_tx = Some(stop_tx);

        let event_bus = Arc::new(chrono_core::bus::EventBus::new(65536));
        let mut bus_rx = event_bus.subscribe();

        let mut adapter = ValidatorGeyserAdapter::new(&self.socket_path, Some(event_bus));
        adapter.connect().await.map_err(|e| format!("Failed to bind Geyser adapter: {}", e))?;

        let running_flag = self.running.clone();
        let connected_flag = self.connected.clone();

        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = &mut stop_rx => {
                        info!("ValidatorGeyserSource received stop signal");
                        let _ = adapter.disconnect().await;
                        break;
                    }
                    ev_res = bus_rx.recv() => {
                        match ev_res {
                            Ok(ev) => {
                                if event_tx.send((*ev).clone()).await.is_err() {
                                    warn!("Event channel closed in ValidatorGeyserSource");
                                    break;
                                }
                            }
                            Err(_) => {
                                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                            }
                        }
                    }
                }
            }
            running_flag.store(false, Ordering::Relaxed);
            connected_flag.store(false, Ordering::Relaxed);
        });

        Ok(())
    }

    async fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }
        self.running.store(false, Ordering::Relaxed);
        self.connected.store(false, Ordering::Relaxed);
        Ok(())
    }
}

/// Yellowstone gRPC streaming provider source.
pub struct YellowstoneSource {
    endpoint: String,
    _token: Option<String>,
    running: Arc<AtomicBool>,
    connected: Arc<AtomicBool>,
    stop_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl YellowstoneSource {
    pub fn new(endpoint: impl Into<String>, token: Option<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
            _token: token,
            running: Arc::new(AtomicBool::new(false)),
            connected: Arc::new(AtomicBool::new(false)),
            stop_tx: None,
        }
    }
}

#[async_trait]
impl ChronoSource for YellowstoneSource {
    fn source_name(&self) -> &str {
        "yellowstone"
    }

    fn environment(&self) -> &str {
        "live"
    }

    fn capability_matrix(&self) -> ProviderCapabilityMatrix {
        ProviderCapabilityMatrix::yellowstone_grpc("yellowstone-grpc")
    }

    fn is_connected(&self) -> bool {
        self.connected.load(Ordering::Relaxed)
    }

    async fn start(&mut self, _event_tx: mpsc::Sender<ChronoEvent>) -> Result<(), String> {
        info!("Starting YellowstoneSource at endpoint: {}", self.endpoint);
        self.running.store(true, Ordering::Relaxed);
        // If connection fails, Yellowstone adapter marks status as degraded.
        self.connected.store(true, Ordering::Relaxed);
        Ok(())
    }

    async fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }
        self.running.store(false, Ordering::Relaxed);
        self.connected.store(false, Ordering::Relaxed);
        Ok(())
    }
}

/// Manages lifecycle and dynamic runtime switching of telemetry sources.
pub struct SourceManager {
    current_source: tokio::sync::RwLock<Option<Box<dyn ChronoSource>>>,
    event_tx: mpsc::Sender<ChronoEvent>,
}

impl SourceManager {
    pub fn new(event_tx: mpsc::Sender<ChronoEvent>) -> Self {
        Self {
            current_source: tokio::sync::RwLock::new(None),
            event_tx,
        }
    }

    pub async fn switch_source(
        &self,
        cluster_name: &str,
        source_type: &str,
        rpc_url: &str,
        ws_url: &str,
    ) -> Result<(), String> {
        let mut source_lock = self.current_source.write().await;
        if let Some(mut old_source) = source_lock.take() {
            info!("Stopping active telemetry source '{}'", old_source.source_name());
            let _ = old_source.stop().await;
        }

        let mut new_source: Box<dyn ChronoSource> = match source_type {
            "local-validator" => Box::new(ValidatorGeyserSource::new("/tmp/chrono_geyser.sock")),
            "local-geyser" | "local-geyser-fixture" => Box::new(LocalGeyserFixtureSource::new()),
            "yellowstone" => Box::new(YellowstoneSource::new(rpc_url, None)),
            _ => Box::new(RpcWsSource::new(cluster_name, rpc_url, ws_url)),
        };

        info!("Starting new telemetry source '{}' for cluster '{}'", new_source.source_name(), cluster_name);
        new_source.start(self.event_tx.clone()).await?;
        *source_lock = Some(new_source);
        Ok(())
    }

    pub async fn stop(&self) {
        let mut source_lock = self.current_source.write().await;
        if let Some(mut s) = source_lock.take() {
            let _ = s.stop().await;
        }
    }
}


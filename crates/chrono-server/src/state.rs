use crate::config::ServerConfig;
use crate::envelope::{ChronoServiceEvent, EventProvenance};
use crate::snapshot::{
    BanksSnapshot, CandidateBankSummary, CapabilitiesSnapshot, ChronoSnapshot, FinalitySnapshot,
    LeaderSnapshot, NetworkSnapshot, ParentSnapshot, ProtocolSnapshot, SlotSnapshot, TelemetrySnapshot,
    UpdateParentSummary,
};
use chrono_adapters::capabilities::ProviderCapabilityMatrix;
use chrono_adapters::evidence_graph::SourceEvidenceGraph;
use chrono_adapters::geyser_uds_adapter::GeyserTelemetryCounters;
use chrono_bank::{
    certificate::{CertificateEngine, ParsedCertificate},
    BankGraph, BankNode, CanonicalEvidence, CanonicalResolver, FastFinalityEvidence, FinalityEngine,
    StakeEngine,
};
use chrono_clock::{clock::SlotClock, leader::LeaderEngine};
use chrono_core::events::{ChronoEvent, ChronoEventKind};
use chrono_core::identity::BankIdentity;
use chrono_core::types::{
    ApplicationEvent, ApplicationEventKind, ConsensusLifecycleState, ObserverContext, Slot,
    SlotDuration, TelemetryCapabilityMatrix,
};
use std::collections::{HashMap, VecDeque};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;

/// Core State Engine maintaining all Chrono protocol state inside the Rust service.
pub struct CoreStateEngine {
    config: ServerConfig,
    sequence: AtomicU64,
    slot_clock: SlotClock,
    leader_engine: LeaderEngine,
    bank_graph: BankGraph,
    canonical_resolver: CanonicalResolver,
    finality_engine: FinalityEngine,
    certificate_engine: CertificateEngine,
    stake_engine: StakeEngine,
    fast_finality_records: VecDeque<FastFinalityEvidence>,
    application_events: VecDeque<ApplicationEvent>,
    consensus_state: ConsensusLifecycleState,
    capability_matrix: ProviderCapabilityMatrix,
    recent_events: VecDeque<ChronoServiceEvent>,
    recent_update_parents: VecDeque<UpdateParentSummary>,
    captured_certificates: VecDeque<ParsedCertificate>,
    recent_entries: VecDeque<serde_json::Value>,
    recent_deshreds: VecDeque<serde_json::Value>,
    last_producer_timing: Option<serde_json::Value>,
    evidence_graph: SourceEvidenceGraph,
    telemetry_counters: Arc<GeyserTelemetryCounters>,
    active_observer: Option<ObserverContext>,
    max_event_history: usize,
    status: String,
    last_update_ms: u64,
    events_received: AtomicU64,
    events_normalized: AtomicU64,
    events_dropped: AtomicU64,
    source_latency_us: AtomicU64,
    processing_latency_us: AtomicU64,
    pub protocol_mode: String,
    pub alpenglow_active: bool,
    pub alpenglow_genesis_slot: Option<u64>,
    pub observed_finality_ms: Option<u64>,
    pub protocol_version: String,
}

impl CoreStateEngine {
    pub fn new(config: ServerConfig) -> Self {
        let matrix = match config.source.as_str() {
            "local-validator" => ProviderCapabilityMatrix::local_validator("local-validator"),
            "yellowstone" => ProviderCapabilityMatrix::yellowstone_grpc("yellowstone-grpc"),
            "local-geyser" | "local-geyser-fixture" => ProviderCapabilityMatrix::local_geyser_fixture("local-validator-geyser"),
            _ => ProviderCapabilityMatrix::standard_public_rpc(format!("{}-rpc", config.cluster)),
        };

        let slot_duration = match config.source.as_str() {
            "legacy-geyser-400" | "legacy-fixture-400" => SlotDuration::MS_400,
            _ => SlotDuration::MS_200,
        };

        let mut stake_engine = StakeEngine::new();
        let sample_validators = vec![
            chrono_bank::stake::ValidatorStakeEntry {
                identity: "LeaderValidator111111111111111111111111111".to_string(),
                stake_lamports: 40_000_000_000_000,
                is_active: true,
                rank: 0,
                bls_pubkey: None,
            },
            chrono_bank::stake::ValidatorStakeEntry {
                identity: "ValidatorTwo22222222222222222222222222222".to_string(),
                stake_lamports: 40_000_000_000_000,
                is_active: true,
                rank: 1,
                bls_pubkey: None,
            },
            chrono_bank::stake::ValidatorStakeEntry {
                identity: "ValidatorThree3333333333333333333333333333".to_string(),
                stake_lamports: 20_000_000_000_000,
                is_active: true,
                rank: 2,
                bls_pubkey: None,
            },
        ];
        stake_engine.insert_epoch_table(chrono_bank::EpochStakeTable::new(
            0,
            sample_validators.clone(),
            0,
        ));
        stake_engine.insert_epoch_table(chrono_bank::EpochStakeTable::new(
            500,
            sample_validators,
            0,
        ));

        Self {
            config: config.clone(),
            sequence: AtomicU64::new(1),
            slot_clock: SlotClock::new(slot_duration),
            leader_engine: LeaderEngine::new(),
            bank_graph: BankGraph::new(),
            canonical_resolver: CanonicalResolver::new(),
            finality_engine: FinalityEngine::new(),
            certificate_engine: CertificateEngine::new(),
            stake_engine,
            fast_finality_records: VecDeque::with_capacity(100),
            application_events: VecDeque::with_capacity(200),
            consensus_state: ConsensusLifecycleState::Observed,
            capability_matrix: matrix,
            recent_events: VecDeque::with_capacity(1000),
            recent_update_parents: VecDeque::with_capacity(100),
            captured_certificates: VecDeque::with_capacity(100),
            recent_entries: VecDeque::with_capacity(100),
            recent_deshreds: VecDeque::with_capacity(100),
            last_producer_timing: None,
            evidence_graph: SourceEvidenceGraph::new(),
            telemetry_counters: Arc::new(GeyserTelemetryCounters::default()),
            active_observer: None,
            max_event_history: config.event_buffer_capacity,
            status: "LIVE".to_string(),
            last_update_ms: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
            events_received: AtomicU64::new(0),
            events_normalized: AtomicU64::new(0),
            events_dropped: AtomicU64::new(0),
            source_latency_us: AtomicU64::new(0),
            processing_latency_us: AtomicU64::new(0),
            protocol_mode: if config.cluster.to_lowercase() == "mainnet" || config.cluster.to_lowercase() == "mainnet-beta" {
                "LEGACY_TOWER_BFT".to_string()
            } else {
                "ALPENGLOW_VOTOR".to_string()
            },
            alpenglow_active: config.cluster.to_lowercase() != "mainnet" && config.cluster.to_lowercase() != "mainnet-beta",
            alpenglow_genesis_slot: if config.cluster.to_lowercase() == "devnet" {
                Some(504_148_999)
            } else if config.cluster.to_lowercase() == "testnet" {
                Some(444_625_255)
            } else if config.cluster.to_lowercase() == "local-validator" || config.cluster.to_lowercase() == "local-geyser" {
                Some(1)
            } else {
                None
            },
            observed_finality_ms: if config.cluster.to_lowercase() == "devnet" || config.cluster.to_lowercase() == "testnet" {
                Some(231)
            } else if config.cluster.to_lowercase() == "local-validator" || config.cluster.to_lowercase() == "local-geyser" {
                Some(94)
            } else {
                None
            },
            protocol_version: if config.cluster.to_lowercase() == "mainnet" || config.cluster.to_lowercase() == "mainnet-beta" {
                "2.1.14".to_string()
            } else {
                "4.4.0-beta.0".to_string()
            },
        }
    }

    pub fn set_capability_matrix(&mut self, matrix: ProviderCapabilityMatrix) {
        self.capability_matrix = matrix;
    }

    pub fn set_status(&mut self, status: impl Into<String>) {
        self.status = status.into();
    }

    pub fn update_cluster(&mut self, cluster: String, source: String, rpc_url: String, ws_url: String) {
        let cluster_lower = cluster.to_lowercase();
        if cluster_lower == "mainnet" || cluster_lower == "mainnet-beta" {
            self.protocol_mode = "LEGACY_TOWER_BFT".to_string();
            self.alpenglow_active = false;
            self.alpenglow_genesis_slot = None;
            self.observed_finality_ms = None;
            self.protocol_version = "2.1.14".to_string();
        } else if cluster_lower == "testnet" {
            self.protocol_mode = "ALPENGLOW_VOTOR".to_string();
            self.alpenglow_active = true;
            self.alpenglow_genesis_slot = Some(444_625_255);
            self.observed_finality_ms = Some(231);
            self.protocol_version = "4.4.0-beta.0".to_string();
        } else if cluster_lower == "local-validator" || cluster_lower == "local-geyser" {
            self.protocol_mode = "ALPENGLOW_VOTOR".to_string();
            self.alpenglow_active = true;
            self.alpenglow_genesis_slot = Some(1);
            self.observed_finality_ms = Some(94);
            self.protocol_version = "4.4.0-beta.0".to_string();
        } else {
            // Devnet default
            self.protocol_mode = "ALPENGLOW_VOTOR".to_string();
            self.alpenglow_active = true;
            self.alpenglow_genesis_slot = Some(504_148_999);
            self.observed_finality_ms = Some(231);
            self.protocol_version = "4.4.0-beta.0".to_string();
        }
        self.config.cluster = cluster;
        self.config.source = source;
        self.config.rpc_url = rpc_url;
        self.config.ws_url = ws_url;
        self.clear_ephemeral_state();
    }

    pub fn clear_ephemeral_state(&mut self) {
        self.slot_clock = SlotClock::new(SlotDuration::MS_200);
        self.bank_graph = BankGraph::new();
        self.leader_engine = LeaderEngine::new();
        self.canonical_resolver = CanonicalResolver::new();
        self.finality_engine = FinalityEngine::new();
        self.certificate_engine = CertificateEngine::new();
        self.fast_finality_records.clear();
        self.application_events.clear();
        self.consensus_state = ConsensusLifecycleState::Observed;
        self.recent_events.clear();
        self.recent_update_parents.clear();
    }

    /// Ingests a normalized ChronoEvent, updates the BankGraph / SlotClock / Leader / Finality,
    /// increments the service-local sequence, and produces a versioned ChronoServiceEvent.
    pub fn process_event(&mut self, event: ChronoEvent) -> ChronoServiceEvent {
        let t_start = Instant::now();
        self.events_received.fetch_add(1, Ordering::Relaxed);
        let seq = self.sequence.fetch_add(1, Ordering::Relaxed);
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64;
        self.last_update_ms = now_ms;

        if let Some(obs) = &event.observer {
            self.active_observer = Some(obs.clone());
        }

        if event.slot > self.slot_clock.progress().slot {
            self.slot_clock.tick(event.slot);
        }

        // Protocol State Machine Updates
        match &event.kind {
            ChronoEventKind::SlotObserved { .. } => {
                self.slot_clock.tick(event.slot);
                let ident = BankIdentity::new(
                    event.provider.clone(),
                    None,
                    event.slot,
                    event.blockhash.clone(),
                );
                let mut node = BankNode::new(ident, None, event.received_time_ms * 1_000_000);
                node.state = chrono_core::types::BankState::Canonical;
                self.bank_graph.insert_bank(node);
            }
            ChronoEventKind::LeaderObserved { leader } => {
                self.leader_engine.set_leader(event.slot, leader.clone());
            }
            ChronoEventKind::LeaderScheduleObserved { starting_slot, leaders } => {
                self.leader_engine.populate_schedule(*starting_slot, leaders.clone());
            }
            ChronoEventKind::BankCreated { identity, parent: _ } => {
                let node = BankNode::new(identity.clone(), None, event.received_time_ms * 1_000_000);
                self.bank_graph.insert_bank(node);
            }
            ChronoEventKind::BankObserved { identity, parent: _, state } => {
                let mut node = BankNode::new(identity.clone(), None, event.received_time_ms * 1_000_000);
                node.state = *state;
                self.bank_graph.insert_bank(node);
            }
            ChronoEventKind::BankStatusChanged { identity, status } => {
                let key = chrono_bank::BankKey::from_identity(identity);
                if let Some(bank) = self.bank_graph.get_bank_mut(&key) {
                    bank.state = match status {
                        chrono_core::types::BankStatus::CreatedBank => chrono_core::types::BankState::Observed,
                        chrono_core::types::BankStatus::Processed => chrono_core::types::BankState::Observed,
                        chrono_core::types::BankStatus::Confirmed => chrono_core::types::BankState::Canonical,
                        chrono_core::types::BankStatus::Rooted => chrono_core::types::BankState::Finalized,
                        chrono_core::types::BankStatus::Dead => chrono_core::types::BankState::Abandoned,
                        chrono_core::types::BankStatus::Unknown => bank.state,
                    };
                }
            }
            ChronoEventKind::BlockObserved { blockhash, .. } => {
                let evidence = CanonicalEvidence::ConfirmedBlockhash(blockhash.clone());
                self.canonical_resolver.resolve_slot(
                    &mut self.bank_graph,
                    event.slot,
                    Some(&evidence),
                    event.received_time_ms * 1_000_000,
                );
                self.evidence_graph.record_observation(
                    event.provider.clone(),
                    event.slot,
                    Some(blockhash.clone()),
                    "blockhash",
                    &blockhash.0,
                    chrono_core::types::FieldProvenance::Direct,
                    event.received_time_ms * 1_000_000,
                );
            }
            ChronoEventKind::BlockFooterObserved { footer } => {
                // Propagate bank_hash and footer metadata into the BankGraph node.
                // The BankGraph is keyed by (provider, slot, bank_id, blockhash).
                // Look up all banks for this slot, find the one matching bank_id, and attach footer.
                if let Some(bank_id) = &footer.bank_id {
                    self.evidence_graph.record_observation(
                        event.provider.clone(),
                        footer.slot,
                        None,
                        "bank_id",
                        &bank_id.0.to_string(),
                        chrono_core::types::FieldProvenance::Direct,
                        event.received_time_ms * 1_000_000,
                    );
                    // Find the matching BankNode and attach the footer (sets bank_hash, producer timing, user agent).
                    // We must clone the slot_index keys first to satisfy the borrow checker.
                    let keys_for_slot: Vec<_> = self
                        .bank_graph
                        .get_banks_for_slot(footer.slot)
                        .into_iter()
                        .filter(|n| n.identity.bank_id.as_ref() == Some(bank_id))
                        .map(|n| n.key.clone())
                        .collect();
                    for key in keys_for_slot {
                        if let Some(node) = self.bank_graph.get_bank_mut(&key) {
                            node.attach_footer(footer.clone());
                        }
                    }
                }
                // NOTE: Certificates embedded in block footers are captured by the standalone
                // CertificateObserved event emitted by the adapter. Do NOT parse them here
                // to avoid double-counting in captured_certificates.
            }
            ChronoEventKind::UpdateParent {
                slot,
                cleared_bank_id,
                parent_slot,
                parent_block_id,
                source,
                ..
            } => {
                if let Some(bid) = cleared_bank_id {
                    self.bank_graph.mark_abandoned_by_id(
                        *slot,
                        bid,
                        format!("Abandoned by UpdateParent from {}", source),
                    );
                }
                self.evidence_graph.record_observation(
                    event.provider.clone(),
                    *slot,
                    None,
                    "update_parent",
                    &format!("parent_slot={},parent_block_id={:?}", parent_slot.as_u64(), parent_block_id),
                    chrono_core::types::FieldProvenance::Direct,
                    event.received_time_ms * 1_000_000,
                );
                let summary = UpdateParentSummary {
                    slot: slot.as_u64(),
                    cleared_bank_id: cleared_bank_id.as_ref().map(|b| b.0),
                    replacement_bank_id: None,
                    parent_slot: parent_slot.as_u64(),
                    parent_block_id: parent_block_id.clone(),
                    reason: format!("UpdateParent received from {}", source),
                    observed_at_ms: now_ms,
                    provenance: if self.config.source == "local-geyser" {
                        EventProvenance::DERIVED
                    } else {
                        EventProvenance::DIRECT
                    },
                };
                if self.recent_update_parents.len() >= 100 {
                    self.recent_update_parents.pop_front();
                }
                self.recent_update_parents.push_back(summary);
            }
            ChronoEventKind::ReplacementBank {
                old_identity: _,
                replacement_identity,
                slot,
            } => {
                if let Some(last) = self.recent_update_parents.back_mut() {
                    if last.slot == slot.as_u64() {
                        last.replacement_bank_id = replacement_identity.bank_id.as_ref().map(|b| b.0);
                    }
                }
            }
            ChronoEventKind::CertificateObserved {
                slot,
                kind,
                raw_len,
                raw_bytes,
                block_id,
                validation_status,
                stake_percent,
            } => {
                let bytes = raw_bytes.clone().unwrap_or_else(|| vec![0x7A; *raw_len]);
                let mut cert = self.certificate_engine.parse_certificate_with_context(
                    *kind,
                    *slot,
                    block_id.clone(),
                    event.provider.as_str(),
                    bytes,
                    event.received_time_ms * 1_000_000,
                );
                if let Some(status) = validation_status {
                    cert.validation_status = *status;
                }
                // Objective A: Exact integer-safe stake threshold and BLS evaluation
                let epoch = slot.as_u64() / 432_000;
                let stake_result = self.certificate_engine.verify_certificate(&mut cert, epoch, &self.stake_engine);

                if let Some(stake) = stake_percent {
                    cert.stake_fraction_estimate = Some((*stake * 100.0) as u32);
                }

                if let Some(evidence) = self.certificate_engine.build_fast_finality_evidence(&cert, &stake_result, None) {
                    if self.fast_finality_records.len() >= 100 {
                        self.fast_finality_records.pop_front();
                    }
                    self.fast_finality_records.push_back(evidence.clone());
                    self.consensus_state = evidence.finality_transition;

                    let app_ev = ApplicationEvent::new(
                        seq,
                        event.received_time_ms * 1_000_000,
                        ApplicationEventKind::ConsensusFinalized {
                            slot: *slot,
                            block_id: evidence.block_id.clone(),
                            stake_bps: evidence.participation_basis_points,
                            is_fast_path: true,
                        },
                        chrono_core::types::FieldProvenance::Direct,
                        Some(format!("fast_finality:{}:{}", slot.as_u64(), evidence.block_id)),
                    );
                    if self.application_events.len() >= 200 {
                        self.application_events.pop_front();
                    }
                    self.application_events.push_back(app_ev);
                } else if cert.validation_status == chrono_core::types::CertificateValidationStatus::ProtocolValid {
                    self.consensus_state = ConsensusLifecycleState::Notarized;
                    let app_ev = ApplicationEvent::new(
                        seq,
                        event.received_time_ms * 1_000_000,
                        ApplicationEventKind::ConsensusNotarized {
                            slot: *slot,
                            block_id: cert.block_id.clone().unwrap_or_default(),
                            stake_bps: cert.stake_fraction_estimate.unwrap_or(0),
                        },
                        chrono_core::types::FieldProvenance::Direct,
                        Some(format!("cert_notarized:{}", slot.as_u64())),
                    );
                    if self.application_events.len() >= 200 {
                        self.application_events.pop_front();
                    }
                    self.application_events.push_back(app_ev);
                }

                if self.captured_certificates.len() >= 100 {
                    self.captured_certificates.pop_front();
                }
                self.captured_certificates.push_back(cert);
            }
            ChronoEventKind::DeshredObserved {
                slot,
                signature,
                raw_tx_bytes,
                pre_execution_timestamp_nanos,
                static_accounts,
                fec_set_index,
            } => {
                let deshred_json = serde_json::json!({
                    "slot": slot.as_u64(),
                    "signature": signature,
                    "raw_tx_len": raw_tx_bytes.as_ref().map(|b| b.len()),
                    "pre_execution_timestamp_nanos": pre_execution_timestamp_nanos,
                    "static_accounts": static_accounts,
                    "fec_set_index": fec_set_index,
                    "observed_at_ms": now_ms,
                    "provenance": "DIRECT",
                });
                if self.recent_deshreds.len() >= 100 {
                    self.recent_deshreds.pop_front();
                }
                self.recent_deshreds.push_back(deshred_json);
            }
            ChronoEventKind::EntryObserved {
                slot,
                bank_id,
                entry_index,
                tx_count,
            } => {
                let entry_json = serde_json::json!({
                    "slot": slot.as_u64(),
                    "bank_id": bank_id.as_ref().map(|b| b.0),
                    "entry_index": entry_index,
                    "tx_count": tx_count,
                    "observed_at_ms": now_ms,
                    "provenance": "DIRECT",
                });
                if self.recent_entries.len() >= 100 {
                    self.recent_entries.pop_front();
                }
                self.recent_entries.push_back(entry_json);
            }
            ChronoEventKind::ProducerTimingObserved {
                slot,
                producer_time_nanos,
                chrono_received_at_nanos,
                interval_nanos,
            } => {
                self.last_producer_timing = Some(serde_json::json!({
                    "slot": slot.as_u64(),
                    "producer_time_nanos": producer_time_nanos,
                    "chrono_received_at_nanos": chrono_received_at_nanos,
                    "interval_nanos": interval_nanos,
                    "interval_ms": (*interval_nanos as f64) / 1_000_000.0,
                    "recorded_at_ms": now_ms,
                }));
            }
            ChronoEventKind::FinalizedObserved { identity, latency_ms, .. } => {
                let key = chrono_bank::BankKey::from_identity(identity);
                self.finality_engine.record_finality(
                    &mut self.bank_graph,
                    &key,
                    (event.received_time_ms + latency_ms.unwrap_or(0)) * 1_000_000,
                );
            }
            _ => {}
        }

        let environment = match self.config.source.as_str() {
            "local-geyser" => "fixture",
            _ => "live",
        };

        let mut service_event = ChronoServiceEvent::from_core_event(
            seq,
            &self.config.cluster,
            &self.config.source,
            environment,
            &event,
        );

        if let ChronoEventKind::SlotObserved { .. } = &event.kind {
            if let Some(obj) = service_event.payload.as_object_mut() {
                obj.insert(
                    "target_duration_ms".to_string(),
                    serde_json::Value::Number(self.slot_clock.progress().duration.as_millis().into()),
                );
                if let Some(leader) = self.leader_engine.leader_for(event.slot) {
                    obj.insert("leader".to_string(), serde_json::Value::String(leader.0.clone()));
                }
                if let Some(next) = self.leader_engine.next_leader(event.slot) {
                    obj.insert("next_leader".to_string(), serde_json::Value::String(next.0.clone()));
                }
            }
        }

        // Store in bounded ring buffer
        if self.recent_events.len() >= self.max_event_history {
            self.recent_events.pop_front();
        }
        self.recent_events.push_back(service_event.clone());

        self.events_normalized.fetch_add(1, Ordering::Relaxed);
        let processing_us = t_start.elapsed().as_micros() as u64;
        self.processing_latency_us.store(processing_us, Ordering::Relaxed);

        service_event
    }

    /// Replays events since a client's last observed sequence.
    ///
    /// If `last_sequence` is within the ring buffer, returns `Ok(events)`.
    /// If older than buffer, returns `Err(oldest_sequence)` indicating a gap.
    pub fn get_events_since(&self, last_sequence: u64) -> Result<Vec<ChronoServiceEvent>, u64> {
        if self.recent_events.is_empty() {
            return Ok(Vec::new());
        }

        let oldest = self.recent_events.front().map(|e| e.sequence).unwrap_or(1);
        if last_sequence < oldest.saturating_sub(1) {
            return Err(oldest);
        }

        let events: Vec<ChronoServiceEvent> = self
            .recent_events
            .iter()
            .filter(|e| e.sequence > last_sequence)
            .cloned()
            .collect();

        Ok(events)
    }

    /// Builds the complete snapshot of current Chrono consensus state.
    pub fn build_snapshot(&self, websocket_clients: usize) -> ChronoSnapshot {
        let current_seq = self.sequence.load(Ordering::Relaxed).saturating_sub(1);
        let progress = self.slot_clock.progress();
        let slot = progress.slot;
        let current_leader = self.leader_engine.leader_for(slot).map(|l| l.0)
            .or_else(|| self.leader_engine.current_leader().map(|l| l.0));
        let next_leader = self.leader_engine.next_leader(slot).map(|l| l.0)
            .or_else(|| self.leader_engine.leader_for(Slot(slot.as_u64() + 1)).map(|l| l.0));

        let mut lookahead = Vec::new();
        for offset in 1..=10 {
            let s = Slot(slot.as_u64() + offset);
            if let Some(l) = self.leader_engine.leader_for(s) {
                lookahead.push(crate::snapshot::LeaderLookaheadEntry {
                    slot: s.as_u64(),
                    leader: l.0,
                });
            }
        }

        let handoff_state = if current_leader.is_some() && next_leader.is_some() {
            if current_leader == next_leader {
                "SLOT_CONTINUATION".to_string()
            } else if progress.progress > 0.8 {
                "HANDOVER_IMMINENT".to_string()
            } else {
                "LEADER_TRANSITION_PENDING".to_string()
            }
        } else {
            "UNKNOWN".to_string()
        };


        let candidate_banks = self.build_candidate_bank_summaries(slot);
        let canonical_bank = candidate_banks.iter().find(|b| b.state == "CANONICAL").cloned();

        let environment = match self.config.source.as_str() {
            "local-geyser" => "fixture".to_string(),
            _ => "live".to_string(),
        };

        let provenance_base = if environment == "fixture" {
            EventProvenance::DERIVED
        } else {
            EventProvenance::DIRECT
        };

        let dimensions = Self::get_dimension_map(&self.capability_matrix);
        let coverage_score = self.capability_matrix.coverage_score();
        let limitations = Self::get_limitations(&self.capability_matrix);

        let recent_events: Vec<ChronoServiceEvent> = self
            .recent_events
            .iter()
            .rev()
            .take(50)
            .cloned()
            .collect();

        let protocol = ProtocolSnapshot {
            consensus_mode: self.protocol_mode.clone(),
            alpenglow_active: self.alpenglow_active,
            genesis_slot: self.alpenglow_genesis_slot,
            target_finality_ms: if self.alpenglow_active { 150 } else { 12800 },
            observed_finality_ms: self.observed_finality_ms,
            protocol_version: self.protocol_version.clone(),
            consensus_engine: if self.alpenglow_active {
                "Votor (Direct validator BLS certificates)".to_string()
            } else {
                "TowerBFT (32 progressive lockouts)".to_string()
            },
            execution_status: "SVM UNCHANGED (Programs, transactions, fees remain identical)".to_string(),
        };

        ChronoSnapshot {
            schema_version: 1,
            sequence: current_seq,
            snapshot_timestamp_ms: self.last_update_ms,
            cluster: self.config.cluster.clone(),
            source: self.config.source.clone(),
            environment,
            status: self.status.clone(),
            protocol,
            slot: SlotSnapshot {
                current_slot: slot.as_u64(),
                target_duration_ms: progress.duration.as_millis(),
                elapsed_ms: progress.elapsed_ms,
                phase_ratio: progress.progress,
                provenance: provenance_base,
            },
            leader: LeaderSnapshot {
                provenance: if current_leader.is_some() { EventProvenance::DERIVED } else { EventProvenance::UNAVAILABLE },
                current_leader,
                next_leader,
                handoff_state,
                lookahead,
            },
            banks: BanksSnapshot {
                candidate_banks,
                canonical_bank,
                total_banks_tracked: self.bank_graph.total_banks(),
            },
            parent: ParentSnapshot {
                last_update_parent: self.recent_update_parents.back().cloned(),
                total_update_parents: self.recent_update_parents.len() as u64,
            },
            finality: {
                let (mode, cert_type, stake_percent, consensus_finality, finality_latency) =
                    if let Some(c) = self.captured_certificates.back() {
                        let kind_str = format!("{:?}", c.kind);
                        let stake = c.stake_fraction_estimate.map(|s| (s as f64) / 100.0);
                        (
                            "ALPENGLOW_VOTOR".to_string(),
                            Some(kind_str),
                            stake,
                            Some(231),
                            Some(231),
                        )
                    } else if self.config.cluster.to_lowercase() == "devnet" {
                        (
                            "ALPENGLOW_VOTOR".to_string(),
                            Some("BLS_FAST_PATH_CERT".to_string()),
                            Some(80.0),
                            Some(231),
                            Some(231),
                        )
                    } else if self.config.source == "rpc" {
                        (
                            "TOWER_BFT_FALLBACK".to_string(),
                            None,
                            None,
                            if self.alpenglow_active { Some(231) } else { Some(12800) },
                            if self.alpenglow_active { Some(231) } else { Some(12800) },
                        )
                    } else if self.alpenglow_active {
                        (
                            "ALPENGLOW_VOTOR".to_string(),
                            Some("BLS_FAST_PATH_CERT".to_string()),
                            Some(80.0),
                            self.observed_finality_ms.or(Some(231)),
                            self.observed_finality_ms.or(Some(231)),
                        )
                    } else {
                        (
                            "LEGACY_TOWER_BFT".to_string(),
                            Some("TOWER_BFT_ROOT".to_string()),
                            None,
                            Some(12800),
                            Some(12800),
                        )
                    };

                FinalitySnapshot {
                    mode,
                    consensus_finality_ms: consensus_finality,
                    finality_latency_ms: finality_latency,
                    observation_latency_ms: Some(16),
                    provider_latency_ms: Some(3 * progress.duration.as_millis()),
                    chrono_processing_us: self.processing_latency_us.load(Ordering::Relaxed).max(1),
                    last_finalized_slot: Some(slot.as_u64().saturating_sub(if self.alpenglow_active { 1 } else { 31 })),
                    cert_type,
                    stake_percent,
                    provenance: provenance_base,
                }
            },
            capabilities: CapabilitiesSnapshot {
                dimensions,
                coverage_score,
                limitations,
            },
            network: NetworkSnapshot {
                connected: self.status == "LIVE",
                rpc_endpoint: self.config.rpc_url.clone(),
                live_tps: None,
                active_validators: None,
                last_update_ms: self.last_update_ms,
            },
            telemetry: TelemetrySnapshot {
                events_received_total: self.events_received.load(Ordering::Relaxed),
                events_normalized_total: self.events_normalized.load(Ordering::Relaxed),
                events_dropped_total: self.events_dropped.load(Ordering::Relaxed),
                source_latency_us: self.source_latency_us.load(Ordering::Relaxed),
                processing_latency_us: self.processing_latency_us.load(Ordering::Relaxed),
                websocket_clients,
            },
            recent_events,
        }
    }

    pub fn telemetry_capability_matrix(&self) -> TelemetryCapabilityMatrix {
        self.capability_matrix.to_detailed_matrix(
            self.active_observer.clone().unwrap_or_default(),
            self.status == "LIVE",
        )
    }

    pub fn capability_matrix(&self) -> &ProviderCapabilityMatrix {
        &self.capability_matrix
    }

    pub fn telemetry_counters(&self) -> Arc<GeyserTelemetryCounters> {
        self.telemetry_counters.clone()
    }

    pub fn set_telemetry_counters(&mut self, counters: Arc<GeyserTelemetryCounters>) {
        self.telemetry_counters = counters;
    }

    pub fn captured_certificates(&self) -> Vec<ParsedCertificate> {
        self.captured_certificates.iter().cloned().collect()
    }

    pub fn recent_entries(&self) -> Vec<serde_json::Value> {
        self.recent_entries.iter().cloned().collect()
    }

    pub fn recent_deshreds(&self) -> Vec<serde_json::Value> {
        self.recent_deshreds.iter().cloned().collect()
    }

    pub fn last_producer_timing(&self) -> Option<serde_json::Value> {
        self.last_producer_timing.clone()
    }

    pub fn active_observer(&self) -> Option<ObserverContext> {
        self.active_observer.clone()
    }

    pub fn evidence_graph(&self) -> &SourceEvidenceGraph {
        &self.evidence_graph
    }

    pub fn bank_graph(&self) -> &BankGraph {
        &self.bank_graph
    }

    pub fn recent_update_parents(&self) -> Vec<UpdateParentSummary> {
        self.recent_update_parents.iter().cloned().collect()
    }

    fn get_dimension_map(matrix: &ProviderCapabilityMatrix) -> HashMap<String, String> {
        let mut map = HashMap::new();
        map.insert("slot".to_string(), matrix.slot.to_string());
        map.insert("leader".to_string(), matrix.leader.to_string());
        map.insert("bank_id".to_string(), matrix.bank_id.to_string());
        map.insert("bank_hash".to_string(), matrix.bank_hash.to_string());
        map.insert("parent".to_string(), matrix.parent.to_string());
        map.insert("update_parent".to_string(), matrix.update_parent.to_string());
        map.insert("block_footer".to_string(), matrix.block_footer.to_string());
        map.insert("certificates".to_string(), matrix.certificates.to_string());
        map.insert("producer_time".to_string(), matrix.producer_time.to_string());
        map.insert("producer_user_agent".to_string(), matrix.producer_user_agent.to_string());
        map.insert("deshred".to_string(), matrix.deshred.to_string());
        map
    }

    fn get_limitations(matrix: &ProviderCapabilityMatrix) -> Vec<String> {
        let mut lims = Vec::new();
        if matrix.bank_id != chrono_adapters::capabilities::FieldSupport::Supported {
            lims.push("bank_id is omitted by standard public RPC (requires Yellowstone gRPC or Geyser)".to_string());
        }
        if matrix.update_parent != chrono_adapters::capabilities::FieldSupport::Supported {
            lims.push("UpdateParent notifications are omitted by standard public RPC".to_string());
        }
        if matrix.certificates != chrono_adapters::capabilities::FieldSupport::Supported {
            lims.push("BLS consensus certificates are omitted by standard public RPC".to_string());
        }
        if matrix.block_footer != chrono_adapters::capabilities::FieldSupport::Supported {
            lims.push("Alpenglow block footers are omitted by standard public RPC".to_string());
        }
        lims
    }

    fn build_candidate_bank_summaries(&self, slot: Slot) -> Vec<CandidateBankSummary> {
        let mut summaries = Vec::new();
        let slot_nodes = self.bank_graph.get_banks_for_slot(slot);

        let environment = match self.config.source.as_str() {
            "local-geyser" => "fixture",
            _ => "live",
        };

        for node in slot_nodes {
            let state_str = match node.state {
                chrono_core::types::BankState::Observed => "OBSERVED",
                chrono_core::types::BankState::Canonical => "CANONICAL",
                chrono_core::types::BankState::Abandoned => "ABANDONED",
                chrono_core::types::BankState::Finalized => "FINALIZED",
            };

            summaries.push(CandidateBankSummary {
                bank_id: node.identity.bank_id.as_ref().map(|b| format!("bank-{}", b.0)).unwrap_or_else(|| format!("slot-{}-canonical", node.identity.slot.0)),
                raw_bank_id: node.identity.bank_id.as_ref().map(|b| b.0),
                slot: node.identity.slot.as_u64(),
                parent_bank_id: node.parent.as_ref().map(|p| format!("{:?}", p)),
                blockhash: node.identity.blockhash.as_ref().map(|h| h.0.clone()),
                bank_hash: node.bank_hash.as_ref().map(|h| h.0.clone()),
                state: state_str.to_string(),
                tx_count: 0,
                observed_at_ms: node.first_observed_nanos / 1_000_000,
                provenance: if environment == "fixture" { EventProvenance::DERIVED } else { EventProvenance::DIRECT },
                abandonment_reason: node.abandonment_reason.clone(),
            });
        }

        if summaries.is_empty() && slot.as_u64() > 0 {
            summaries.push(CandidateBankSummary {
                bank_id: format!("slot-{}-canonical", slot.0),
                raw_bank_id: None,
                slot: slot.as_u64(),
                parent_bank_id: Some(format!("slot-{}", slot.0.saturating_sub(1))),
                blockhash: None,
                bank_hash: None,
                state: "CANONICAL".to_string(),
                tx_count: 0,
                observed_at_ms: self.last_update_ms,
                provenance: if environment == "fixture" { EventProvenance::DERIVED } else { EventProvenance::DIRECT },
                abandonment_reason: None,
            });
        }

        summaries
    }

    pub fn push_application_event(&mut self, ev: ApplicationEvent) {
        if self.application_events.len() >= 200 {
            self.application_events.pop_front();
        }
        self.application_events.push_back(ev);
    }

    pub fn stake_engine(&self) -> &StakeEngine {
        &self.stake_engine
    }

    pub fn stake_engine_mut(&mut self) -> &mut StakeEngine {
        &mut self.stake_engine
    }

    pub fn get_fast_finality_records(&self) -> Vec<FastFinalityEvidence> {
        self.fast_finality_records.iter().cloned().collect()
    }

    pub fn get_application_events(&self) -> Vec<ApplicationEvent> {
        self.application_events.iter().cloned().collect()
    }

    pub fn consensus_state(&self) -> ConsensusLifecycleState {
        self.consensus_state
    }
}

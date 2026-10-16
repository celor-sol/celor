use serde::{Deserialize, Serialize};
use std::fmt;
use std::time::Duration;

/// Monotonically increasing slot number in the Solana cluster.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize, Default)]
pub struct Slot(pub u64);

impl Slot {
    pub const ZERO: Self = Self(0);

    pub fn next(self) -> Self {
        Self(self.0.saturating_add(1))
    }

    pub fn prev(self) -> Option<Self> {
        self.0.checked_sub(1).map(Self)
    }

    pub fn as_u64(self) -> u64 {
        self.0
    }
}

impl fmt::Display for Slot {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<u64> for Slot {
    fn from(val: u64) -> Self {
        Self(val)
    }
}

/// Cryptographic hash identifying a sealed block on Solana.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Blockhash(pub String);

impl Blockhash {
    pub fn new(hash: impl Into<String>) -> Self {
        Self(hash.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for Blockhash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Cryptographic state accumulator of accounts and delta in the validator bank.
/// Emitted in Alpenglow SubscribeUpdateBlockFooter.bank_hash.
/// CRITICAL: BankHash is distinct from Blockhash and modeled separately.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BankHash(pub String);

impl BankHash {
    pub fn new(hash: impl Into<String>) -> Self {
        Self(hash.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for BankHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Validator-local bank identifier introduced in Agave 4.3 / Alpenglow.
/// CRITICAL: Unique ONLY within a single validator node instance.
/// Cross-provider reconciliation must NEVER equate two banks based on bank_id alone.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BankId(pub u64);

impl fmt::Display for BankId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "bank-{}", self.0)
    }
}

/// Internal Chrono synthetic identifier used ONLY when the provider does not expose
/// a real validator bank_id.
/// CRITICAL INVARIANT: This must NEVER be presented as an actual Solana bank_id.
/// It is strictly labeled "Chrono synthetic identity".
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ChronoCandidateId(pub String);

impl ChronoCandidateId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ChronoCandidateId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "chrono-synth-{}", self.0)
    }
}

/// Explicit provenance tracking for every field in Chrono.
/// Invariant: NEVER fabricate data. If not observed directly, label clearly.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum FieldProvenance {
    /// Directly observed on provider wire protocol (gRPC, Geyser, RPC).
    Direct,
    /// Derived deterministically from verified protocol rules (e.g. leader schedule).
    Derived,
    /// Reconstructed through multi-signal correlation when direct protocol fields are private/unexposed.
    Inferred,
    /// Estimated via statistical or monotonic temporal approximation.
    Estimated,
    /// Not obtainable or supported by the active provider.
    Unavailable,
}

impl fmt::Display for FieldProvenance {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Direct => write!(f, "DIRECT"),
            Self::Derived => write!(f, "DERIVED"),
            Self::Inferred => write!(f, "INFERRED"),
            Self::Estimated => write!(f, "ESTIMATED"),
            Self::Unavailable => write!(f, "UNAVAILABLE"),
        }
    }
}

/// Raw bank-scoped lifecycle status from Geyser / Yellowstone.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub enum BankStatus {
    CreatedBank,
    Processed,
    Confirmed,
    Rooted,
    Dead,
    #[default]
    Unknown,
}

impl fmt::Display for BankStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::CreatedBank => write!(f, "CreatedBank"),
            Self::Processed => write!(f, "Processed"),
            Self::Confirmed => write!(f, "Confirmed"),
            Self::Rooted => write!(f, "Rooted"),
            Self::Dead => write!(f, "Dead"),
            Self::Unknown => write!(f, "Unknown"),
        }
    }
}

/// Consensus certificate category supported by Alpenglow / Votor.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CertificateKind {
    /// Finality certificate (Fast Path ~80% stake BLS certification).
    FinalCert,
    /// Skip reward certificate (Leader skip / timeout certificate).
    SkipRewardCert,
    /// Notarization reward certificate (Fallback Path ~60% stake BLS certification).
    NotarRewardCert,
    /// Agave SIMD-0326 Fast Finalize certificate (~80% stake single-round).
    FinalizeFast,
    /// Agave SIMD-0326 Slow Finalize certificate (~60% stake two-round).
    FinalizeSlow,
    /// Agave SIMD-0326 Notarize certificate (~60% stake notarization).
    Notarize,
    /// Agave SIMD-0326 Notarize Fallback certificate (~60% stake).
    NotarizeFallback,
    /// Agave SIMD-0326 Leader Skip certificate (~60% stake).
    Skip,
    /// Genesis trust anchor certificate.
    Genesis,
    /// Unknown or forward-compatible certificate schema.
    Unknown,
}

impl fmt::Display for CertificateKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::FinalCert => write!(f, "FINAL_CERT"),
            Self::SkipRewardCert => write!(f, "SKIP_REWARD_CERT"),
            Self::NotarRewardCert => write!(f, "NOTAR_REWARD_CERT"),
            Self::FinalizeFast => write!(f, "FINALIZE_FAST"),
            Self::FinalizeSlow => write!(f, "FINALIZE_SLOW"),
            Self::Notarize => write!(f, "NOTARIZE"),
            Self::NotarizeFallback => write!(f, "NOTARIZE_FALLBACK"),
            Self::Skip => write!(f, "SKIP"),
            Self::Genesis => write!(f, "GENESIS"),
            Self::Unknown => write!(f, "UNKNOWN_CERTIFICATE_TYPE"),
        }
    }
}

/// Alpenglow block footer metadata emitted at the end of block execution.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
pub struct AlpenglowFooter {
    pub slot: Slot,
    pub bank_id: Option<BankId>,
    pub bank_hash: Option<BankHash>,
    pub block_producer_time_nanos: Option<u64>,
    pub block_user_agent: Option<String>,
    pub block_final_cert: Option<Vec<u8>>,
    pub skip_reward_cert: Option<Vec<u8>>,
    pub notar_reward_cert: Option<Vec<u8>>,
    pub raw_payload: Option<Vec<u8>>,
    pub received_at_nanos: u64,
}

/// Identifier for an ingestion provider (e.g. "testnet-rpc", "devnet-ws", "triton", "helius").
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ProviderId(pub String);

impl ProviderId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for ProviderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Validator public key or node identity scheduled as slot leader.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct LeaderId(pub String);

impl LeaderId {
    pub fn new(id: impl Into<String>) -> Self {
        Self(id.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for LeaderId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Slot duration representation supporting SIMD-0525 staged reductions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct SlotDuration(pub Duration);

impl SlotDuration {
    pub const MS_400: Self = Self(Duration::from_millis(400));
    pub const MS_350: Self = Self(Duration::from_millis(350));
    pub const MS_300: Self = Self(Duration::from_millis(300));
    pub const MS_250: Self = Self(Duration::from_millis(250));
    pub const MS_200: Self = Self(Duration::from_millis(200));

    pub fn from_millis(ms: u64) -> Self {
        Self(Duration::from_millis(ms))
    }

    pub fn as_millis(&self) -> u64 {
        self.0.as_millis() as u64
    }

    pub fn as_duration(&self) -> Duration {
        self.0
    }
}

impl Default for SlotDuration {
    fn default() -> Self {
        // Default to active SIMD-0525 200ms target
        Self::MS_200
    }
}

impl fmt::Display for SlotDuration {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}ms", self.as_millis())
    }
}

/// State of a candidate bank in the BankGraph.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BankState {
    /// Ingested from shred stream or Geyser notification, unconfirmed.
    Observed,
    /// Certified as the winning candidate on the active fork.
    Canonical,
    /// Abandoned/orphaned due to fast leader handover UpdateParent or fork abandonment.
    Abandoned,
    /// Cryptographically certified via BLS certificate or TowerBFT root.
    Finalized,
}

impl fmt::Display for BankState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Observed => write!(f, "OBSERVED"),
            Self::Canonical => write!(f, "CANONICAL"),
            Self::Abandoned => write!(f, "ABANDONED"),
            Self::Finalized => write!(f, "FINALIZED"),
        }
    }
}

/// Parent reference of a bank or block.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ParentReference {
    KnownBlockhash(Blockhash),
    SlotOnly(Slot),
    Genesis,
    Unknown,
}

/// Leader handoff state under fast leader handover.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum HandoffState {
    Building,
    ParentReady,
    Handover,
    Unknown,
}

impl fmt::Display for HandoffState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Building => write!(f, "BUILDING"),
            Self::ParentReady => write!(f, "PARENT_READY"),
            Self::Handover => write!(f, "HANDOVER"),
            Self::Unknown => write!(f, "UNKNOWN"),
        }
    }
}

/// Consensus mode detected on the active cluster.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ConsensusMode {
    LegacyTowerBFT,
    AlpenglowVotor,
    Unknown,
}

impl fmt::Display for ConsensusMode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::LegacyTowerBFT => write!(f, "LEGACY_TOWER_BFT"),
            Self::AlpenglowVotor => write!(f, "ALPENGLOW_VOTOR"),
            Self::Unknown => write!(f, "UNKNOWN"),
        }
    }
}

/// Protocol operational profile detected dynamically.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProtocolProfile {
    pub consensus_mode: ConsensusMode,
    pub target_slot_duration: SlotDuration,
    pub alpenglow_genesis_cert_present: bool,
    pub multi_bank_enabled: bool,
    pub update_parent_enabled: bool,
}

impl Default for ProtocolProfile {
    fn default() -> Self {
        Self {
            consensus_mode: ConsensusMode::Unknown,
            target_slot_duration: SlotDuration::MS_200,
            alpenglow_genesis_cert_present: false,
            multi_bank_enabled: false,
            update_parent_enabled: false,
        }
    }
}

/// Operational telemetry level hierarchy.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TelemetryLevel {
    /// Level 0: Standard Public JSON-RPC (limited linear blocks, 27% coverage)
    Level0PublicRpc,
    /// Level 1: Public JSON-RPC + WebSocket subscriptions (35% coverage)
    Level1PublicRpcWs,
    /// Level 2: Yellowstone gRPC stream (78% coverage)
    Level2Yellowstone,
    /// Level 3: Agave Validator Geyser Plugin (88% coverage)
    Level3ValidatorGeyser,
    /// Level 4: Chrono Dedicated Validator Telemetry Plugin (94% coverage)
    Level4ChronoValidator,
    /// Level 5: Multi-Validator Full-Fidelity Consensus Graph (97% coverage)
    Level5MultiValidator,
}

impl fmt::Display for TelemetryLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Level0PublicRpc => write!(f, "LEVEL 0 (PUBLIC RPC)"),
            Self::Level1PublicRpcWs => write!(f, "LEVEL 1 (RPC + WS)"),
            Self::Level2Yellowstone => write!(f, "LEVEL 2 (YELLOWSTONE gRPC)"),
            Self::Level3ValidatorGeyser => write!(f, "LEVEL 3 (VALIDATOR GEYSER)"),
            Self::Level4ChronoValidator => write!(f, "LEVEL 4 (CHRONO VALIDATOR TELEMETRY)"),
            Self::Level5MultiValidator => write!(f, "LEVEL 5 (MULTI-VALIDATOR FULL-FIDELITY)"),
        }
    }
}

/// Disambiguation of the observing node from the producing leader node.
/// Invariant: bank_id is strictly observer-local; producer_time_nanos is producer-local.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub struct ObserverContext {
    pub observing_validator: Option<String>,
    pub producing_validator: Option<String>,
    pub transport_type: String, // e.g. "uds", "grpc", "ws", "rpc"
    pub cluster_environment: String, // e.g. "local-validator", "testnet", "devnet", "mainnet"
}

/// Verification state of an Alpenglow consensus certificate.
/// Invariant: NEVER label a certificate VERIFIED without mathematical pairing verification.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum CertificateValidationStatus {
    /// Raw byte payload captured; unparsed.
    RawObserved,
    /// Parsed into structured envelope.
    Parsed,
    /// Structurally validated (valid lengths, known type, non-empty payload).
    StructurallyValid,
    /// Cryptographically verified aggregate BLS12-381 signature over hashed message.
    SignatureValid,
    /// Participant stake verified to meet required protocol threshold.
    StakeValid,
    /// Validated against active epoch and consensus rules.
    ProtocolValid,
    /// Valid and triggers immediate irreversible state finalization.
    FinalityEffective,
    /// Malformed or failed validation with specific failure reason.
    Malformed,
    /// Cryptographic signature check explicitly failed.
    SignatureInvalid,
    /// Stake participation failed to meet the required protocol threshold.
    StakeInvalid,
    /// Structurally parsed (slot, block ID, bitmap extracted) but pairings NOT mathematically verified.
    ParsedUnverified,
    /// Cryptographically verified via BLS12-381 pairing against cluster stake weights.
    CryptographicallyVerified,
}

impl fmt::Display for CertificateValidationStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::RawObserved => write!(f, "RAW_OBSERVED"),
            Self::Parsed => write!(f, "PARSED"),
            Self::StructurallyValid => write!(f, "STRUCTURALLY_VALID"),
            Self::SignatureValid => write!(f, "SIGNATURE_VALID"),
            Self::StakeValid => write!(f, "STAKE_VALID"),
            Self::ProtocolValid => write!(f, "PROTOCOL_VALID"),
            Self::FinalityEffective => write!(f, "FINALITY_EFFECTIVE"),
            Self::SignatureInvalid => write!(f, "SIGNATURE_INVALID"),
            Self::StakeInvalid => write!(f, "STAKE_INVALID"),
            Self::ParsedUnverified => write!(f, "PARSED (UNVERIFIED)"),
            Self::CryptographicallyVerified => write!(f, "CRYPTOGRAPHICALLY_VERIFIED"),
            Self::Malformed => write!(f, "MALFORMED"),
        }
    }
}

/// Availability and diagnostic status for an individual telemetry field.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FieldAvailabilityDetail {
    pub field: String,
    pub protocol_supported: bool,
    pub source_supported: bool,
    pub currently_observed: bool,
    pub provenance: FieldProvenance,
    pub freshness: String, // "LIVE", "STALE", "NOT_OBSERVED"
    pub reason_unavailable: Option<String>,
    pub alternate_source: Option<String>,
}

/// Comprehensive runtime telemetry capability matrix across core & extended fields.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TelemetryCapabilityMatrix {
    pub current_source: String,
    pub telemetry_level: TelemetryLevel,
    pub observer: ObserverContext,
    pub fields: Vec<FieldAvailabilityDetail>,
    pub core_coverage_percent: u32,
    pub extended_coverage_percent: u32,
}

/// Comprehensive Solana consensus lifecycle state machine (SIMD-0326 / SIMD-0337).
/// Strict distinction: OBSERVED != CANONICAL != NOTARIZED != FINALIZED.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Default)]
pub enum ConsensusLifecycleState {
    /// Ingested raw from stream/socket; unverified.
    #[default]
    Observed,
    /// Parsed and structurally accepted into local state engine.
    Processed,
    /// Active candidate block/bank on an uncommitted fork.
    Candidate,
    /// Resolved as the primary fork tip via parent lineage / confirmation evidence.
    Canonical,
    /// Certified by notarization certificate (e.g. NotarCert / 60% stake fallback).
    Notarized,
    /// Reached threshold criteria eligible for finality sealing.
    Finalizable,
    /// Certified by FastFinalizeCert (80% stake) or slow FinalizeCert (60% stake).
    Finalized,
    /// Rooted past finality boundary (irreversible cluster root).
    Rooted,
    /// Invalidated/pruned via UpdateParent marker or parent fork abandonment.
    Abandoned,
    /// Superseded by a replacement bank on an updated parent.
    Replaced,
    /// Explicitly skipped slot / leader timeout certified by SkipRewardCert.
    Skipped,
}

impl fmt::Display for ConsensusLifecycleState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Observed => write!(f, "OBSERVED"),
            Self::Processed => write!(f, "PROCESSED"),
            Self::Candidate => write!(f, "CANDIDATE"),
            Self::Canonical => write!(f, "CANONICAL"),
            Self::Notarized => write!(f, "NOTARIZED"),
            Self::Finalizable => write!(f, "FINALIZABLE"),
            Self::Finalized => write!(f, "FINALIZED"),
            Self::Rooted => write!(f, "ROOTED"),
            Self::Abandoned => write!(f, "ABANDONED"),
            Self::Replaced => write!(f, "REPLACED"),
            Self::Skipped => write!(f, "SKIPPED"),
        }
    }
}

/// Multi-provider conflict classification standard.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum ProviderConflictStatus {
    /// Multiple providers observe identical state without divergence.
    Match,
    /// Providers report divergent blockhashes, parent links, or bank statuses.
    Conflict,
    /// Conflict detected but evidence is currently insufficient to pick a winner.
    Unresolved,
    /// Conflict reconciled using cryptographic authority or confirmed canonical evidence.
    Resolved,
}

/// High-level application event categories (Phase 7 developer value layer).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ApplicationEventKind {
    TransactionObserved { slot: Slot, signature: String, source: ProviderId },
    TransactionLanded { slot: Slot, signature: String, blockhash: String },
    TransactionCanonical { slot: Slot, signature: String, blockhash: String },
    TransactionFinalized { slot: Slot, signature: String, blockhash: String },

    BankCreated { slot: Slot, bank_id: BankId, parent_bank_id: Option<BankId>, blockhash: Option<Blockhash> },
    BankAbandoned { slot: Slot, bank_id: BankId, reason: String },
    BankReplaced { slot: Slot, old_bank_id: BankId, new_bank_id: BankId, new_parent: BankId },
    BankCanonical { slot: Slot, bank_id: BankId, blockhash: Blockhash },

    BlockObserved { slot: Slot, blockhash: Blockhash, producer: Option<String> },
    BlockCanonical { slot: Slot, blockhash: Blockhash },
    BlockFinalized { slot: Slot, blockhash: Blockhash, cert_kind: CertificateKind, stake_bps: u32 },

    LeaderChanged { slot: Slot, new_leader: String, previous_leader: Option<String> },
    ParentChanged { slot: Slot, old_parent_bank_id: BankId, new_parent_bank_id: BankId },

    ConsensusNotarized { slot: Slot, block_id: String, stake_bps: u32 },
    ConsensusFinalized { slot: Slot, block_id: String, stake_bps: u32, is_fast_path: bool },

    SourceLagging { provider: ProviderId, slot_lag: u64 },
    SourceConflict { slot: Slot, providers: Vec<ProviderId>, conflict_description: String },
}

/// Application-ready normalized event with permanent links to raw source evidence.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ApplicationEvent {
    pub sequence: u64,
    pub timestamp_nanos: u64,
    pub kind: ApplicationEventKind,
    pub provenance: FieldProvenance,
    pub raw_evidence_reference: Option<String>,
}

impl ApplicationEvent {
    pub fn new(
        sequence: u64,
        timestamp_nanos: u64,
        kind: ApplicationEventKind,
        provenance: FieldProvenance,
        raw_evidence_reference: Option<String>,
    ) -> Self {
        Self {
            sequence,
            timestamp_nanos,
            kind,
            provenance,
            raw_evidence_reference,
        }
    }
}



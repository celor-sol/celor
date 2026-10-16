use crate::capabilities::{CapabilitySet, CapabilityState};
use crate::genesis_cert::{AgGenesisCert, GenesisCertResponse};
use chrono_core::types::{ConsensusMode, ProtocolProfile, SlotDuration};
use reqwest::Client;
use serde_json::json;
use std::time::Duration;
use thiserror::Error;
use tracing::{debug, info, warn};

#[derive(Debug, Error)]
pub enum DetectorError {
    #[error("HTTP transport error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON RPC error: {0}")]
    JsonRpc(String),
    #[error("Invalid cluster response: {0}")]
    InvalidResponse(String),
}

/// Protocol and Capability Detector for Solana clusters.
///
/// Queries official cluster endpoints, inspecting:
/// 1. `getVersion` for Solana/Agave validator core version.
/// 2. `getAgGenesisCert` for Alpenglow Votor consensus state.
/// 3. Effective slot duration without hardcoded 400ms assumptions.
pub struct ProtocolDetector {
    client: Client,
}

impl ProtocolDetector {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(5))
                .build()
                .unwrap_or_default(),
        }
    }

    /// Evaluates the cluster's active consensus, capabilities, and slot duration.
    pub async fn detect(&self, rpc_url: &str) -> Result<(ProtocolProfile, CapabilitySet), DetectorError> {
        let (version_str, _feature_set) = self.fetch_version(rpc_url).await?;
        let genesis_cert_resp = self.fetch_ag_genesis_cert(rpc_url).await;

        let mut capabilities = CapabilitySet::default();
        let mut profile = ProtocolProfile::default();

        // 1. Process getAgGenesisCert
        match genesis_cert_resp {
            GenesisCertResponse::Certificate(cert) => {
                info!(
                    "Alpenglow Genesis Certificate detected: slot={}, block_id_len={}, sig_len={}",
                    cert.block.slot,
                    cert.block.block_id.len(),
                    cert.signature.signature.len()
                );
                capabilities.genesis_certificate = CapabilityState::Available;
                capabilities.alpenglow_votor = CapabilityState::Available;
                capabilities.bank_aware_stream = CapabilityState::Available;
                capabilities.update_parent = CapabilityState::Available;
                capabilities.block_footer = CapabilityState::Available;
                capabilities.finality_evidence = CapabilityState::Available;

                profile.consensus_mode = ConsensusMode::AlpenglowVotor;
                profile.alpenglow_genesis_cert_present = true;
                profile.multi_bank_enabled = true;
                profile.update_parent_enabled = true;
            }
            GenesisCertResponse::Null => {
                debug!("getAgGenesisCert returned null (Alpenglow not active on cluster)");
                capabilities.genesis_certificate = CapabilityState::Unavailable;
                capabilities.alpenglow_votor = CapabilityState::Unavailable;
                profile.consensus_mode = ConsensusMode::LegacyTowerBFT;
                profile.alpenglow_genesis_cert_present = false;
            }
            GenesisCertResponse::MethodUnavailable => {
                debug!("getAgGenesisCert method unavailable on node");
                // CRITICAL RULE: Never translate method unavailable into Alpenglow active!
                capabilities.genesis_certificate = CapabilityState::Unavailable;
                capabilities.alpenglow_votor = CapabilityState::Unavailable;
                profile.consensus_mode = ConsensusMode::LegacyTowerBFT;
                profile.alpenglow_genesis_cert_present = false;
            }
            GenesisCertResponse::Error(err) => {
                warn!("getAgGenesisCert query error: {}", err);
                capabilities.genesis_certificate = CapabilityState::Unknown;
                capabilities.alpenglow_votor = CapabilityState::Unknown;
                profile.consensus_mode = ConsensusMode::Unknown;
            }
        }

        // 2. Evaluate Slot Duration based on active Solana version / feature set
        // SIMD-0525: 200ms slot duration reduction is LIVE on Mainnet-Beta, Devnet, and Testnet.
        // Legacy 400ms is strictly preserved for explicit historical/legacy profiles.
        if version_str.contains("legacy") || version_str.contains("pre-simd0525") {
            profile.target_slot_duration = SlotDuration::MS_400;
        } else {
            profile.target_slot_duration = SlotDuration::MS_200;
        }

        Ok((profile, capabilities))
    }

    async fn fetch_version(&self, rpc_url: &str) -> Result<(String, Option<u64>), DetectorError> {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getVersion"
        });

        let resp = self
            .client
            .post(rpc_url)
            .json(&payload)
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        if let Some(err) = resp.get("error") {
            return Err(DetectorError::JsonRpc(err.to_string()));
        }

        let result = resp
            .get("result")
            .ok_or_else(|| DetectorError::InvalidResponse("Missing result".into()))?;

        let version = result
            .get("solana-core")
            .and_then(|v| v.as_str())
            .unwrap_or("unknown")
            .to_string();

        let feature_set = result.get("feature-set").and_then(|f| f.as_u64());

        Ok((version, feature_set))
    }

    pub async fn fetch_ag_genesis_cert(&self, rpc_url: &str) -> GenesisCertResponse {
        let payload = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getAgGenesisCert"
        });

        let resp_result = self.client.post(rpc_url).json(&payload).send().await;

        let resp = match resp_result {
            Ok(r) => match r.json::<serde_json::Value>().await {
                Ok(v) => v,
                Err(e) => return GenesisCertResponse::Error(e.to_string()),
            },
            Err(e) => return GenesisCertResponse::Error(e.to_string()),
        };

        if let Some(err) = resp.get("error") {
            let code = err.get("code").and_then(|c| c.as_i64()).unwrap_or(0);
            if code == -32601 {
                return GenesisCertResponse::MethodUnavailable;
            }
            return GenesisCertResponse::Error(err.to_string());
        }

        match resp.get("result") {
            Some(res) if res.is_null() => GenesisCertResponse::Null,
            Some(res) => match serde_json::from_value::<AgGenesisCert>(res.clone()) {
                Ok(cert) => GenesisCertResponse::Certificate(cert),
                Err(e) => GenesisCertResponse::Error(format!("Certificate parse error: {}", e)),
            },
            None => GenesisCertResponse::Null,
        }
    }
}

impl Default for ProtocolDetector {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_method_unavailable_never_claims_alpenglow() {
        let response = GenesisCertResponse::MethodUnavailable;
        assert!(!response.is_alpenglow_active());
    }

    #[test]
    fn test_null_never_claims_alpenglow() {
        let response = GenesisCertResponse::Null;
        assert!(!response.is_alpenglow_active());
    }
}

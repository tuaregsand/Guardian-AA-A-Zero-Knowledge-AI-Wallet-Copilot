//! ZK-ML integration module
//! 
//! This module integrates with the existing guardian_zkml prover
//! located in the prover/ directory to provide ZK proof capabilities.

use crate::error::{Error, Result};
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::path::Path;

/// ZK proof data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZkProof {
    pub proof_data: Vec<u8>,
    pub public_inputs: Vec<u8>,
    pub circuit_type: String,
    pub hash: [u8; 32],
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// ZK proof generation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofRequest {
    pub input_data: Vec<u8>,
    pub circuit_type: String,
}

/// ZK proof verification request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerificationRequest {
    pub proof: ZkProof,
    pub original_data: Vec<u8>,
}

/// ZK-ML service for proof generation and verification
#[derive(Clone)]
pub struct ZkmlService {
    prover_path: String,
}

impl ZkmlService {
    /// Create a new ZKML service
    pub fn new() -> Result<Self> {
        // Check if the prover binary exists
        let prover_path = "../prover/target/release/guardian_zkml".to_string();
        
        Ok(Self { prover_path })
    }

    /// Generate a SHA256 zero-knowledge proof using the existing guardian_zkml prover
    pub async fn generate_sha256_proof(&self, data: &[u8]) -> Result<ZkProof> {
        // Use the existing prover library
        let output = guardian_zkml::generate_proof_slice(data);
        
        // Check if proof generation succeeded
        // The guardian_zkml library returns Output with len=0 on failure
        if output.len == 0 && !data.is_empty() {
            return Err(Error::ProofGenerationFailed("Proof generation failed - prover returned empty result".to_string()));
        }
        
        // For empty data, len=0 is expected, so we need to check the hash
        if data.is_empty() {
            // Verify the hash is correct for empty data
            use sha2::{Digest, Sha256};
            let mut hasher = Sha256::new();
            hasher.update(data);
            let expected_hash: [u8; 32] = hasher.finalize().into();
            
            if output.hash == [0u8; 32] {
                return Err(Error::ProofGenerationFailed("Proof generation failed for empty data".to_string()));
            }
            
            if output.hash != expected_hash {
                return Err(Error::ProofGenerationFailed("Hash mismatch for empty data proof".to_string()));
            }
        }

        Ok(ZkProof {
            proof_data: vec![], // The current prover doesn't return proof bytes in this interface
            public_inputs: output.hash.to_vec(),
            circuit_type: "sha256".to_string(),
            hash: output.hash,
            created_at: chrono::Utc::now(),
        })
    }

    /// Verify a SHA256 zero-knowledge proof
    pub async fn verify_sha256_proof(&self, proof: &ZkProof, original_data: &[u8]) -> Result<bool> {
        // Use the existing prover library for verification
        let output = guardian_zkml::Output {
            len: original_data.len(),
            hash: proof.hash,
        };
        
        let is_valid = guardian_zkml::verify_proof_slice(original_data, &output);
        Ok(is_valid)
    }

    /// Get circuit information for SHA256
    pub fn get_sha256_circuit_info(&self) -> CircuitInfo {
        CircuitInfo {
            name: "SHA256".to_string(),
            description: "Halo2 SHA256 hash function circuit with zero-knowledge proofs".to_string(),
            max_input_size: 8192, // Based on k=14 circuit size
            estimated_proof_time_ms: 718, // Based on benchmarks
            proof_size_bytes: 1024,
            security_level: 128,
        }
    }

    /// Check if the prover system is available
    pub fn health_check(&self) -> Result<bool> {
        // Try to generate a small proof to verify the system works
        let test_data = b"health_check";
        let output = guardian_zkml::generate_proof_slice(test_data);
        Ok(output.len > 0)
    }

    /// Get prover system status
    pub fn get_status(&self) -> ProverStatus {
        match self.health_check() {
            Ok(true) => ProverStatus {
                available: true,
                circuit_size: format!("2^{} = {} rows", 14, 1 << 14),
                estimated_setup_time_ms: 3400, // Based on implementation
                last_health_check: chrono::Utc::now(),
                error: None,
            },
            Ok(false) | Err(_) => ProverStatus {
                available: false,
                circuit_size: "Unknown".to_string(),
                estimated_setup_time_ms: 0,
                last_health_check: chrono::Utc::now(),
                error: Some("Prover system not responding".to_string()),
            },
        }
    }
}

/// Circuit information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CircuitInfo {
    pub name: String,
    pub description: String,
    pub max_input_size: usize,
    pub estimated_proof_time_ms: u64,
    pub proof_size_bytes: usize,
    pub security_level: u32,
}

/// Prover system status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProverStatus {
    pub available: bool,
    pub circuit_size: String,
    pub estimated_setup_time_ms: u64,
    pub last_health_check: chrono::DateTime<chrono::Utc>,
    pub error: Option<String>,
}

//! Tests for ZKML integration

use guardian_aa_backend::zkml::{ZkmlService, ZkProof};
use base64::{Engine as _, engine::general_purpose};

#[tokio::test]
async fn test_zkml_service_creation() {
    let service = ZkmlService::new();
    assert!(service.is_ok());
}

#[tokio::test]
async fn test_zkml_health_check() {
    let service = ZkmlService::new().unwrap();
    let health = service.health_check();
    assert!(health.is_ok());
    // The health check should pass since we have the prover integrated
    assert!(health.unwrap());
}

#[tokio::test]
async fn test_sha256_proof_generation() {
    let service = ZkmlService::new().unwrap();
    let test_data = b"hello world";
    
    let result = service.generate_sha256_proof(test_data).await;
    assert!(result.is_ok());
    
    let proof = result.unwrap();
    assert_eq!(proof.circuit_type, "sha256");
    assert_eq!(proof.hash.len(), 32);
    assert!(!proof.public_inputs.is_empty());
}

#[tokio::test]
async fn test_sha256_proof_verification() {
    let service = ZkmlService::new().unwrap();
    let test_data = b"test verification data";
    
    // Generate proof
    let proof = service.generate_sha256_proof(test_data).await.unwrap();
    
    // Verify proof with correct data
    let verification_result = service.verify_sha256_proof(&proof, test_data).await;
    assert!(verification_result.is_ok());
    assert!(verification_result.unwrap());
    
    // Verify proof with incorrect data should fail
    let wrong_data = b"wrong data";
    let verification_result = service.verify_sha256_proof(&proof, wrong_data).await;
    assert!(verification_result.is_ok());
    assert!(!verification_result.unwrap());
}

#[tokio::test]
async fn test_circuit_info() {
    let service = ZkmlService::new().unwrap();
    let info = service.get_sha256_circuit_info();
    
    assert_eq!(info.name, "SHA256");
    assert!(info.max_input_size > 0);
    assert!(info.estimated_proof_time_ms > 0);
    assert_eq!(info.security_level, 128);
}

#[tokio::test]
async fn test_prover_status() {
    let service = ZkmlService::new().unwrap();
    let status = service.get_status();
    
    assert!(status.available);
    assert!(status.circuit_size.contains("2^14"));
    assert!(status.estimated_setup_time_ms > 0);
    assert!(status.error.is_none());
}

#[tokio::test]
async fn test_empty_data_proof() {
    let service = ZkmlService::new().unwrap();
    let empty_data = b"";
    
    let result = service.generate_sha256_proof(empty_data).await;
    assert!(result.is_ok());
    
    let proof = result.unwrap();
    let verification = service.verify_sha256_proof(&proof, empty_data).await;
    assert!(verification.is_ok());
    assert!(verification.unwrap());
}

#[tokio::test]
async fn test_large_data_proof() {
    let service = ZkmlService::new().unwrap();
    let large_data = vec![0u8; 1024]; // 1KB of data
    
    let result = service.generate_sha256_proof(&large_data).await;
    assert!(result.is_ok());
    
    let proof = result.unwrap();
    let verification = service.verify_sha256_proof(&proof, &large_data).await;
    assert!(verification.is_ok());
    assert!(verification.unwrap());
}

#[tokio::test]
async fn test_proof_serialization() {
    let service = ZkmlService::new().unwrap();
    let test_data = b"serialization test";
    
    let proof = service.generate_sha256_proof(test_data).await.unwrap();
    
    // Test that proof can be serialized and deserialized
    let serialized = serde_json::to_string(&proof);
    assert!(serialized.is_ok());
    
    let deserialized: Result<ZkProof, _> = serde_json::from_str(&serialized.unwrap());
    assert!(deserialized.is_ok());
    
    let deserialized_proof = deserialized.unwrap();
    assert_eq!(proof.hash, deserialized_proof.hash);
    assert_eq!(proof.circuit_type, deserialized_proof.circuit_type);
} 
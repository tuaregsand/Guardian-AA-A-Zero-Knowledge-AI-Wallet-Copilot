//! ZK-ML handlers

use crate::{
    api::{AppState, middleware::auth::UserContext},
    error::Error,
    zkml::ZkProof,
};
use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Extension,
    Json,
};
use base64::{Engine as _, engine::general_purpose};
use serde::Deserialize;
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct GenerateProofRequest {
    pub data: String, // Base64 encoded data
    pub circuit_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct VerifyProofRequest {
    pub proof: ZkProof,
    pub original_data: String, // Base64 encoded original data
}

/// Generate a zero-knowledge proof
pub async fn generate_proof(
    State(state): State<Arc<AppState>>,
    Extension(_user_context): Extension<UserContext>,
    Json(req): Json<GenerateProofRequest>,
) -> Result<impl IntoResponse, Error> {
    // Decode the input data
    let data = general_purpose::STANDARD.decode(&req.data)
        .map_err(|_| Error::BadRequest("Invalid base64 data".to_string()))?;

    // For now, we only support SHA256 circuit
    let circuit_type = req.circuit_type.unwrap_or_else(|| "sha256".to_string());
    if circuit_type != "sha256" {
        return Err(Error::BadRequest("Only SHA256 circuit is currently supported".to_string()));
    }

    // Generate the proof
    let proof = state.zkml_service.generate_sha256_proof(&data).await?;

    // Store proof in database (optional - for audit trail)
    // TODO: Add proof storage to database

    Ok(Json(proof))
}

/// Verify a zero-knowledge proof
pub async fn verify_proof(
    State(state): State<Arc<AppState>>,
    Extension(_user_context): Extension<UserContext>,
    Json(req): Json<VerifyProofRequest>,
) -> Result<impl IntoResponse, Error> {
    // Decode the original data
    let original_data = general_purpose::STANDARD.decode(&req.original_data)
        .map_err(|_| Error::BadRequest("Invalid base64 original data".to_string()))?;

    // Verify the proof
    let is_valid = state.zkml_service.verify_sha256_proof(&req.proof, &original_data).await?;

    Ok(Json(serde_json::json!({
        "valid": is_valid,
        "circuit_type": req.proof.circuit_type,
        "verified_at": chrono::Utc::now()
    })))
}

/// Get proof status (for async proof generation)
pub async fn get_proof_status(
    State(_state): State<Arc<AppState>>,
    Path(proof_id): Path<String>,
) -> Result<impl IntoResponse, Error> {
    // TODO: Implement proof status tracking for async operations
    // For now, return a placeholder response
    Ok(Json(serde_json::json!({
        "proof_id": proof_id,
        "status": "completed",
        "message": "Proof status tracking not yet implemented"
    })))
}

/// Get circuit information
pub async fn get_circuit_info(
    State(state): State<Arc<AppState>>,
    Path(circuit_name): Path<String>,
) -> Result<impl IntoResponse, Error> {
    match circuit_name.as_str() {
        "sha256" => {
            let info = state.zkml_service.get_sha256_circuit_info();
            Ok(Json(info))
        }
        _ => Err(Error::NotFound),
    }
}

/// Get ZKML system status
pub async fn get_system_status(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Error> {
    let status = state.zkml_service.get_status();
    Ok(Json(status))
}

/// Health check for ZKML system
pub async fn health_check(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Error> {
    match state.zkml_service.health_check() {
        Ok(true) => Ok(Json(serde_json::json!({
            "status": "healthy",
            "message": "ZKML proof system is operational",
            "timestamp": chrono::Utc::now()
        }))),
        Ok(false) => Ok(Json(serde_json::json!({
            "status": "unhealthy",
            "message": "ZKML proof system is not responding",
            "timestamp": chrono::Utc::now()
        }))),
        Err(e) => Ok(Json(serde_json::json!({
            "status": "error",
            "message": format!("ZKML system error: {}", e),
            "timestamp": chrono::Utc::now()
        }))),
    }
}

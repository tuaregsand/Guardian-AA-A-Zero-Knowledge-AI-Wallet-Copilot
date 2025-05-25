//! Authentication handlers

use crate::{api::AppState, error::Error, services::auth::AuthService};
use axum::{extract::State, response::IntoResponse, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub username: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Deserialize)]
pub struct VerifyEmailRequest {
    pub token: String,
}

#[derive(Debug, Deserialize)]
pub struct ForgotPasswordRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct ResetPasswordRequest {
    pub token: String,
    pub new_password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_in: i64,
    pub token_type: String,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub message: String,
}

/// Register a new user
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> Result<impl IntoResponse, Error> {
    let auth_service = AuthService::new(state);
    let response = auth_service.register(req).await?;
    Ok(Json(response))
}

/// User login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<impl IntoResponse, Error> {
    let auth_service = AuthService::new(state);
    let response = auth_service.login(req).await?;
    Ok(Json(response))
}

/// Refresh access token
pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RefreshTokenRequest>,
) -> Result<impl IntoResponse, Error> {
    let auth_service = AuthService::new(state);
    let response = auth_service.refresh_token(req).await?;
    Ok(Json(response))
}

/// User logout
pub async fn logout(
    State(_state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Error> {
    // TODO: Implement token blacklisting
    Ok(Json(MessageResponse {
        message: "Successfully logged out".to_string(),
    }))
}

/// Verify email address
pub async fn verify_email(
    State(state): State<Arc<AppState>>,
    Json(req): Json<VerifyEmailRequest>,
) -> Result<impl IntoResponse, Error> {
    let auth_service = AuthService::new(state);
    auth_service.verify_email(req).await?;
    Ok(Json(MessageResponse {
        message: "Email verified successfully".to_string(),
    }))
}

/// Request password reset
pub async fn forgot_password(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ForgotPasswordRequest>,
) -> Result<impl IntoResponse, Error> {
    let auth_service = AuthService::new(state);
    auth_service.forgot_password(req).await?;
    Ok(Json(MessageResponse {
        message: "Password reset email sent".to_string(),
    }))
}

/// Reset password
pub async fn reset_password(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ResetPasswordRequest>,
) -> Result<impl IntoResponse, Error> {
    let auth_service = AuthService::new(state);
    auth_service.reset_password(req).await?;
    Ok(Json(MessageResponse {
        message: "Password reset successfully".to_string(),
    }))
} 
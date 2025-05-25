//! Wallet management handlers

use crate::{
    api::{AppState, middleware::auth::UserContext},
    error::Error,
    services::WalletService,
    db::models::{CreateWallet, WalletType},
};
use axum::{
    extract::{Path, Query, State},
    response::IntoResponse,
    Extension,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct CreateWalletRequest {
    pub name: String,
    pub wallet_type: WalletType,
    pub public_key: String,
    pub encrypted_private_key: Option<String>,
    pub derivation_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct WalletQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Create a new wallet
pub async fn create_wallet(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Json(req): Json<CreateWalletRequest>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let wallet_data = CreateWallet {
        name: req.name,
        wallet_type: req.wallet_type,
        public_key: req.public_key,
        encrypted_private_key: req.encrypted_private_key,
        derivation_path: req.derivation_path,
    };

    let wallet_service = WalletService::new(state);
    let wallet = wallet_service.create_wallet(user_id, wallet_data).await?;

    Ok(Json(wallet))
}

/// Get all wallets for the authenticated user
pub async fn get_wallets(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Query(_query): Query<WalletQuery>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let wallet_service = WalletService::new(state);
    let wallets = wallet_service.get_user_wallets(user_id).await?;

    Ok(Json(wallets))
}

/// Get a specific wallet by ID
pub async fn get_wallet(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(wallet_id): Path<Uuid>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let wallet_service = WalletService::new(state);
    let wallet = wallet_service.get_wallet(wallet_id, user_id).await?;

    Ok(Json(wallet))
}

/// Get wallet balance
pub async fn get_wallet_balance(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(wallet_id): Path<Uuid>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let wallet_service = WalletService::new(state);
    let balance = wallet_service.get_wallet_balance(wallet_id, user_id).await?;

    Ok(Json(balance))
}

/// Deactivate a wallet
pub async fn deactivate_wallet(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(wallet_id): Path<Uuid>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let wallet_service = WalletService::new(state);
    wallet_service.deactivate_wallet(wallet_id, user_id).await?;

    Ok(Json(serde_json::json!({
        "message": "Wallet deactivated successfully"
    })))
}

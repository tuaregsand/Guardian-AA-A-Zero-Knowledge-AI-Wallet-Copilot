//! Transaction handlers

use crate::{
    api::{AppState, middleware::auth::UserContext},
    error::Error,
    services::TransactionService,
    db::models::{CreateTransaction, TransactionType},
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
pub struct CreateTransactionRequest {
    pub wallet_id: Uuid,
    pub transaction_type: TransactionType,
    pub from_address: String,
    pub to_address: String,
    pub amount: String,
    pub token_mint: Option<String>,
    pub raw_transaction: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TransactionQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub wallet_id: Option<Uuid>,
}

/// Create a new transaction
pub async fn create_transaction(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Json(req): Json<CreateTransactionRequest>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let transaction_data = CreateTransaction {
        wallet_id: req.wallet_id,
        transaction_type: req.transaction_type,
        from_address: req.from_address,
        to_address: req.to_address,
        amount: req.amount,
        token_mint: req.token_mint,
        raw_transaction: req.raw_transaction,
    };

    let transaction_service = TransactionService::new(state);
    let transaction = transaction_service.create_transaction(user_id, transaction_data).await?;

    Ok(Json(transaction))
}

/// Get transactions for a wallet
pub async fn get_transactions(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Query(query): Query<TransactionQuery>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let wallet_id = query.wallet_id.ok_or_else(|| Error::BadRequest("wallet_id is required".to_string()))?;
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    let transaction_service = TransactionService::new(state);
    let transactions = transaction_service.get_wallet_transactions(wallet_id, user_id, limit, offset).await?;

    Ok(Json(transactions))
}

/// Get a specific transaction by ID
pub async fn get_transaction(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(transaction_id): Path<Uuid>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let transaction_service = TransactionService::new(state);
    let transaction = transaction_service.get_transaction(transaction_id, user_id).await?;

    Ok(Json(transaction))
}

/// Submit a transaction to the blockchain
pub async fn submit_transaction(
    State(state): State<Arc<AppState>>,
    Path(transaction_id): Path<Uuid>,
) -> Result<impl IntoResponse, Error> {
    let transaction_service = TransactionService::new(state);
    let tx_hash = transaction_service.submit_transaction(transaction_id).await?;

    Ok(Json(serde_json::json!({
        "transaction_hash": tx_hash,
        "message": "Transaction submitted successfully"
    })))
}

/// Estimate transaction fee
pub async fn estimate_fee(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateTransactionRequest>,
) -> Result<impl IntoResponse, Error> {
    let transaction_data = CreateTransaction {
        wallet_id: req.wallet_id,
        transaction_type: req.transaction_type,
        from_address: req.from_address,
        to_address: req.to_address,
        amount: req.amount,
        token_mint: req.token_mint,
        raw_transaction: req.raw_transaction,
    };

    let transaction_service = TransactionService::new(state);
    let fee_estimate = transaction_service.estimate_fee(&transaction_data).await?;

    Ok(Json(fee_estimate))
}

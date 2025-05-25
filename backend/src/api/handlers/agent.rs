//! Agent handlers

use crate::{
    api::{AppState, middleware::auth::UserContext},
    error::Error,
    services::{AgentService, agent::{CreatePredictionRequest, MarketAnalysisRequest}},
    db::models::AgentType,
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
pub struct AgentQuery {
    pub agent_type: Option<AgentType>,
}

#[derive(Debug, Deserialize)]
pub struct PredictionQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub asset_symbol: Option<String>,
}

/// Get all active agents
pub async fn get_agents(
    State(state): State<Arc<AppState>>,
    Query(query): Query<AgentQuery>,
) -> Result<impl IntoResponse, Error> {
    let agent_service = AgentService::new(state);
    
    let agents = if let Some(agent_type) = query.agent_type {
        agent_service.get_agents_by_type(agent_type).await?
    } else {
        agent_service.get_active_agents().await?
    };

    Ok(Json(agents))
}

/// Get a specific agent by ID
pub async fn get_agent(
    State(state): State<Arc<AppState>>,
    Path(agent_id): Path<Uuid>,
) -> Result<impl IntoResponse, Error> {
    let agent_service = AgentService::new(state);
    let agent = agent_service.get_agent(agent_id).await?;

    Ok(Json(agent))
}

/// Create a new prediction
pub async fn create_prediction(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Json(req): Json<CreatePredictionRequest>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let agent_service = AgentService::new(state);
    let prediction = agent_service.create_prediction(user_id, req).await?;

    Ok(Json(prediction))
}

/// Get predictions for the authenticated user
pub async fn get_predictions(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Query(query): Query<PredictionQuery>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let agent_service = AgentService::new(state);
    
    let predictions = if let Some(asset_symbol) = query.asset_symbol {
        agent_service.get_asset_predictions(user_id, &asset_symbol).await?
    } else {
        let limit = query.limit.unwrap_or(50);
        let offset = query.offset.unwrap_or(0);
        agent_service.get_user_predictions(user_id, limit, offset).await?
    };

    Ok(Json(predictions))
}

/// Get a specific prediction by ID
pub async fn get_prediction(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Path(prediction_id): Path<Uuid>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let agent_service = AgentService::new(state);
    let prediction = agent_service.get_prediction(prediction_id, user_id).await?;

    Ok(Json(prediction))
}

/// Generate market analysis using ensemble of agents
pub async fn generate_market_analysis(
    State(state): State<Arc<AppState>>,
    Extension(user_context): Extension<UserContext>,
    Json(req): Json<MarketAnalysisRequest>,
) -> Result<impl IntoResponse, Error> {
    let user_id = user_context.user_id;

    let asset_symbol = req.asset_symbol.clone();
    let agent_service = AgentService::new(state);
    let analysis = agent_service.generate_market_analysis(user_id, &asset_symbol, req).await?;

    Ok(Json(analysis))
}

/// Clean up expired predictions (admin endpoint)
pub async fn cleanup_expired_predictions(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, Error> {
    let agent_service = AgentService::new(state);
    let count = agent_service.cleanup_expired_predictions().await?;

    Ok(Json(serde_json::json!({
        "message": "Expired predictions cleaned up",
        "count": count
    })))
}

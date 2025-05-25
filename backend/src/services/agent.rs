//! Agent service

use crate::{
    api::AppState,
    db::{models::*, queries::*},
    error::{Error, Result},
};
use std::sync::Arc;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};
use serde_json;

pub struct AgentService {
    state: Arc<AppState>,
}

impl AgentService {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// Get all active agents
    pub async fn get_active_agents(&self) -> Result<Vec<Agent>> {
        let agents = AgentQueries::find_active(self.state.db.pool()).await?;
        Ok(agents)
    }

    /// Get agent by ID
    pub async fn get_agent(&self, agent_id: Uuid) -> Result<Agent> {
        let agent = AgentQueries::find_by_id(self.state.db.pool(), agent_id).await?
            .ok_or(Error::NotFound)?;
        Ok(agent)
    }

    /// Get agents by type
    pub async fn get_agents_by_type(&self, agent_type: AgentType) -> Result<Vec<Agent>> {
        let agents = AgentQueries::find_by_type(self.state.db.pool(), agent_type).await?;
        Ok(agents)
    }

    /// Create a new prediction
    pub async fn create_prediction(
        &self,
        user_id: Uuid,
        prediction_request: CreatePredictionRequest,
    ) -> Result<AgentPrediction> {
        // Validate the agent exists and is active
        let agent = self.get_agent(prediction_request.agent_id).await?;
        if !agent.is_active {
            return Err(Error::BadRequest("Agent is not active".to_string()));
        }

        // Validate prediction data
        self.validate_prediction_request(&prediction_request)?;

        // Generate explanation hash
        let explanation_hash = self.generate_explanation_hash(&prediction_request.explanation_text);

        // Set expiration time (24 hours from now)
        let expires_at = Utc::now() + Duration::hours(24);

        // Create the prediction
        let prediction = AgentPredictionQueries::create(
            self.state.db.pool(),
            prediction_request.agent_id,
            user_id,
            &prediction_request.asset_symbol,
            prediction_request.prediction,
            prediction_request.confidence,
            &explanation_hash,
            &prediction_request.explanation_text,
            &prediction_request.data_sources,
            expires_at,
        ).await?;

        Ok(prediction)
    }

    /// Get predictions for a user
    pub async fn get_user_predictions(
        &self,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<AgentPrediction>> {
        let predictions = AgentPredictionQueries::find_by_user_id(self.state.db.pool(), user_id, limit, offset).await?;
        Ok(predictions)
    }

    /// Get predictions for an asset
    pub async fn get_asset_predictions(
        &self,
        user_id: Uuid,
        asset_symbol: &str,
    ) -> Result<Vec<AgentPrediction>> {
        let predictions = AgentPredictionQueries::find_by_asset(self.state.db.pool(), user_id, asset_symbol).await?;
        Ok(predictions)
    }

    /// Get prediction by ID
    pub async fn get_prediction(&self, prediction_id: Uuid, user_id: Uuid) -> Result<AgentPrediction> {
        let prediction = AgentPredictionQueries::find_by_id(self.state.db.pool(), prediction_id).await?
            .ok_or(Error::NotFound)?;

        // Ensure the prediction belongs to the user
        if prediction.user_id != user_id {
            return Err(Error::Forbidden);
        }

        Ok(prediction)
    }

    /// Generate market analysis using ensemble of agents
    pub async fn generate_market_analysis(
        &self,
        user_id: Uuid,
        asset_symbol: &str,
        market_data: MarketAnalysisRequest,
    ) -> Result<MarketAnalysis> {
        // Get all active agents
        let agents = self.get_active_agents().await?;

        // TODO: Run each agent's model on the market data
        // For now, simulate agent predictions
        let mut agent_predictions = Vec::new();

        for agent in &agents {
            if agent.agent_type != AgentType::Ensemble {
                let prediction = self.simulate_agent_prediction(agent, &market_data).await?;
                agent_predictions.push(prediction);
            }
        }

        // Aggregate predictions using ensemble logic
        let ensemble_result = self.aggregate_predictions(&agent_predictions)?;

        // Generate portfolio recommendation
        let recommendation = self.generate_portfolio_recommendation(
            user_id,
            &ensemble_result,
            &market_data,
        ).await?;

        Ok(MarketAnalysis {
            asset_symbol: asset_symbol.to_string(),
            analysis_timestamp: Utc::now(),
            agent_predictions,
            ensemble_result: ensemble_result.clone(),
            portfolio_recommendation: Some(recommendation),
            confidence_score: ensemble_result.confidence,
            risk_assessment: self.assess_risk(&ensemble_result),
        })
    }

    /// Update agent circuit hash (for ZKML integration)
    pub async fn update_agent_circuit(&self, agent_id: Uuid, circuit_hash: &str) -> Result<()> {
        AgentQueries::update_circuit_hash(self.state.db.pool(), agent_id, circuit_hash).await?;
        Ok(())
    }

    /// Clean up expired predictions
    pub async fn cleanup_expired_predictions(&self) -> Result<u64> {
        let count = AgentPredictionQueries::cleanup_expired(self.state.db.pool()).await?;
        Ok(count)
    }

    /// Validate prediction request
    fn validate_prediction_request(&self, request: &CreatePredictionRequest) -> Result<()> {
        if request.asset_symbol.trim().is_empty() {
            return Err(Error::Validation("Asset symbol cannot be empty".to_string()));
        }

        if request.confidence < 0.0 || request.confidence > 1.0 {
            return Err(Error::Validation("Confidence must be between 0.0 and 1.0".to_string()));
        }

        if request.explanation_text.trim().is_empty() {
            return Err(Error::Validation("Explanation text cannot be empty".to_string()));
        }

        Ok(())
    }

    /// Generate SHA-256 hash of explanation text
    fn generate_explanation_hash(&self, explanation: &str) -> String {
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(explanation.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Simulate agent prediction (placeholder for actual ML inference)
    async fn simulate_agent_prediction(
        &self,
        agent: &Agent,
        _market_data: &MarketAnalysisRequest,
    ) -> Result<AgentPredictionResult> {
        // TODO: Integrate with actual ML models
        // For now, simulate based on agent type
        let (prediction, confidence) = match agent.agent_type {
            AgentType::NewsSentiment => (PredictionType::Bullish, 0.7),
            AgentType::MarketFactor => (PredictionType::Neutral, 0.6),
            AgentType::TechnicalAnalysis => (PredictionType::Bearish, 0.8),
            AgentType::CryptoFactor => (PredictionType::Bullish, 0.65),
            AgentType::Ensemble => return Err(Error::Internal), // Should not be called for ensemble
        };

        Ok(AgentPredictionResult {
            agent_id: agent.id,
            agent_name: agent.name.clone(),
            agent_type: agent.agent_type.clone(),
            prediction,
            confidence,
            reasoning: format!("Simulated prediction from {} agent", agent.name),
        })
    }

    /// Aggregate predictions using ensemble logic
    fn aggregate_predictions(&self, predictions: &[AgentPredictionResult]) -> Result<EnsembleResult> {
        if predictions.is_empty() {
            return Err(Error::BadRequest("No predictions to aggregate".to_string()));
        }

        // Calculate weighted average confidence
        let total_confidence: f64 = predictions.iter().map(|p| p.confidence).sum();
        let avg_confidence = total_confidence / predictions.len() as f64;

        // Determine overall prediction based on majority vote weighted by confidence
        let mut bullish_weight = 0.0;
        let mut bearish_weight = 0.0;
        let mut neutral_weight = 0.0;

        for pred in predictions {
            match pred.prediction {
                PredictionType::Bullish => bullish_weight += pred.confidence,
                PredictionType::Bearish => bearish_weight += pred.confidence,
                PredictionType::Neutral => neutral_weight += pred.confidence,
            }
        }

        let overall_prediction = if bullish_weight > bearish_weight && bullish_weight > neutral_weight {
            PredictionType::Bullish
        } else if bearish_weight > neutral_weight {
            PredictionType::Bearish
        } else {
            PredictionType::Neutral
        };

        Ok(EnsembleResult {
            prediction: overall_prediction,
            confidence: avg_confidence,
            agent_count: predictions.len(),
            consensus_strength: self.calculate_consensus_strength(predictions),
        })
    }

    /// Calculate consensus strength among agents
    fn calculate_consensus_strength(&self, predictions: &[AgentPredictionResult]) -> f64 {
        if predictions.len() <= 1 {
            return 1.0;
        }

        // Count predictions by type
        let mut counts = std::collections::HashMap::new();
        for pred in predictions {
            *counts.entry(pred.prediction.clone()).or_insert(0) += 1;
        }

        // Find the maximum count
        let max_count = counts.values().max().unwrap_or(&0);
        *max_count as f64 / predictions.len() as f64
    }

    /// Generate portfolio recommendation
    async fn generate_portfolio_recommendation(
        &self,
        user_id: Uuid,
        ensemble_result: &EnsembleResult,
        _market_data: &MarketAnalysisRequest,
    ) -> Result<PortfolioRecommendation> {
        // Determine recommendation type and allocations based on prediction
        let (recommendation_type, crypto_ratio, cash_ratio) = match ensemble_result.prediction {
            PredictionType::Bullish => {
                let ratio = 0.7 + (ensemble_result.confidence - 0.5) * 0.4;
                (RecommendationType::Buy, ratio.min(0.9), 1.0 - ratio.min(0.9))
            }
            PredictionType::Bearish => {
                let ratio = 0.3 - (ensemble_result.confidence - 0.5) * 0.4;
                (RecommendationType::Sell, ratio.max(0.1), 1.0 - ratio.max(0.1))
            }
            PredictionType::Neutral => (RecommendationType::Hold, 0.5, 0.5),
        };

        // Create asset allocations
        let asset_allocations = serde_json::json!({
            "SOL": crypto_ratio * 0.6,
            "BTC": crypto_ratio * 0.3,
            "ETH": crypto_ratio * 0.1,
            "CASH": cash_ratio
        });

        // Create recommendation
        let recommendation = PortfolioRecommendationQueries::create(
            self.state.db.pool(),
            user_id,
            recommendation_type,
            &asset_allocations,
            cash_ratio,
            crypto_ratio,
            ensemble_result.confidence,
            &format!("Recommendation based on ensemble prediction: {:?}", ensemble_result.prediction),
            None, // No ZKML proof yet
        ).await?;

        Ok(recommendation)
    }

    /// Assess risk based on ensemble result
    fn assess_risk(&self, ensemble_result: &EnsembleResult) -> RiskAssessment {
        let risk_level = if ensemble_result.confidence > 0.8 && ensemble_result.consensus_strength > 0.7 {
            RiskLevel::Low
        } else if ensemble_result.confidence > 0.6 && ensemble_result.consensus_strength > 0.5 {
            RiskLevel::Medium
        } else {
            RiskLevel::High
        };

        RiskAssessment {
            risk_level,
            confidence_factor: ensemble_result.confidence,
            consensus_factor: ensemble_result.consensus_strength,
            volatility_estimate: 0.15, // Placeholder
        }
    }
}

/// Request to create a new prediction
#[derive(Debug, serde::Deserialize)]
pub struct CreatePredictionRequest {
    pub agent_id: Uuid,
    pub asset_symbol: String,
    pub prediction: PredictionType,
    pub confidence: f64,
    pub explanation_text: String,
    pub data_sources: serde_json::Value,
}

/// Market analysis request
#[derive(Debug, serde::Deserialize)]
pub struct MarketAnalysisRequest {
    pub asset_symbol: String,
    pub timeframe: String,
    pub include_news: bool,
    pub include_technical: bool,
    pub include_fundamentals: bool,
}

/// Market analysis response
#[derive(Debug, serde::Serialize)]
pub struct MarketAnalysis {
    pub asset_symbol: String,
    pub analysis_timestamp: DateTime<Utc>,
    pub agent_predictions: Vec<AgentPredictionResult>,
    pub ensemble_result: EnsembleResult,
    pub portfolio_recommendation: Option<PortfolioRecommendation>,
    pub confidence_score: f64,
    pub risk_assessment: RiskAssessment,
}

/// Individual agent prediction result
#[derive(Debug, serde::Serialize)]
pub struct AgentPredictionResult {
    pub agent_id: Uuid,
    pub agent_name: String,
    pub agent_type: AgentType,
    pub prediction: PredictionType,
    pub confidence: f64,
    pub reasoning: String,
}

/// Ensemble aggregation result
#[derive(Debug, Clone, serde::Serialize)]
pub struct EnsembleResult {
    pub prediction: PredictionType,
    pub confidence: f64,
    pub agent_count: usize,
    pub consensus_strength: f64,
}

/// Risk assessment
#[derive(Debug, serde::Serialize)]
pub struct RiskAssessment {
    pub risk_level: RiskLevel,
    pub confidence_factor: f64,
    pub consensus_factor: f64,
    pub volatility_estimate: f64,
}

/// Risk levels
#[derive(Debug, serde::Serialize)]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

//! Database models for Guardian-AA Backend

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use serde_json;
use sqlx::types::ipnetwork;

/// User account model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login: Option<DateTime<Utc>>,
}

/// User creation request
#[derive(Debug, Deserialize)]
pub struct CreateUser {
    pub email: String,
    pub password: String,
}

/// User update request
#[derive(Debug, Deserialize)]
pub struct UpdateUser {
    pub email: Option<String>,
    pub is_active: Option<bool>,
}

/// Wallet model - supports multiple wallets per user
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Wallet {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub wallet_type: WalletType,
    pub public_key: String,
    pub encrypted_private_key: Option<String>, // None for watch-only wallets
    pub derivation_path: Option<String>,       // For HD wallets
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Wallet types supported by Guardian-AA
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "wallet_type", rename_all = "snake_case")]
pub enum WalletType {
    Solana,
    Ethereum,
    Bitcoin,
    WatchOnly,
}

/// Wallet creation request
#[derive(Debug, Deserialize)]
pub struct CreateWallet {
    pub name: String,
    pub wallet_type: WalletType,
    pub public_key: String,
    pub encrypted_private_key: Option<String>,
    pub derivation_path: Option<String>,
}

/// Transaction model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub wallet_id: Uuid,
    pub transaction_hash: Option<String>, // None until confirmed
    pub transaction_type: TransactionType,
    pub status: TransactionStatus,
    pub from_address: String,
    pub to_address: String,
    pub amount: String, // Using string to avoid precision issues
    pub token_mint: Option<String>, // For SPL tokens
    pub fee: Option<String>,
    pub block_number: Option<i64>,
    pub confirmation_count: i32,
    pub raw_transaction: Option<String>, // Serialized transaction data
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub confirmed_at: Option<DateTime<Utc>>,
}

/// Transaction types
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "transaction_type", rename_all = "snake_case")]
pub enum TransactionType {
    Send,
    Receive,
    Swap,
    Stake,
    Unstake,
    ContractInteraction,
}

/// Transaction status
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "transaction_status", rename_all = "snake_case")]
pub enum TransactionStatus {
    Pending,
    Confirmed,
    Failed,
    Cancelled,
}

impl std::fmt::Display for TransactionStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TransactionStatus::Pending => write!(f, "pending"),
            TransactionStatus::Confirmed => write!(f, "confirmed"),
            TransactionStatus::Failed => write!(f, "failed"),
            TransactionStatus::Cancelled => write!(f, "cancelled"),
        }
    }
}

/// Transaction creation request
#[derive(Debug, Deserialize)]
pub struct CreateTransaction {
    pub wallet_id: Uuid,
    pub transaction_type: TransactionType,
    pub from_address: String,
    pub to_address: String,
    pub amount: String,
    pub token_mint: Option<String>,
    pub raw_transaction: Option<String>,
}

/// AI Agent model - represents different market analysis agents
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Agent {
    pub id: Uuid,
    pub name: String,
    pub agent_type: AgentType,
    pub description: String,
    pub model_version: String,
    pub circuit_hash: Option<String>, // Hash of the ZK circuit
    pub is_active: bool,
    pub confidence_threshold: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Agent types as defined in the research
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type)]
#[sqlx(type_name = "agent_type", rename_all = "snake_case")]
pub enum AgentType {
    NewsSentiment,
    MarketFactor,
    TechnicalAnalysis,
    CryptoFactor,
    Ensemble,
}

/// Agent prediction/recommendation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AgentPrediction {
    pub id: Uuid,
    pub agent_id: Uuid,
    pub user_id: Uuid,
    pub asset_symbol: String,
    pub prediction: PredictionType,
    pub confidence: f64,
    pub explanation_hash: String, // SHA-256 hash of explanation
    pub explanation_text: String, // Off-chain explanation
    pub data_sources: serde_json::Value, // JSON array of data source URLs/hashes
    pub created_at: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
}

/// Prediction types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash, sqlx::Type)]
#[sqlx(type_name = "prediction_type", rename_all = "snake_case")]
pub enum PredictionType {
    Bullish,
    Bearish,
    Neutral,
}

/// ZKML Proof model - stores zero-knowledge proofs for agent predictions
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ZkmlProof {
    pub id: Uuid,
    pub prediction_id: Uuid,
    pub proof_type: ProofType,
    pub proof_data: String, // Base64 encoded proof
    pub public_inputs: serde_json::Value, // JSON of public inputs
    pub verification_key_hash: String,
    pub circuit_hash: String,
    pub is_verified: bool,
    pub verification_gas_cost: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub verified_at: Option<DateTime<Utc>>,
}

/// Proof types in the recursive system
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "proof_type", rename_all = "snake_case")]
pub enum ProofType {
    AgentProof,      // Individual agent proof
    RecursiveProof,  // Aggregated proof
    FinalProof,      // Final proof for on-chain verification
}

/// Portfolio rebalancing recommendation
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PortfolioRecommendation {
    pub id: Uuid,
    pub user_id: Uuid,
    pub recommendation_type: RecommendationType,
    pub asset_allocations: serde_json::Value, // JSON of asset -> percentage mappings
    pub cash_ratio: f64,
    pub crypto_ratio: f64,
    pub confidence_score: f64,
    pub reasoning: String,
    pub zkml_proof_id: Option<Uuid>,
    pub is_executed: bool,
    pub created_at: DateTime<Utc>,
    pub executed_at: Option<DateTime<Utc>>,
}

/// Recommendation types
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type)]
#[sqlx(type_name = "recommendation_type", rename_all = "snake_case")]
pub enum RecommendationType {
    Rebalance,
    Buy,
    Sell,
    Hold,
}

/// User session for JWT token management
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub refresh_token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub last_used_at: DateTime<Utc>,
    pub user_agent: Option<String>,
    pub ip_address: Option<ipnetwork::IpNetwork>,
}

/// API key for external integrations
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApiKey {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub key_hash: String,
    pub permissions: serde_json::Value, // JSON array of permissions
    pub is_active: bool,
    pub last_used_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

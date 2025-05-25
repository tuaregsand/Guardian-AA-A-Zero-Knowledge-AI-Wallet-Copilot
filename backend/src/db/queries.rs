//! Database queries for Guardian-AA Backend

use crate::{
    db::models::*,
    error::Result,
};
use chrono::{DateTime, Utc};
use sqlx::PgPool;
use uuid::Uuid;
use sqlx::types::ipnetwork;

/// User queries
pub struct UserQueries;

impl UserQueries {
    /// Create a new user
    pub async fn create(pool: &PgPool, user: &CreateUser, password_hash: &str) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            r#"
            INSERT INTO users (email, password_hash)
            VALUES ($1, $2)
            RETURNING id, email, password_hash, is_active, created_at, updated_at, last_login
            "#,
            user.email,
            password_hash
        )
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    /// Find user by email
    pub async fn find_by_email(pool: &PgPool, email: &str) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, is_active, created_at, updated_at, last_login
            FROM users
            WHERE email = $1
            "#,
            email
        )
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Find user by ID
    pub async fn find_by_id(pool: &PgPool, user_id: Uuid) -> Result<Option<User>> {
        let user = sqlx::query_as!(
            User,
            r#"
            SELECT id, email, password_hash, is_active, created_at, updated_at, last_login
            FROM users
            WHERE id = $1
            "#,
            user_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(user)
    }

    /// Update user last login
    pub async fn update_last_login(pool: &PgPool, user_id: Uuid) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE users
            SET last_login = NOW(), updated_at = NOW()
            WHERE id = $1
            "#,
            user_id
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Update user
    pub async fn update(pool: &PgPool, user_id: Uuid, update: &UpdateUser) -> Result<User> {
        let user = sqlx::query_as!(
            User,
            r#"
            UPDATE users
            SET 
                email = COALESCE($2, email),
                is_active = COALESCE($3, is_active),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, password_hash, is_active, created_at, updated_at, last_login
            "#,
            user_id,
            update.email.as_ref(),
            update.is_active
        )
        .fetch_one(pool)
        .await?;

        Ok(user)
    }
}

/// Wallet queries
pub struct WalletQueries;

impl WalletQueries {
    /// Create a new wallet
    pub async fn create(pool: &PgPool, user_id: Uuid, wallet: &CreateWallet) -> Result<Wallet> {
        let wallet = sqlx::query_as!(
            Wallet,
            r#"
            INSERT INTO wallets (user_id, name, wallet_type, public_key, encrypted_private_key, derivation_path)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, user_id, name, wallet_type as "wallet_type: WalletType", public_key, 
                      encrypted_private_key, derivation_path, is_active, created_at, updated_at
            "#,
            user_id,
            wallet.name,
            wallet.wallet_type.clone() as WalletType,
            wallet.public_key,
            wallet.encrypted_private_key,
            wallet.derivation_path
        )
        .fetch_one(pool)
        .await?;

        Ok(wallet)
    }

    /// Get all wallets for a user
    pub async fn find_by_user_id(pool: &PgPool, user_id: Uuid) -> Result<Vec<Wallet>> {
        let wallets = sqlx::query_as!(
            Wallet,
            r#"
            SELECT id, user_id, name, wallet_type as "wallet_type: WalletType", public_key, 
                   encrypted_private_key, derivation_path, is_active, created_at, updated_at
            FROM wallets
            WHERE user_id = $1 AND is_active = true
            ORDER BY created_at DESC
            "#,
            user_id
        )
        .fetch_all(pool)
        .await?;

        Ok(wallets)
    }

    /// Find wallet by ID
    pub async fn find_by_id(pool: &PgPool, wallet_id: Uuid) -> Result<Option<Wallet>> {
        let wallet = sqlx::query_as!(
            Wallet,
            r#"
            SELECT id, user_id, name, wallet_type as "wallet_type: WalletType", public_key, 
                   encrypted_private_key, derivation_path, is_active, created_at, updated_at
            FROM wallets
            WHERE id = $1
            "#,
            wallet_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(wallet)
    }

    /// Find wallet by public key
    pub async fn find_by_public_key(pool: &PgPool, public_key: &str) -> Result<Option<Wallet>> {
        let wallet = sqlx::query_as!(
            Wallet,
            r#"
            SELECT id, user_id, name, wallet_type as "wallet_type: WalletType", public_key, 
                   encrypted_private_key, derivation_path, is_active, created_at, updated_at
            FROM wallets
            WHERE public_key = $1
            "#,
            public_key
        )
        .fetch_optional(pool)
        .await?;

        Ok(wallet)
    }

    /// Deactivate wallet
    pub async fn deactivate(pool: &PgPool, wallet_id: Uuid, user_id: Uuid) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE wallets
            SET is_active = false, updated_at = NOW()
            WHERE id = $1 AND user_id = $2
            "#,
            wallet_id,
            user_id
        )
        .execute(pool)
        .await?;

        Ok(())
    }
}

/// Transaction queries
pub struct TransactionQueries;

impl TransactionQueries {
    /// Create a new transaction
    pub async fn create(pool: &PgPool, transaction: &CreateTransaction) -> Result<Transaction> {
        let transaction = sqlx::query_as!(
            Transaction,
            r#"
            INSERT INTO transactions (wallet_id, transaction_type, from_address, to_address, amount, token_mint, raw_transaction)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, wallet_id, transaction_hash, 
                      transaction_type as "transaction_type: TransactionType",
                      status as "status: TransactionStatus",
                      from_address, to_address, amount, token_mint, fee, block_number,
                      confirmation_count, raw_transaction, error_message,
                      created_at, updated_at, confirmed_at
            "#,
            transaction.wallet_id,
            transaction.transaction_type.clone() as TransactionType,
            transaction.from_address,
            transaction.to_address,
            transaction.amount,
            transaction.token_mint,
            transaction.raw_transaction
        )
        .fetch_one(pool)
        .await?;

        Ok(transaction)
    }

    /// Get transactions for a wallet
    pub async fn find_by_wallet_id(pool: &PgPool, wallet_id: Uuid, limit: i64, offset: i64) -> Result<Vec<Transaction>> {
        let transactions = sqlx::query_as!(
            Transaction,
            r#"
            SELECT id, wallet_id, transaction_hash, 
                   transaction_type as "transaction_type: TransactionType",
                   status as "status: TransactionStatus",
                   from_address, to_address, amount, token_mint, fee, block_number,
                   confirmation_count, raw_transaction, error_message,
                   created_at, updated_at, confirmed_at
            FROM transactions
            WHERE wallet_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            wallet_id,
            limit,
            offset
        )
        .fetch_all(pool)
        .await?;

        Ok(transactions)
    }

    /// Find transaction by ID
    pub async fn find_by_id(pool: &PgPool, transaction_id: Uuid) -> Result<Option<Transaction>> {
        let transaction = sqlx::query_as!(
            Transaction,
            r#"
            SELECT id, wallet_id, transaction_hash, 
                   transaction_type as "transaction_type: TransactionType",
                   status as "status: TransactionStatus",
                   from_address, to_address, amount, token_mint, fee, block_number,
                   confirmation_count, raw_transaction, error_message,
                   created_at, updated_at, confirmed_at
            FROM transactions
            WHERE id = $1
            "#,
            transaction_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(transaction)
    }

    /// Update transaction status
    pub async fn update_status(
        pool: &PgPool,
        transaction_id: Uuid,
        status: TransactionStatus,
        transaction_hash: Option<&str>,
        block_number: Option<i64>,
        fee: Option<&str>,
        error_message: Option<&str>,
    ) -> Result<Transaction> {
        let is_confirmed = matches!(status, TransactionStatus::Confirmed);
        
        // First update the transaction
        sqlx::query!(
            r#"
            UPDATE transactions
            SET status = $2,
                transaction_hash = COALESCE($3, transaction_hash),
                block_number = COALESCE($4, block_number),
                fee = COALESCE($5, fee),
                error_message = COALESCE($6, error_message),
                updated_at = NOW()
            WHERE id = $1
            "#,
            transaction_id,
            status as TransactionStatus,
            transaction_hash,
            block_number,
            fee,
            error_message
        )
        .execute(pool)
        .await?;

        // Update confirmed_at separately if status is confirmed
        if is_confirmed {
            sqlx::query!(
                r#"
                UPDATE transactions
                SET confirmed_at = NOW()
                WHERE id = $1 AND confirmed_at IS NULL
                "#,
                transaction_id
            )
            .execute(pool)
            .await?;
        }

        // Then fetch and return the updated transaction
        let transaction = sqlx::query_as!(
            Transaction,
            r#"
            SELECT id, wallet_id, transaction_hash, 
                   transaction_type as "transaction_type: TransactionType",
                   status as "status: TransactionStatus",
                   from_address, to_address, amount, token_mint, fee, block_number,
                   confirmation_count, raw_transaction, error_message,
                   created_at, updated_at, confirmed_at
            FROM transactions
            WHERE id = $1
            "#,
            transaction_id
        )
        .fetch_one(pool)
        .await?;

        Ok(transaction)
    }

    /// Get pending transactions
    pub async fn find_pending(pool: &PgPool) -> Result<Vec<Transaction>> {
        let transactions = sqlx::query_as!(
            Transaction,
            r#"
            SELECT id, wallet_id, transaction_hash, 
                   transaction_type as "transaction_type: TransactionType",
                   status as "status: TransactionStatus",
                   from_address, to_address, amount, token_mint, fee, block_number,
                   confirmation_count, raw_transaction, error_message,
                   created_at, updated_at, confirmed_at
            FROM transactions
            WHERE status = 'pending'
            ORDER BY created_at ASC
            "#
        )
        .fetch_all(pool)
        .await?;

        Ok(transactions)
    }
}

/// Agent queries
pub struct AgentQueries;

impl AgentQueries {
    /// Get all active agents
    pub async fn find_active(pool: &PgPool) -> Result<Vec<Agent>> {
        let agents = sqlx::query_as!(
            Agent,
            r#"
            SELECT id, name, agent_type as "agent_type: AgentType", description, 
                   model_version, circuit_hash, is_active, confidence_threshold,
                   created_at, updated_at
            FROM agents
            WHERE is_active = true
            ORDER BY created_at ASC
            "#
        )
        .fetch_all(pool)
        .await?;

        Ok(agents)
    }

    /// Find agent by ID
    pub async fn find_by_id(pool: &PgPool, agent_id: Uuid) -> Result<Option<Agent>> {
        let agent = sqlx::query_as!(
            Agent,
            r#"
            SELECT id, name, agent_type as "agent_type: AgentType", description, 
                   model_version, circuit_hash, is_active, confidence_threshold,
                   created_at, updated_at
            FROM agents
            WHERE id = $1
            "#,
            agent_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(agent)
    }

    /// Find agents by type
    pub async fn find_by_type(pool: &PgPool, agent_type: AgentType) -> Result<Vec<Agent>> {
        let agents = sqlx::query_as!(
            Agent,
            r#"
            SELECT id, name, agent_type as "agent_type: AgentType", description, 
                   model_version, circuit_hash, is_active, confidence_threshold,
                   created_at, updated_at
            FROM agents
            WHERE agent_type = $1 AND is_active = true
            ORDER BY created_at ASC
            "#,
            agent_type as AgentType
        )
        .fetch_all(pool)
        .await?;

        Ok(agents)
    }

    /// Update agent circuit hash
    pub async fn update_circuit_hash(pool: &PgPool, agent_id: Uuid, circuit_hash: &str) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE agents
            SET circuit_hash = $2, updated_at = NOW()
            WHERE id = $1
            "#,
            agent_id,
            circuit_hash
        )
        .execute(pool)
        .await?;

        Ok(())
    }
}

/// Agent prediction queries
pub struct AgentPredictionQueries;

impl AgentPredictionQueries {
    /// Create a new prediction
    pub async fn create(
        pool: &PgPool,
        agent_id: Uuid,
        user_id: Uuid,
        asset_symbol: &str,
        prediction: PredictionType,
        confidence: f64,
        explanation_hash: &str,
        explanation_text: &str,
        data_sources: &serde_json::Value,
        expires_at: DateTime<Utc>,
    ) -> Result<AgentPrediction> {
        let prediction = sqlx::query_as!(
            AgentPrediction,
            r#"
            INSERT INTO agent_predictions (
                agent_id, user_id, asset_symbol, prediction, confidence,
                explanation_hash, explanation_text, data_sources, expires_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, agent_id, user_id, asset_symbol, 
                      prediction as "prediction: PredictionType",
                      confidence, explanation_hash, explanation_text,
                      data_sources, created_at, expires_at
            "#,
            agent_id,
            user_id,
            asset_symbol,
            prediction as PredictionType,
            confidence,
            explanation_hash,
            explanation_text,
            data_sources,
            expires_at
        )
        .fetch_one(pool)
        .await?;

        Ok(prediction)
    }

    /// Get predictions for a user
    pub async fn find_by_user_id(pool: &PgPool, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<AgentPrediction>> {
        let predictions = sqlx::query_as!(
            AgentPrediction,
            r#"
            SELECT id, agent_id, user_id, asset_symbol, 
                   prediction as "prediction: PredictionType",
                   confidence, explanation_hash, explanation_text,
                   data_sources, created_at, expires_at
            FROM agent_predictions
            WHERE user_id = $1 AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            user_id,
            limit,
            offset
        )
        .fetch_all(pool)
        .await?;

        Ok(predictions)
    }

    /// Get predictions for an asset
    pub async fn find_by_asset(pool: &PgPool, user_id: Uuid, asset_symbol: &str) -> Result<Vec<AgentPrediction>> {
        let predictions = sqlx::query_as!(
            AgentPrediction,
            r#"
            SELECT id, agent_id, user_id, asset_symbol, 
                   prediction as "prediction: PredictionType",
                   confidence, explanation_hash, explanation_text,
                   data_sources, created_at, expires_at
            FROM agent_predictions
            WHERE user_id = $1 AND asset_symbol = $2 AND expires_at > NOW()
            ORDER BY created_at DESC
            "#,
            user_id,
            asset_symbol
        )
        .fetch_all(pool)
        .await?;

        Ok(predictions)
    }

    /// Find prediction by ID
    pub async fn find_by_id(pool: &PgPool, prediction_id: Uuid) -> Result<Option<AgentPrediction>> {
        let prediction = sqlx::query_as!(
            AgentPrediction,
            r#"
            SELECT id, agent_id, user_id, asset_symbol, 
                   prediction as "prediction: PredictionType",
                   confidence, explanation_hash, explanation_text,
                   data_sources, created_at, expires_at
            FROM agent_predictions
            WHERE id = $1
            "#,
            prediction_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(prediction)
    }

    /// Clean up expired predictions
    pub async fn cleanup_expired(pool: &PgPool) -> Result<u64> {
        let result = sqlx::query!(
            r#"
            DELETE FROM agent_predictions
            WHERE expires_at <= NOW()
            "#
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }
}

/// ZKML Proof queries
pub struct ZkmlProofQueries;

impl ZkmlProofQueries {
    /// Create a new proof
    pub async fn create(
        pool: &PgPool,
        prediction_id: Uuid,
        proof_type: ProofType,
        proof_data: &str,
        public_inputs: &serde_json::Value,
        verification_key_hash: &str,
        circuit_hash: &str,
    ) -> Result<ZkmlProof> {
        let proof = sqlx::query_as!(
            ZkmlProof,
            r#"
            INSERT INTO zkml_proofs (
                prediction_id, proof_type, proof_data, public_inputs,
                verification_key_hash, circuit_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, prediction_id, proof_type as "proof_type: ProofType",
                      proof_data, public_inputs, verification_key_hash,
                      circuit_hash, is_verified, verification_gas_cost,
                      created_at, verified_at
            "#,
            prediction_id,
            proof_type as ProofType,
            proof_data,
            public_inputs,
            verification_key_hash,
            circuit_hash
        )
        .fetch_one(pool)
        .await?;

        Ok(proof)
    }

    /// Find proof by ID
    pub async fn find_by_id(pool: &PgPool, proof_id: Uuid) -> Result<Option<ZkmlProof>> {
        let proof = sqlx::query_as!(
            ZkmlProof,
            r#"
            SELECT id, prediction_id, proof_type as "proof_type: ProofType",
                   proof_data, public_inputs, verification_key_hash,
                   circuit_hash, is_verified, verification_gas_cost,
                   created_at, verified_at
            FROM zkml_proofs
            WHERE id = $1
            "#,
            proof_id
        )
        .fetch_optional(pool)
        .await?;

        Ok(proof)
    }

    /// Find proofs by prediction ID
    pub async fn find_by_prediction_id(pool: &PgPool, prediction_id: Uuid) -> Result<Vec<ZkmlProof>> {
        let proofs = sqlx::query_as!(
            ZkmlProof,
            r#"
            SELECT id, prediction_id, proof_type as "proof_type: ProofType",
                   proof_data, public_inputs, verification_key_hash,
                   circuit_hash, is_verified, verification_gas_cost,
                   created_at, verified_at
            FROM zkml_proofs
            WHERE prediction_id = $1
            ORDER BY created_at DESC
            "#,
            prediction_id
        )
        .fetch_all(pool)
        .await?;

        Ok(proofs)
    }

    /// Mark proof as verified
    pub async fn mark_verified(pool: &PgPool, proof_id: Uuid, gas_cost: Option<i64>) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE zkml_proofs
            SET is_verified = true, 
                verification_gas_cost = $2,
                verified_at = NOW()
            WHERE id = $1
            "#,
            proof_id,
            gas_cost
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Get unverified proofs
    pub async fn find_unverified(pool: &PgPool) -> Result<Vec<ZkmlProof>> {
        let proofs = sqlx::query_as!(
            ZkmlProof,
            r#"
            SELECT id, prediction_id, proof_type as "proof_type: ProofType",
                   proof_data, public_inputs, verification_key_hash,
                   circuit_hash, is_verified, verification_gas_cost,
                   created_at, verified_at
            FROM zkml_proofs
            WHERE is_verified = false
            ORDER BY created_at ASC
            "#
        )
        .fetch_all(pool)
        .await?;

        Ok(proofs)
    }
}

/// Portfolio recommendation queries
pub struct PortfolioRecommendationQueries;

impl PortfolioRecommendationQueries {
    /// Create a new recommendation
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        recommendation_type: RecommendationType,
        asset_allocations: &serde_json::Value,
        cash_ratio: f64,
        crypto_ratio: f64,
        confidence_score: f64,
        reasoning: &str,
        zkml_proof_id: Option<Uuid>,
    ) -> Result<PortfolioRecommendation> {
        let recommendation = sqlx::query_as!(
            PortfolioRecommendation,
            r#"
            INSERT INTO portfolio_recommendations (
                user_id, recommendation_type, asset_allocations, cash_ratio,
                crypto_ratio, confidence_score, reasoning, zkml_proof_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, user_id, recommendation_type as "recommendation_type: RecommendationType",
                      asset_allocations, cash_ratio, crypto_ratio, confidence_score,
                      reasoning, zkml_proof_id, is_executed, created_at, executed_at
            "#,
            user_id,
            recommendation_type as RecommendationType,
            asset_allocations,
            cash_ratio,
            crypto_ratio,
            confidence_score,
            reasoning,
            zkml_proof_id
        )
        .fetch_one(pool)
        .await?;

        Ok(recommendation)
    }

    /// Get recommendations for a user
    pub async fn find_by_user_id(pool: &PgPool, user_id: Uuid, limit: i64, offset: i64) -> Result<Vec<PortfolioRecommendation>> {
        let recommendations = sqlx::query_as!(
            PortfolioRecommendation,
            r#"
            SELECT id, user_id, recommendation_type as "recommendation_type: RecommendationType",
                   asset_allocations, cash_ratio, crypto_ratio, confidence_score,
                   reasoning, zkml_proof_id, is_executed, created_at, executed_at
            FROM portfolio_recommendations
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            "#,
            user_id,
            limit,
            offset
        )
        .fetch_all(pool)
        .await?;

        Ok(recommendations)
    }

    /// Mark recommendation as executed
    pub async fn mark_executed(pool: &PgPool, recommendation_id: Uuid) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE portfolio_recommendations
            SET is_executed = true, executed_at = NOW()
            WHERE id = $1
            "#,
            recommendation_id
        )
        .execute(pool)
        .await?;

        Ok(())
    }
}

/// User session queries
pub struct UserSessionQueries;

impl UserSessionQueries {
    /// Create a new session
    pub async fn create(
        pool: &PgPool,
        user_id: Uuid,
        refresh_token_hash: &str,
        expires_at: DateTime<Utc>,
        user_agent: Option<&str>,
        ip_address: Option<ipnetwork::IpNetwork>,
    ) -> Result<UserSession> {
        let session = sqlx::query_as!(
            UserSession,
            r#"
            INSERT INTO user_sessions (
                user_id, refresh_token_hash, expires_at, user_agent, ip_address
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, refresh_token_hash, expires_at,
                      created_at, last_used_at, user_agent, ip_address
            "#,
            user_id,
            refresh_token_hash,
            expires_at,
            user_agent,
            ip_address
        )
        .fetch_one(pool)
        .await?;

        Ok(session)
    }

    /// Find session by refresh token hash
    pub async fn find_by_token_hash(pool: &PgPool, token_hash: &str) -> Result<Option<UserSession>> {
        let session = sqlx::query_as!(
            UserSession,
            r#"
            SELECT id, user_id, refresh_token_hash, expires_at,
                   created_at, last_used_at, user_agent, ip_address
            FROM user_sessions
            WHERE refresh_token_hash = $1 AND expires_at > NOW()
            "#,
            token_hash
        )
        .fetch_optional(pool)
        .await?;

        Ok(session)
    }

    /// Update session last used
    pub async fn update_last_used(pool: &PgPool, session_id: Uuid) -> Result<()> {
        sqlx::query!(
            r#"
            UPDATE user_sessions
            SET last_used_at = NOW()
            WHERE id = $1
            "#,
            session_id
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Delete session
    pub async fn delete(pool: &PgPool, session_id: Uuid) -> Result<()> {
        sqlx::query!(
            r#"
            DELETE FROM user_sessions
            WHERE id = $1
            "#,
            session_id
        )
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Clean up expired sessions
    pub async fn cleanup_expired(pool: &PgPool) -> Result<u64> {
        let result = sqlx::query!(
            r#"
            DELETE FROM user_sessions
            WHERE expires_at <= NOW()
            "#
        )
        .execute(pool)
        .await?;

        Ok(result.rows_affected())
    }
}

//! Transaction service

use crate::{
    api::AppState,
    db::{models::*, queries::*},
    error::{Error, Result},
    services::wallet::WalletService,
};
use std::sync::Arc;
use uuid::Uuid;

pub struct TransactionService {
    state: Arc<AppState>,
}

impl TransactionService {
    pub fn new(state: Arc<AppState>) -> Self {
        Self { state }
    }

    /// Create a new transaction
    pub async fn create_transaction(
        &self,
        user_id: Uuid,
        transaction_data: CreateTransaction,
    ) -> Result<Transaction> {
        // Validate the wallet belongs to the user
        let wallet_service = WalletService::new(self.state.clone());
        let _wallet = wallet_service.get_wallet(transaction_data.wallet_id, user_id).await?;

        // Validate transaction data
        self.validate_transaction_data(&transaction_data)?;

        // Create the transaction
        let transaction = TransactionQueries::create(self.state.db.pool(), &transaction_data).await?;

        Ok(transaction)
    }

    /// Get transactions for a wallet
    pub async fn get_wallet_transactions(
        &self,
        wallet_id: Uuid,
        user_id: Uuid,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<Transaction>> {
        // Validate the wallet belongs to the user
        let wallet_service = WalletService::new(self.state.clone());
        let _wallet = wallet_service.get_wallet(wallet_id, user_id).await?;

        // Get transactions
        let transactions = TransactionQueries::find_by_wallet_id(self.state.db.pool(), wallet_id, limit, offset).await?;

        Ok(transactions)
    }

    /// Get a specific transaction
    pub async fn get_transaction(&self, transaction_id: Uuid, user_id: Uuid) -> Result<Transaction> {
        let transaction = TransactionQueries::find_by_id(self.state.db.pool(), transaction_id).await?
            .ok_or(Error::NotFound)?;

        // Verify the transaction's wallet belongs to the user
        let wallet_service = WalletService::new(self.state.clone());
        let _wallet = wallet_service.get_wallet(transaction.wallet_id, user_id).await?;

        Ok(transaction)
    }

    /// Update transaction status (typically called by blockchain monitoring)
    pub async fn update_transaction_status(
        &self,
        transaction_id: Uuid,
        status: TransactionStatus,
        transaction_hash: Option<&str>,
        block_number: Option<i64>,
        fee: Option<&str>,
        error_message: Option<&str>,
    ) -> Result<Transaction> {
        let transaction = TransactionQueries::update_status(
            self.state.db.pool(),
            transaction_id,
            status,
            transaction_hash,
            block_number,
            fee,
            error_message,
        ).await?;

        Ok(transaction)
    }

    /// Get pending transactions (for blockchain monitoring)
    pub async fn get_pending_transactions(&self) -> Result<Vec<Transaction>> {
        let transactions = TransactionQueries::find_pending(self.state.db.pool()).await?;
        Ok(transactions)
    }

    /// Submit transaction to blockchain using Solana client
    pub async fn submit_transaction(&self, transaction_id: Uuid) -> Result<String> {
        let transaction = TransactionQueries::find_by_id(self.state.db.pool(), transaction_id).await?
            .ok_or(Error::NotFound)?;

        // Ensure we have raw transaction data
        let raw_transaction = transaction.raw_transaction
            .ok_or(Error::BadRequest("No raw transaction data available".to_string()))?;

        // Submit to Solana blockchain
        let result = self.state.solana_client.submit_transaction(&raw_transaction).await?;

        // Update transaction with blockchain result
        self.update_transaction_status(
            transaction_id,
            TransactionStatus::Pending,
            Some(&result.signature),
            Some(result.slot as i64),
            None,
            None,
        ).await?;

        Ok(result.signature)
    }

    /// Estimate transaction fee using Solana client
    pub async fn estimate_fee(&self, transaction_data: &CreateTransaction) -> Result<TransactionFeeEstimate> {
        // Ensure we have raw transaction data for fee estimation
        let raw_transaction = transaction_data.raw_transaction
            .as_ref()
            .ok_or(Error::BadRequest("Raw transaction data required for fee estimation".to_string()))?;

        // Get fee estimate from Solana
        let fee_estimate = self.state.solana_client.estimate_fee(raw_transaction).await?;

        Ok(TransactionFeeEstimate {
            base_fee: fee_estimate.fee_sol.to_string(),
            priority_fee: "0.0".to_string(), // Solana doesn't have separate priority fees like Ethereum
            total_fee: fee_estimate.fee_sol.to_string(),
            fee_currency: "SOL".to_string(),
        })
    }

    /// Monitor and update transaction status from blockchain
    pub async fn monitor_transaction(&self, transaction_id: Uuid) -> Result<Transaction> {
        let transaction = TransactionQueries::find_by_id(self.state.db.pool(), transaction_id).await?
            .ok_or(Error::NotFound)?;

        // Only monitor transactions that have been submitted
        if let Some(tx_hash) = &transaction.transaction_hash {
            // Check status on Solana blockchain
            if let Some(result) = self.state.solana_client.get_transaction_status(tx_hash).await? {
                // Update transaction status based on blockchain result
                let updated_transaction = self.update_transaction_status(
                    transaction_id,
                    TransactionStatus::Confirmed,
                    Some(&result.signature),
                    Some(result.slot as i64),
                    None,
                    None,
                ).await?;

                return Ok(updated_transaction);
            }
        }

        Ok(transaction)
    }

    /// Validate transaction data
    fn validate_transaction_data(&self, transaction_data: &CreateTransaction) -> Result<()> {
        // Validate addresses
        if transaction_data.from_address.trim().is_empty() {
            return Err(Error::Validation("From address cannot be empty".to_string()));
        }

        if transaction_data.to_address.trim().is_empty() {
            return Err(Error::Validation("To address cannot be empty".to_string()));
        }

        // Validate amount
        if let Err(_) = transaction_data.amount.parse::<f64>() {
            return Err(Error::Validation("Invalid amount format".to_string()));
        }

        let amount: f64 = transaction_data.amount.parse().unwrap();
        if amount <= 0.0 {
            return Err(Error::Validation("Amount must be greater than zero".to_string()));
        }

        // Validate transaction type specific requirements
        match transaction_data.transaction_type {
            TransactionType::Send | TransactionType::Receive => {
                // Basic validation already done
            }
            TransactionType::Swap => {
                if transaction_data.token_mint.is_none() {
                    return Err(Error::Validation("Token mint required for swap transactions".to_string()));
                }
            }
            TransactionType::Stake | TransactionType::Unstake => {
                // Additional validation for staking transactions
                if amount < 0.001 {
                    return Err(Error::Validation("Minimum stake amount is 0.001 SOL".to_string()));
                }
            }
            TransactionType::ContractInteraction => {
                if transaction_data.raw_transaction.is_none() {
                    return Err(Error::Validation("Raw transaction data required for contract interactions".to_string()));
                }
            }
        }

        Ok(())
    }

    /// Get transaction history with analytics
    pub async fn get_transaction_analytics(
        &self,
        user_id: Uuid,
        wallet_id: Option<Uuid>,
        days: i32,
    ) -> Result<TransactionAnalytics> {
        // TODO: Implement comprehensive transaction analytics
        // For now, return mock data
        Ok(TransactionAnalytics {
            total_transactions: 0,
            total_volume: "0.0".to_string(),
            total_fees: "0.0".to_string(),
            success_rate: 100.0,
            average_confirmation_time: 0,
            transaction_types: vec![],
        })
    }
}

/// Transaction fee estimate
#[derive(Debug, serde::Serialize)]
pub struct TransactionFeeEstimate {
    pub base_fee: String,
    pub priority_fee: String,
    pub total_fee: String,
    pub fee_currency: String,
}

/// Transaction analytics
#[derive(Debug, serde::Serialize)]
pub struct TransactionAnalytics {
    pub total_transactions: i64,
    pub total_volume: String,
    pub total_fees: String,
    pub success_rate: f64,
    pub average_confirmation_time: i64, // in seconds
    pub transaction_types: Vec<TransactionTypeCount>,
}

/// Transaction type count for analytics
#[derive(Debug, serde::Serialize)]
pub struct TransactionTypeCount {
    pub transaction_type: TransactionType,
    pub count: i64,
    pub volume: String,
}

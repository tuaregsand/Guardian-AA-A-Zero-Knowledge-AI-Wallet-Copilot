-- Guardian-AA Initial Database Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom enum types
CREATE TYPE wallet_type AS ENUM ('solana', 'ethereum', 'bitcoin', 'watch_only');
CREATE TYPE transaction_type AS ENUM ('send', 'receive', 'swap', 'stake', 'unstake', 'contract_interaction');
CREATE TYPE transaction_status AS ENUM ('pending', 'confirmed', 'failed', 'cancelled');
CREATE TYPE agent_type AS ENUM ('news_sentiment', 'market_factor', 'technical_analysis', 'crypto_factor', 'ensemble');
CREATE TYPE prediction_type AS ENUM ('bullish', 'bearish', 'neutral');
CREATE TYPE proof_type AS ENUM ('agent_proof', 'recursive_proof', 'final_proof');
CREATE TYPE recommendation_type AS ENUM ('rebalance', 'buy', 'sell', 'hold');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- Create index on email for fast lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    wallet_type wallet_type NOT NULL,
    public_key VARCHAR(255) NOT NULL,
    encrypted_private_key TEXT, -- NULL for watch-only wallets
    derivation_path VARCHAR(255), -- For HD wallets
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for wallets
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_public_key ON wallets(public_key);
CREATE INDEX idx_wallets_active ON wallets(is_active);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    transaction_hash VARCHAR(255), -- NULL until confirmed
    transaction_type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'pending',
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    amount VARCHAR(50) NOT NULL, -- Using string to avoid precision issues
    token_mint VARCHAR(255), -- For SPL tokens
    fee VARCHAR(50),
    block_number BIGINT,
    confirmation_count INTEGER NOT NULL DEFAULT 0,
    raw_transaction TEXT, -- Serialized transaction data
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ
);

-- Create indexes for transactions
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_from_address ON transactions(from_address);
CREATE INDEX idx_transactions_to_address ON transactions(to_address);

-- Agents table
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    agent_type agent_type NOT NULL,
    description TEXT NOT NULL,
    model_version VARCHAR(100) NOT NULL,
    circuit_hash VARCHAR(64), -- SHA-256 hash of the ZK circuit
    is_active BOOLEAN NOT NULL DEFAULT true,
    confidence_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for agents
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_active ON agents(is_active);
CREATE UNIQUE INDEX idx_agents_name_version ON agents(name, model_version);

-- Agent predictions table
CREATE TABLE agent_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(20) NOT NULL,
    prediction prediction_type NOT NULL,
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    explanation_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of explanation
    explanation_text TEXT NOT NULL, -- Off-chain explanation
    data_sources JSONB NOT NULL DEFAULT '[]', -- Array of data source URLs/hashes
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Create indexes for agent predictions
CREATE INDEX idx_agent_predictions_agent_id ON agent_predictions(agent_id);
CREATE INDEX idx_agent_predictions_user_id ON agent_predictions(user_id);
CREATE INDEX idx_agent_predictions_asset ON agent_predictions(asset_symbol);
CREATE INDEX idx_agent_predictions_created_at ON agent_predictions(created_at);
CREATE INDEX idx_agent_predictions_expires_at ON agent_predictions(expires_at);

-- ZKML Proofs table
CREATE TABLE zkml_proofs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID NOT NULL REFERENCES agent_predictions(id) ON DELETE CASCADE,
    proof_type proof_type NOT NULL,
    proof_data TEXT NOT NULL, -- Base64 encoded proof
    public_inputs JSONB NOT NULL, -- JSON of public inputs
    verification_key_hash VARCHAR(64) NOT NULL,
    circuit_hash VARCHAR(64) NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_gas_cost BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);

-- Create indexes for ZKML proofs
CREATE INDEX idx_zkml_proofs_prediction_id ON zkml_proofs(prediction_id);
CREATE INDEX idx_zkml_proofs_type ON zkml_proofs(proof_type);
CREATE INDEX idx_zkml_proofs_verified ON zkml_proofs(is_verified);
CREATE INDEX idx_zkml_proofs_circuit_hash ON zkml_proofs(circuit_hash);

-- Portfolio recommendations table
CREATE TABLE portfolio_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type recommendation_type NOT NULL,
    asset_allocations JSONB NOT NULL, -- JSON of asset -> percentage mappings
    cash_ratio DOUBLE PRECISION NOT NULL CHECK (cash_ratio >= 0.0 AND cash_ratio <= 1.0),
    crypto_ratio DOUBLE PRECISION NOT NULL CHECK (crypto_ratio >= 0.0 AND crypto_ratio <= 1.0),
    confidence_score DOUBLE PRECISION NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    reasoning TEXT NOT NULL,
    zkml_proof_id UUID REFERENCES zkml_proofs(id),
    is_executed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    executed_at TIMESTAMPTZ
);

-- Create indexes for portfolio recommendations
CREATE INDEX idx_portfolio_recommendations_user_id ON portfolio_recommendations(user_id);
CREATE INDEX idx_portfolio_recommendations_type ON portfolio_recommendations(recommendation_type);
CREATE INDEX idx_portfolio_recommendations_executed ON portfolio_recommendations(is_executed);
CREATE INDEX idx_portfolio_recommendations_created_at ON portfolio_recommendations(created_at);

-- User sessions table for JWT token management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_agent TEXT,
    ip_address INET
);

-- Create indexes for user sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(refresh_token_hash);

-- API keys table for external integrations
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]', -- Array of permissions
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for API keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active);

-- Add constraint to ensure cash_ratio + crypto_ratio <= 1.0
ALTER TABLE portfolio_recommendations 
ADD CONSTRAINT check_ratio_sum 
CHECK (cash_ratio + crypto_ratio <= 1.0);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default agents based on the research paper
INSERT INTO agents (name, agent_type, description, model_version, confidence_threshold) VALUES
('News Sentiment Analyzer', 'news_sentiment', 'BERT-style classifier for financial news sentiment analysis', '1.0.0', 0.6),
('Market Factor Analyzer', 'market_factor', 'MLP model for traditional market factor analysis', '1.0.0', 0.5),
('Technical Analysis Agent', 'technical_analysis', 'CNN model for candlestick chart pattern recognition', '1.0.0', 0.7),
('Crypto Factor Analyzer', 'crypto_factor', 'Specialized model for cryptocurrency-specific factors', '1.0.0', 0.5),
('Ensemble Aggregator', 'ensemble', 'Meta-agent that combines predictions from other agents', '1.0.0', 0.8); 
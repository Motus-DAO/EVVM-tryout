-- EVVM Relayer Database Schema

-- Transactions table - stores all submitted transactions
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE,
    user_address VARCHAR(42) NOT NULL,
    contract_address VARCHAR(42) NOT NULL,
    function_name VARCHAR(100) NOT NULL,
    args JSONB NOT NULL,
    signature TEXT NOT NULL,
    nonce BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed', 'rejected')),
    signer_address VARCHAR(42),
    gas_used BIGINT,
    gas_price BIGINT,
    block_number BIGINT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    submitted_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- User nonces table - tracks nonce per user to prevent replay attacks
CREATE TABLE IF NOT EXISTS user_nonces (
    user_address VARCHAR(42) PRIMARY KEY,
    current_nonce BIGINT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Signers table - manages relayer signers
CREATE TABLE IF NOT EXISTS signers (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    balance_wei NUMERIC(78, 0) DEFAULT 0,
    min_balance_wei NUMERIC(78, 0) DEFAULT 1000000000000000000, -- 1 CELO default
    last_balance_check TIMESTAMP,
    last_used_at TIMESTAMP,
    total_transactions INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transaction logs table - for debugging and analytics
CREATE TABLE IF NOT EXISTS transaction_logs (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_address ON transactions(user_address);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_signers_is_active ON signers(is_active);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_transaction_id ON transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_created_at ON transaction_logs(created_at);

-- Unique constraint for user nonce tracking
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_nonces_user_address ON user_nonces(user_address);



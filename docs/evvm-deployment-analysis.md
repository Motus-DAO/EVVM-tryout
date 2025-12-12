# EVVM Deployment & Registration - Deep Analysis

## 📊 Current Status

### Deployed Contracts (Celo Sepolia - Chain ID: 11142220)

From latest deployment artifacts (`Testnet-Contracts/broadcast/DeployTestnet.s.sol/11142220/`):

| Contract | Address | Status |
|----------|----------|--------|
| **Evvm Core** | `0xfc99769602914d649144f6b2397e2aa528b2878d` | ✅ Deployed |
| **Staking** | `0xa745033cf66ecf511c1c35088af5ca8d52472f03` | ✅ Deployed |
| **Estimator** | `0xe758589b86575fa1b817d4d185434377c8c54806` | ✅ Deployed |
| **NameService** | `0x4abc307561aa887cc92d69a8dda40aa1ad83dd0c` | ✅ Deployed |
| **Treasury** | `0xae7c0723e9297c47d0a5dc06f9f0b244c63a17c5` | ✅ Deployed |
| **P2PSwap** | `0x6aafa9b2fd8452c9edae4eee1a98b8a2a3e93d95` | ✅ Deployed |

### Configuration
- **Admin**: `0x64608c2d5e4685830348e9155bab423bf905e9c9`
- **Golden Fisher**: `0x64608C2d5E4685830348e9155bAB423bf905E9c9`
- **Activator**: `0x64608C2d5E4685830348e9155bAB423bf905E9c9`

### Previous Deployment (from docs)
- **Evvm Core**: `0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537` (EVVM ID: 1047)
- This appears to be an older deployment

## 🎯 What Needs to Be Done

### Phase 1: Verify & Register EVVM ✅ REQUIRED

**Current Status**: Need to check if EVVM is registered with Registry EVVM on Ethereum Sepolia

**Steps Required**:

1. **Check Registration Status**
   ```bash
   cd Testnet-Contracts
   # Check if EVVM ID is already set
   cast call 0xfc99769602914d649144f6b2397e2aa528b2878d "getEvvmID()" --rpc-url https://forno.celo-sepolia.celo-testnet.org
   ```

2. **Register with Registry EVVM** (if not registered)
   - **Registry Contract**: `0x389dC8fb09211bbDA841D59f4a51160dA2377832`
   - **Network**: Ethereum Sepolia (Chain ID: 11155111)
   - **Required**: ETH Sepolia tokens for gas fees
   
   ```bash
   # Set environment variables in Testnet-Contracts/.env
   PRIVATE_KEY=your_private_key
   RPC_URL_ETH_SEPOLIA=https://rpc.sepolia.org
   
   # Register
   tsx scripts/register-evvm.ts 0xfc99769602914d649144f6b2397e2aa528b2878d 11142220
   ```

3. **Set EVVM ID** (within 1 hour of registration!)
   ```bash
   tsx scripts/set-evvm-id.ts 0xfc99769602914d649144f6b2397e2aa528b2878d <evvm-id> celo
   ```

### Phase 2: Relayer Infrastructure Setup 🔧 CRITICAL

**What is a Relayer (Fisher)?**

In EVVM terminology, a "Fisher" is a relayer that:
- Receives signed transactions from users (off-chain)
- Submits them to the EVVM contracts (on-chain)
- Pays gas fees on behalf of users
- Can earn rewards if staking

**Why Database is Needed**:

1. **Transaction Queue Management**
   - Store pending transactions
   - Track transaction status (pending, submitted, confirmed, failed)
   - Prevent duplicate submissions
   - Handle retries for failed transactions

2. **Nonce Management**
   - Track user nonces to prevent replay attacks
   - Ensure transactions are processed in order
   - Handle concurrent requests

3. **Signer Management**
   - Store relayer wallet information securely
   - Manage multiple signers for load balancing
   - Track signer balances and gas availability
   - Rotate signers when needed

4. **Analytics & Monitoring**
   - Track transaction success rates
   - Monitor gas costs
   - Track user activity
   - Performance metrics

**Architecture Overview**:

```
┌─────────────┐
│   Frontend  │
│  (User)     │
└──────┬──────┘
       │ 1. User signs transaction (EIP-191)
       │ 2. Sends to relayer API
       ▼
┌─────────────────────────────────────┐
│      Relayer Service (API)          │
│  ┌──────────────────────────────┐  │
│  │  Express.js / Fastify Server  │  │
│  └──────────────────────────────┘  │
│           │                         │
│           ▼                         │
│  ┌──────────────────────────────┐  │
│  │     Database (PostgreSQL)    │  │
│  │  - Transaction Queue          │  │
│  │  - Nonce Tracking             │  │
│  │  - Signer Management          │  │
│  │  - Analytics                  │  │
│  └──────────────────────────────┘  │
│           │                         │
│           ▼                         │
│  ┌──────────────────────────────┐  │
│  │   Transaction Processor      │  │
│  │  - Validates signatures       │  │
│  │  - Checks nonces              │  │
│  │  - Manages queue              │  │
│  └──────────────────────────────┘  │
│           │                         │
│           ▼                         │
│  ┌──────────────────────────────┐  │
│  │   Signer Manager              │  │
│  │  - Manages wallet signers     │  │
│  │  - Checks balances            │  │
│  │  - Submits transactions       │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
       │ 3. Submit to blockchain
       ▼
┌─────────────────────────────────────┐
│      EVVM Contracts                 │
│      (Celo Sepolia)                 │
└─────────────────────────────────────┘
```

### Phase 3: Signer Management System 🔐

**Requirements**:

1. **Secure Storage**
   - Private keys should NEVER be stored in plain text
   - Use environment variables or secure key management (AWS KMS, HashiCorp Vault)
   - For development: Use `.env` with restricted permissions

2. **Signer Pool**
   - Multiple signers for redundancy
   - Load balancing across signers
   - Automatic failover if one signer runs out of gas

3. **Balance Monitoring**
   - Monitor CELO balance for each signer
   - Alert when balance is low
   - Auto-pause when balance is insufficient

4. **Nonce Management**
   - Track nonce per signer
   - Handle concurrent transactions
   - Prevent nonce conflicts

**Implementation Strategy**:

```typescript
// Signer Manager
class SignerManager {
  private signers: ethers.Wallet[];
  private currentSignerIndex: number;
  
  // Round-robin selection
  getNextSigner(): ethers.Wallet {
    // Select signer with sufficient balance
    // Rotate to next signer
  }
  
  // Check if signer has enough balance
  async hasSufficientBalance(signer: ethers.Wallet): Promise<boolean> {
    const balance = await signer.provider.getBalance(signer.address);
    return balance > MIN_BALANCE_THRESHOLD;
  }
}
```

### Phase 4: Database Schema Design 📊

**Tables Needed**:

1. **transactions**
   ```sql
   CREATE TABLE transactions (
     id SERIAL PRIMARY KEY,
     tx_hash VARCHAR(66) UNIQUE,
     user_address VARCHAR(42) NOT NULL,
     contract_address VARCHAR(42) NOT NULL,
     function_name VARCHAR(100) NOT NULL,
     args JSONB NOT NULL,
     signature TEXT NOT NULL,
     nonce BIGINT NOT NULL,
     status VARCHAR(20) DEFAULT 'pending',
     signer_address VARCHAR(42),
     gas_used BIGINT,
     gas_price BIGINT,
     created_at TIMESTAMP DEFAULT NOW(),
     submitted_at TIMESTAMP,
     confirmed_at TIMESTAMP,
     error_message TEXT
   );
   ```

2. **user_nonces**
   ```sql
   CREATE TABLE user_nonces (
     user_address VARCHAR(42) PRIMARY KEY,
     current_nonce BIGINT NOT NULL DEFAULT 0,
     last_updated TIMESTAMP DEFAULT NOW()
   );
   ```

3. **signers**
   ```sql
   CREATE TABLE signers (
     id SERIAL PRIMARY KEY,
     address VARCHAR(42) UNIQUE NOT NULL,
     name VARCHAR(100),
     is_active BOOLEAN DEFAULT true,
     balance_wei NUMERIC(78, 0),
     last_balance_check TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. **transaction_logs**
   ```sql
   CREATE TABLE transaction_logs (
     id SERIAL PRIMARY KEY,
     transaction_id INTEGER REFERENCES transactions(id),
     log_level VARCHAR(20),
     message TEXT,
     metadata JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

## 🚀 Implementation Plan

### Step 1: Check Current Registration Status
- [ ] Query EVVM contract for EVVM ID
- [ ] Check Registry EVVM on Ethereum Sepolia
- [ ] Determine if registration is needed

### Step 2: Register EVVM (if needed)
- [ ] Get ETH Sepolia tokens
- [ ] Set up environment variables
- [ ] Run registration script
- [ ] Set EVVM ID within 1 hour

### Step 3: Set Up Database
- [ ] Choose database (PostgreSQL recommended)
- [ ] Create schema
- [ ] Set up connection pooling
- [ ] Create migration scripts

### Step 4: Build Relayer Service
- [ ] Create Express.js/Fastify server
- [ ] Implement transaction queue
- [ ] Add signature validation
- [ ] Implement nonce management
- [ ] Add signer management

### Step 5: Deploy Relayer
- [ ] Set up hosting (Railway, Render, AWS, etc.)
- [ ] Configure environment variables
- [ ] Set up monitoring
- [ ] Test end-to-end flow

## 🔑 Key Considerations

### Security
- **Never expose private keys** in code or logs
- Use **HTTPS** for all API endpoints
- Implement **rate limiting** to prevent abuse
- Validate all signatures before processing
- Use **nonce validation** to prevent replay attacks

### Performance
- Use **connection pooling** for database
- Implement **transaction batching** when possible
- Use **queue system** (Redis/Bull) for high throughput
- Monitor **gas prices** and adjust accordingly

### Reliability
- Implement **retry logic** for failed transactions
- Use **health checks** for monitoring
- Set up **alerts** for low balances or errors
- Implement **circuit breakers** for external services

### Cost Management
- Monitor **gas costs** per transaction
- Set **maximum gas price** limits
- Implement **user limits** to prevent abuse
- Consider **staking** to become a Fisher and earn rewards

## 📝 Next Steps

1. **Immediate**: Check registration status and register if needed
2. **Short-term**: Set up database and basic relayer service
3. **Medium-term**: Add monitoring, analytics, and optimization
4. **Long-term**: Scale to handle production load, add staking

## 🔗 Resources

- [EVVM Documentation](https://www.evvm.info/docs/intro)
- [EIP-191: Signed Data Standard](https://eips.ethereum.org/EIPS/eip-191)
- [EIP-712: Typed Data Signing](https://eips.ethereum.org/EIPS/eip-712)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)



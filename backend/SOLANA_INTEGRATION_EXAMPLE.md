# Guardian-AA Backend with Solana Integration - Usage Example

This document demonstrates how to use the Guardian-AA backend with real Solana blockchain integration.

## 🚀 **Quick Start**

### 1. Start the Backend Server

```bash
cd backend
cargo run
```

You should see:
```
✅ Solana RPC connection established
Server listening on 127.0.0.1:8080
```

### 2. Register a User

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

### 3. Create a Solana Wallet

```bash
curl -X POST http://localhost:8080/api/v1/wallet/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Solana Wallet",
    "wallet_type": "solana",
    "public_key": "11111111111111111111111111111111"
  }'
```

Response:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "My Solana Wallet",
  "wallet_type": "solana",
  "public_key": "11111111111111111111111111111111",
  "is_active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### 4. Get Real Solana Balance

```bash
curl -X GET http://localhost:8080/api/v1/wallet/550e8400-e29b-41d4-a716-446655440000/balance \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response:
```json
{
  "wallet_id": "550e8400-e29b-41d4-a716-446655440000",
  "sol_balance": "1.5",
  "token_balances": [],
  "last_updated": "2024-01-01T00:00:00Z"
}
```

## 🔗 **Solana Integration Features**

1. **Real SOL Balance Fetching**
   - Connects to Solana devnet/mainnet
   - Fetches actual SOL balances from blockchain
   - Validates Solana addresses

2. **Transaction Fee Estimation**
   - Real fee calculation using Solana RPC
   - Based on actual transaction size and network conditions

3. **Transaction Submission**
   - Submit transactions to Solana network
   - Get real transaction signatures and confirmation

4. **Address Validation**
   - Validates Solana public key format
   - Prevents invalid addresses

5. **Network Health Monitoring**
   - Health checks for Solana RPC connection
   - Network version information

###  **Configuration**

The backend connects to Solana using these environment variables:

```env
GUARDIAN_BLOCKCHAIN__SOLANA_RPC_URL=https://api.devnet.solana.com
GUARDIAN_BLOCKCHAIN__COMMITMENT=confirmed
```

For mainnet:
```env
GUARDIAN_BLOCKCHAIN__SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

## 📊 **API Endpoints with Solana Integration**

### Wallet Balance (Real Blockchain Data)
```bash
GET /api/v1/wallet/{wallet_id}/balance
Authorization: Bearer {token}
```

### Transaction Fee Estimation (Real Solana Fees)
```bash
POST /api/v1/transaction/estimate-fee
Authorization: Bearer {token}
Content-Type: application/json

{
  "wallet_id": "uuid",
  "transaction_type": "send",
  "from_address": "solana_address",
  "to_address": "solana_address", 
  "amount": "1.0",
  "raw_transaction": "base64_encoded_transaction"
}
```

### Submit Transaction (Real Blockchain Submission)
```bash
POST /api/v1/transaction/{transaction_id}/submit
Authorization: Bearer {token}
```

## 🧪 **Testing with Real Solana Addresses**

### Test with a Real Devnet Address

1. **Get a devnet address with SOL:**
   - Visit https://faucet.solana.com/
   - Request devnet SOL for testing

2. **Create wallet with real address:**
```bash
curl -X POST http://localhost:8080/api/v1/wallet/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Devnet Wallet",
    "wallet_type": "solana",
    "public_key": "YOUR_REAL_DEVNET_ADDRESS"
  }'
```

3. **Check real balance:**
```bash
curl -X GET http://localhost:8080/api/v1/wallet/{wallet_id}/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔐 **Security Features**

1. **JWT Authentication Required**
   - All wallet operations require valid JWT tokens
   - User isolation - users can only access their own wallets

2. **Address Validation**
   - Validates Solana address format before blockchain calls
   - Prevents invalid RPC requests

3. **Error Handling**
   - Graceful handling of network failures
   - Proper error messages for blockchain issues

## 🚀 **Next Steps**

The Solana integration provides a solid foundation. Future enhancements:

1. **SPL Token Support** - Parse and display SPL token balances
2. **Transaction Building** - Help users build valid Solana transactions
3. **Staking Integration** - Support for Solana staking operations
4. **NFT Support** - Display and manage Solana NFTs
5. **DeFi Integration** - Connect with Solana DeFi protocols

## 📝 **Example Full Workflow**

```bash
# 1. Register user
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | \
  jq -r '.access_token')

# 2. Create Solana wallet
WALLET_ID=$(curl -s -X POST http://localhost:8080/api/v1/wallet/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Solana Wallet",
    "wallet_type": "solana",
    "public_key": "11111111111111111111111111111111"
  }' | jq -r '.id')

# 3. Get real balance from Solana blockchain
curl -X GET http://localhost:8080/api/v1/wallet/$WALLET_ID/balance \
  -H "Authorization: Bearer $TOKEN"
```
# Motus Relayer Service

EVVM Relayer Service for processing gasless transactions on the Motus Network.

## Features

- ✅ Transaction queue management with PostgreSQL
- ✅ Signature validation (EIP-191/EIP-712)
- ✅ Nonce management to prevent replay attacks
- ✅ Multi-signer support with load balancing
- ✅ Automatic balance monitoring
- ✅ Transaction status tracking
- ✅ RESTful API for frontend integration

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- CELO tokens for relayer signers (on Celo Sepolia)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb motus_relayer

# Or using psql
psql -U postgres -c "CREATE DATABASE motus_relayer;"
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
# IMPORTANT: Add your relayer private key(s)
```

### 4. Run Migrations

```bash
npm run migrate
```

This will create all necessary database tables.

### 5. Start Relayer Service

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_HOST` | PostgreSQL host | Yes |
| `DB_PORT` | PostgreSQL port | Yes |
| `DB_NAME` | Database name | Yes |
| `DB_USER` | Database user | Yes |
| `DB_PASSWORD` | Database password | Yes |
| `RPC_URL` | Celo Sepolia RPC URL | Yes |
| `RELAYER_PRIVATE_KEY` | Relayer wallet private key | Yes |
| `MIN_BALANCE_WEI` | Minimum balance threshold | No (default: 1 CELO) |
| `PORT` | Server port | No (default: 3001) |

## API Endpoints

### Health Check
```
GET /health
```

### Submit Transaction
```
POST /api/submit
Content-Type: application/json

{
  "userAddress": "0x...",
  "contractAddress": "0x...",
  "functionName": "registerGasless",
  "args": [...],
  "signature": "0x...",
  "nonce": "123"
}
```

### Check Transaction Status
```
GET /api/transaction/:txHash
```

### Get User Transactions
```
GET /api/user/:address/transactions?limit=50
```

### Get Signer Status
```
GET /api/signers
```

## Security Considerations

1. **Private Keys**: Never commit private keys to version control
2. **Environment Variables**: Use secure secret management in production
3. **Rate Limiting**: Already implemented (100 requests per 15 minutes per IP)
4. **HTTPS**: Always use HTTPS in production
5. **Database**: Use strong passwords and restrict access

## Database Schema

The relayer uses the following main tables:

- `transactions` - All submitted transactions
- `user_nonces` - Nonce tracking per user
- `signers` - Relayer signer management
- `transaction_logs` - Debugging and analytics

See `src/db/schema.sql` for full schema.

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run migrations
npm run migrate
```

## Production Deployment

1. Set up PostgreSQL database (AWS RDS, Railway, etc.)
2. Configure environment variables
3. Run migrations
4. Deploy service (Railway, Render, AWS, etc.)
5. Set up monitoring and alerts
6. Monitor signer balances

## Monitoring

- Check `/health` endpoint regularly
- Monitor signer balances via `/api/signers`
- Set up alerts for low balances
- Monitor transaction success rates

## Troubleshooting

### "No signer available"
- Check signer balances: `GET /api/signers`
- Ensure signers have sufficient CELO
- Check `MIN_BALANCE_WEI` setting

### Database connection errors
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists

### Transaction failures
- Check transaction logs in database
- Verify signatures are valid
- Check nonce values
- Ensure contract addresses are correct

## Next Steps

1. Integrate with frontend
2. Add more robust error handling
3. Implement transaction retry logic
4. Add analytics dashboard
5. Set up monitoring and alerts



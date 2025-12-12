# Enabling Gasless Transactions

If you see "ℹ️ EVVM not configured" in the frontend, you need to configure EVVM on your deployed contract.

## Quick Setup

### 1. Configure EVVM on the Contract

Run the setup script to configure EVVM on your deployed MotusNameService contract:

```bash
# For Celo Sepolia testnet
npx hardhat run scripts/setup-evvm.ts --network celoSepolia

# For localhost
npx hardhat run scripts/setup-evvm.ts --network localhost
```

**Requirements:**
- `PRIVATE_KEY` environment variable set to the contract owner's private key
- `MOTUS_NAME_SERVICE_ADDRESS` environment variable set to your deployed contract address
- `EVVM_ADDRESS` environment variable set to your EVVM contract address

The script will:
1. Verify you're the contract owner
2. Set the EVVM address on the contract
3. Enable EVVM functionality
4. Verify the configuration

### 2. Start the Relayer Service

The relayer service submits transactions on behalf of users (paying gas fees):

```bash
cd relayer
npm install
npm run migrate  # Set up database (first time only)
npm start
```

**Requirements:**
- PostgreSQL database running
- `RELAYER_PRIVATE_KEY` environment variable set (relayer wallet with CELO tokens)
- `RPC_URL` environment variable set to your network RPC

### 3. Configure Frontend

Make sure your frontend `.env.local` has:

```bash
NEXT_PUBLIC_RELAYER_URL=http://localhost:3001  # or your deployed relayer URL
NEXT_PUBLIC_EVVM_ADDRESS=0x...  # Your EVVM contract address
NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS=0x...  # Your name service contract address
```

### 4. Verify Everything Works

1. **Check EVVM Status**: The frontend should show "Use EVVM Gasless Transaction" checkbox (auto-checked)
2. **Check Relayer**: The relayer should be running and healthy
3. **Test Registration**: 
   - Check the "Use EVVM Gasless Transaction" checkbox
   - Register a domain
   - You should see "Transaction submitted to relayer" (not direct transaction)
   - No gas fees should be charged to your wallet

## Troubleshooting

### "EVVM not configured" message
- Run `scripts/setup-evvm.ts` to configure EVVM on the contract
- Make sure you're using the contract owner's private key

### "Relayer is not available" error
- Make sure the relayer service is running
- Check `NEXT_PUBLIC_RELAYER_URL` matches your relayer URL
- Verify the relayer health endpoint is accessible

### Transaction still requires gas
- Make sure "Use EVVM Gasless Transaction" checkbox is checked
- Verify EVVM is enabled on the contract (run setup script)
- Check browser console for errors

### Relayer has no balance
- Fund the relayer wallet with CELO tokens
- The relayer needs CELO to pay gas fees for submitted transactions

## How It Works

1. **User Signs**: User signs the transaction data (service signature + EVVM payment signature)
2. **User Signs Request**: User signs a request to send to the relayer
3. **Frontend Sends**: Frontend sends signed transaction to relayer API
4. **Relayer Validates**: Relayer validates the user's signature
5. **Relayer Submits**: Relayer calls the contract function (relayer pays gas)
6. **Contract Validates**: Contract validates user's service signature and processes EVVM payment
7. **Complete**: Transaction completes - user paid in Principal Tokens, relayer paid gas

The user never pays gas fees directly - the relayer does!


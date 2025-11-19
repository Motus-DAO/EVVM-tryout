# Local Testing Guide

## Quick Start

### 1. Start Local Hardhat Node

In one terminal, start the Hardhat local blockchain:

```bash
npm run node
```

This will:
- Start a local blockchain on `http://localhost:8545`
- Provide 20 test accounts with 10,000 ETH each
- Show account addresses and private keys

### 2. Deploy Contracts Locally

In another terminal, deploy the contracts:

```bash
npm run deploy:local
```

This will:
- Deploy MotusNameService to localhost
- Save contract addresses to `frontend/.env.local`
- Print deployment information

### 3. Test Contracts

Run the test script:

```bash
npm run test:local
```

This will:
- Check name availability
- Calculate registration fees
- Register a test domain
- Verify domain information
- Check EVVM status

### 4. Start Frontend

In another terminal:

```bash
npm run frontend:dev
```

The frontend will:
- Connect to localhost:8545
- Use the deployed contract address
- Allow you to test the UI locally

## Testing Gasless Transactions Locally

### Option 1: Test Traditional Payments First

Traditional payments work without EVVM:
- Just call `register()` with `msg.value`
- No EVVM setup needed
- Good for testing basic functionality

### Option 2: Deploy EVVM Locally (Advanced)

For full gasless transaction testing:

1. **Deploy EVVM contracts locally** (from Testnet-Contracts):
   ```bash
   cd Testnet-Contracts
   make anvil  # Start local blockchain
   make deployTestnetAnvil  # Deploy EVVM contracts
   ```

2. **Set EVVM address in MotusNameService**:
   ```typescript
   await nameService.setEvvmAddress(evvmAddress);
   await nameService.setEvvmEnabled(true);
   ```

3. **Test gasless registration**:
   - Sign transaction off-chain
   - Submit via relayer (or call directly for testing)

## Local Network Configuration

**Hardhat Network:**
- Chain ID: 31337
- RPC URL: http://localhost:8545
- Currency: ETH (test tokens)

**Frontend Configuration:**
- Update `frontend/.env.local` with contract addresses
- Set `VITE_NETWORK=localhost`
- Set `VITE_CHAIN_ID=31337`

## Testing Checklist

- [ ] Start Hardhat node
- [ ] Deploy contracts
- [ ] Test name availability
- [ ] Test domain registration (traditional)
- [ ] Test domain lookup
- [ ] Test domain renewal
- [ ] Test domain transfer
- [ ] (Optional) Test gasless transactions

## Troubleshooting

**"Contract not found"**
- Make sure you deployed contracts: `npm run deploy:local`
- Check contract address in `frontend/.env.local`

**"Insufficient funds"**
- Hardhat provides 10,000 ETH per account
- If needed, use `hardhat_setBalance` to add more

**"Network mismatch"**
- Make sure frontend is configured for localhost
- Check `VITE_CHAIN_ID=31337` in `frontend/.env.local`

## Next Steps

Once local testing works:
1. Test on Celo Sepolia testnet
2. Deploy to production
3. Set up relayer for gasless transactions


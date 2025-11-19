# Gasless Transactions Implementation Guide

## Overview

The MotusNameService now supports gasless transactions through EVVM integration. Users can register, renew, and transfer domains without paying gas fees directly.

## How It Works

1. **User Signs Transaction**: User signs the transaction off-chain using EIP-191
2. **Relayer Submits**: A relayer (Fisher) submits the signed transaction to the blockchain
3. **Payment via EVVM**: Payment is processed through EVVM using Principal Tokens
4. **No Gas Fees**: User doesn't pay gas - the relayer does (or earns rewards if staking)

## Contract Functions

### `registerGasless`
Register a domain using EVVM Principal Tokens instead of native CELO.

```solidity
function registerGasless(
    string memory name,
    uint256 duration,
    address resolver,
    string memory metadata,
    address user,
    uint256 amount,
    uint256 priorityFee,
    uint256 nonce,
    bool priorityFlag,
    bytes memory signature
) external
```

### `renewGasless`
Renew a domain using EVVM Principal Tokens.

```solidity
function renewGasless(
    bytes32 nameHash,
    uint256 duration,
    address user,
    uint256 amount,
    uint256 priorityFee,
    uint256 nonce,
    bool priorityFlag,
    bytes memory signature
) external
```

### `transferGasless`
Transfer domain ownership (no payment needed, just authorization).

```solidity
function transferGasless(
    bytes32 nameHash,
    address newOwner,
    address user,
    bytes memory signature
) external
```

## Setup

### 1. Set EVVM Address

After deploying MotusNameService, set the EVVM address:

```typescript
await nameService.setEvvmAddress('0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537');
```

Or set `EVVM_ADDRESS` in `.env.local` before deployment to auto-configure.

### 2. Enable EVVM

```typescript
await nameService.setEvvmEnabled(true);
```

## Frontend Integration

### Example: Register Domain Gaslessly

```typescript
import { createGaslessRegistration, getNextNonce, sendToRelayer } from './utils/evvm';

// Get user's signer
const signer = provider.getSigner();
const userAddress = await signer.getAddress();

// Get next nonce from EVVM
const nonce = await getNextNonce(provider, userAddress);

// Calculate fee
const fee = await nameService.calculateRegistrationFee('myname', 365 * 24 * 60 * 60);

// Create gasless transaction
const txData = await createGaslessRegistration(
  signer,
  'myname',
  BigInt(365 * 24 * 60 * 60), // 1 year
  ethers.ZeroAddress,
  JSON.stringify({ type: 'healthcare-provider' }),
  fee,
  BigInt(0), // priority fee
  nonce
);

// Send to relayer
const txHash = await sendToRelayer(
  'https://your-relayer.com',
  MOTUS_NAME_SERVICE_ADDRESS,
  txData.functionName,
  txData.args
);
```

## Relayer Setup

### Option 1: Use Existing EVVM Relayer Network

Connect to the EVVM relayer network. Check EVVM documentation for available relayers.

### Option 2: Run Your Own Relayer

A simple relayer can be created using:

```typescript
// relayer/index.ts
import { ethers } from 'ethers';
import express from 'express';

const app = express();
app.use(express.json());

const provider = new ethers.JsonRpcProvider('https://forno.celo-sepolia.celo-testnet.org');
const wallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY!, provider);

app.post('/submit', async (req, res) => {
  const { contractAddress, functionName, args } = req.body;
  
  const contract = new ethers.Contract(contractAddress, abi, wallet);
  const tx = await contract[functionName](...args);
  const receipt = await tx.wait();
  
  res.json({ txHash: receipt.hash });
});

app.listen(3000);
```

## Environment Variables

Add to `.env.local`:

```bash
EVVM_ADDRESS=0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537
VITE_EVVM_ADDRESS=0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537
VITE_MOTUS_NAME_SERVICE_ADDRESS=<your-deployed-address>
VITE_RELAYER_URL=https://your-relayer.com
```

## Testing

1. Deploy contracts with EVVM address set
2. Get Principal Tokens in EVVM (users need to have balance)
3. Test gasless registration
4. Verify domain was registered
5. Check that user didn't pay gas fees

## Next Steps

- [ ] Deploy updated MotusNameService
- [ ] Set EVVM address
- [ ] Create relayer service
- [ ] Update frontend to use gasless transactions
- [ ] Test end-to-end flow


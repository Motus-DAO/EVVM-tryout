# Deploying MotusNameService Contract

## Quick Start

### 1. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Your private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# EVVM Address (from your EVVM deployment)
# Use the newer deployment:
EVVM_ADDRESS=0xfc99769602914d649144f6b2397e2aa528b2878d

# Or use the older deployment:
# EVVM_ADDRESS=0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537

# Network (optional, defaults to celoSepolia)
NETWORK=celoSepolia
```

### 2. Deploy to Celo Sepolia

```bash
npm run deploy:celoSepolia
```

Or directly:
```bash
npx hardhat run scripts/deploy.ts --network celoSepolia
```

### 3. After Deployment

The script will:
- Deploy MotusNameService
- Automatically set EVVM address (if EVVM_ADDRESS is in .env)
- Deploy other contracts (PatientRecords, Telemedicine, etc.)

### 4. Update Frontend

After deployment, update your frontend `.env` or `.env.local`:

```bash
NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS=<deployed_address>
NEXT_PUBLIC_EVVM_ADDRESS=<evvm_address>
```

## Manual Configuration (if EVVM_ADDRESS not in .env)

If you didn't set EVVM_ADDRESS in .env, you can configure it manually:

```typescript
// Connect to deployed contract
const nameService = await ethers.getContractAt("MotusNameService", "<deployed_address>");

// Set EVVM address
await nameService.setEvvmAddress("0xfc99769602914d649144f6b2397e2aa528b2878d");

// Enable EVVM
await nameService.setEvvmEnabled(true);
```

## Verify Deployment

```bash
npx hardhat verify --network celoSepolia <contract_address> <owner_address>
```

## Networks Available

- `celoSepolia` - Celo Sepolia Testnet (Chain ID: 11142220)
- `alfajores` - Celo Alfajores Testnet (Chain ID: 44787)
- `celo` - Celo Mainnet (Chain ID: 42220)
- `localhost` - Local Hardhat node

# Quick Start Guide - Healthcare EVVM on Celo

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Celo Wallet** (Valora or MetaMask with Celo network)
4. **Test CELO** (for Celo Sepolia testnet)

## Installation

```bash
# Clone or navigate to the project
cd EVVM-CELO-MOTUSNETWORK

# Install dependencies
npm install
# or
yarn install
```

## Configuration

1. **Create `.env` file** (copy from `.env.example`):
```bash
PRIVATE_KEY=your_private_key_here
MOTUS_NAME_SERVICE_ADDRESS=  # Will be set after deployment
```

2. **Get Testnet Tokens**:
   - Visit [Celo Sepolia Faucet](https://faucet.celo.org/celo-sepolia) or [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/celo/sepolia)
   - Get test CELO tokens

## Deployment

### Deploy to Celo Sepolia Testnet (Recommended)

```bash
# Compile contracts
npm run compile

# Deploy all contracts
npm run deploy:celoSepolia
```

**Note**: Celo Sepolia uses native CELO for payments. If cUSD is deployed later, update the deployment script.

This will deploy:
- **Motus Name Service**: Domain registration contract
- **Patient Records**: Healthcare records management
- **Telemedicine**: Consultation and prescription system

Save the contract addresses from the deployment output.

## Register Your First Domain (`gerry.motus`)

1. **Set the name service address** in `.env`:
```bash
MOTUS_NAME_SERVICE_ADDRESS=0x...  # From deployment output
```

2. **Register the domain**:
```bash
npm run register-name gerry
```

Or use the script directly:
```bash
npx hardhat run scripts/register-name.ts --network alfajores -- gerry
```

## Example: Complete Workflow

### 1. Register Healthcare Provider Domain

```typescript
import { ethers } from "hardhat";

const nameService = await ethers.getContractAt(
  "MotusNameService",
  "0x..." // Your deployed address
);

// Register gerry.motus
const name = "gerry";
const duration = 365 * 24 * 60 * 60; // 1 year
const fee = await nameService.calculateRegistrationFee(name, duration);

const tx = await nameService.register(
  name,
  duration,
  ethers.ZeroAddress, // No resolver
  JSON.stringify({ type: "doctor", specialty: "cardiology" }),
  { value: fee }
);

await tx.wait();
console.log("✅ Registered gerry.motus");
```

### 2. Create Patient Record

```typescript
const patientRecords = await ethers.getContractAt(
  "PatientRecords",
  "0x..." // Your deployed address
);

// Grant consent first (as patient)
await patientRecords.grantConsent(
  doctorAddress, // gerry.motus owner
  "read",
  365 * 24 * 60 * 60 // 1 year
);

// Create record (as doctor)
await patientRecords.createRecord(
  patientAddress,
  "QmHash...", // IPFS hash of encrypted record
  "diagnosis",
  JSON.stringify({ condition: "hypertension", date: "2024-01-01" })
);
```

### 3. Schedule Telemedicine Consultation

```typescript
const telemedicine = await ethers.getContractAt(
  "Telemedicine",
  "0x..." // Your deployed address
);

// Schedule consultation
const scheduledTime = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
const fee = ethers.parseEther("50"); // 50 cUSD

await telemedicine.scheduleConsultation(
  doctorAddress, // gerry.motus owner
  scheduledTime,
  fee
);

// Pay for consultation
const consultationId = 0; // From event or query
await telemedicine.payForConsultation(consultationId);
```

## Testing

```bash
# Run tests
npm test

# Run specific test file
npx hardhat test test/MotusNameService.test.ts
```

## Network Information

### Celo Sepolia (Testnet) - Recommended
- **Chain ID**: 11142220
- **RPC URL**: https://forno.celo-sepolia.celo-testnet.org
- **Explorer**: https://celo-sepolia.blockscout.com
- **Faucet**: 
  - https://faucet.celo.org/celo-sepolia
  - https://cloud.google.com/application/web3/faucet/celo/sepolia
- **Status**: Live testnet built on Ethereum Sepolia L1

### Alfajores (Legacy Testnet)
- **Chain ID**: 44787
- **RPC URL**: https://alfajores-forno.celo-testnet.org
- **Explorer**: https://alfajores.celoscan.io
- **Faucet**: https://faucet.celo.org/alfajores

### Celo Mainnet
- **Chain ID**: 42220
- **RPC URL**: https://forno.celo.org
- **Explorer**: https://celoscan.io

## Common Tasks

### Check Domain Availability
```typescript
const isAvailable = await nameService.isAvailable("gerry");
console.log(`gerry.motus available: ${isAvailable}`);
```

### Get Domain Information
```typescript
const nameHash = ethers.keccak256(
  ethers.toUtf8Bytes("gerry.motus")
);
const domain = await nameService.getDomain(nameHash);
console.log("Owner:", domain.owner);
console.log("Expires:", new Date(Number(domain.expirationTime) * 1000));
```

### Renew Domain
```typescript
const duration = 365 * 24 * 60 * 60; // 1 year
const fee = await nameService.calculateRenewalFee(duration);
await nameService.renew(nameHash, duration, { value: fee });
```

## Troubleshooting

### "Insufficient funds"
- Get test tokens from the faucet
- Ensure you have both CELO (for gas) and cUSD (for payments)

### "Domain already registered"
- Try a different name
- Check if domain is expired (can be reclaimed)

### "Not authorized"
- Check that you're using the correct account
- Verify role assignments (for healthcare contracts)

## Next Steps

1. **Explore Use Cases**: See `docs/use-cases.md`
2. **Review Considerations**: See `docs/considerations.md`
3. **Build Frontend**: Integrate with web3 wallets
4. **Deploy to Mainnet**: After thorough testing

## Resources

- [EVVM Documentation](https://www.evvm.info/docs/intro)
- [Celo Documentation](https://docs.celo.org)
- [Hardhat Documentation](https://hardhat.org/docs)

## Support

For issues or questions:
- Check the documentation
- Review contract code
- Test on Alfajores first
- Join Celo and EVVM communities


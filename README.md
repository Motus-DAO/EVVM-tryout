# Healthcare EVVM on Celo - Motus Network

A healthcare-focused virtual blockchain built on EVVM, deployed on Celo, featuring the Motus Name Service and healthcare-specific use cases.

## Overview

This project implements a healthcare virtual blockchain using EVVM (Ethereum Virtual Virtual Machine) on the Celo network. It includes:

- **Motus Name Service (MNS)**: Human-readable identity system (e.g., `gerry.motus`)
- **Healthcare Smart Contracts**: Patient records, telemedicine, supply chain tracking
- **Celo Integration**: Optimized for Celo's mobile-first, carbon-negative blockchain

## Architecture

### Core Components

1. **EVVM Core Contract**: Payment processing and token management
2. **Motus Name Service**: `.motus` domain registration and management
3. **Healthcare Services**:
   - Patient Records Management
   - Telemedicine Services
   - Pharmaceutical Supply Chain
   - Insurance Claims Processing

## Key Considerations

### Regulatory Compliance
- **HIPAA Compliance**: Patient data encryption and access controls
- **GDPR Compliance**: Data privacy and right to deletion
- **Audit Trails**: Immutable records for compliance

### Security
- **EIP-191 Signatures**: Cryptographic authorization for all operations
- **Access Control**: Role-based permissions for healthcare providers
- **Data Encryption**: On-chain metadata, off-chain encrypted data storage

### Interoperability
- **HL7/FHIR Standards**: Integration with existing healthcare systems
- **Cross-Chain**: Fisher Bridge for multi-chain asset transfers
- **API Integration**: RESTful APIs for traditional systems

### User Experience
- **Mobile-First**: Leveraging Celo's mobile wallet integration
- **Human-Readable Names**: Motus Name Service for easy addressing
- **Gas Optimization**: Efficient contract design for cost-effective operations

## Use Cases

### 1. Patient Records Management
- Secure, immutable patient health records
- Patient-controlled data sharing
- Cross-institution interoperability

### 2. Telemedicine Services
- Virtual consultations with verifiable records
- Prescription management
- Billing and payment processing

### 3. Pharmaceutical Supply Chain
- Track medications from manufacturer to patient
- Prevent counterfeit drugs
- Regulatory compliance tracking

### 4. Insurance Claims Processing
- Automated claims submission and verification
- Fraud prevention through transparency
- Faster settlement times

## Getting Started

### Prerequisites
- Node.js 18+
- Hardhat or Foundry
- Celo wallet (Valora, MetaMask with Celo network)
- EVVM deployment tools

### Installation

```bash
npm install
cd frontend && npm install
```

### Local Development & Testing

#### 1. Start Local Blockchain

```bash
# Terminal 1: Start Hardhat node
npm run node
```

#### 2. Deploy Contracts Locally

```bash
# Terminal 2: Deploy MotusNameService
npm run deploy:local
```

#### 3. Set Up EVVM for Gasless Transactions

```bash
# Terminal 2: Deploy EVVM and configure
npm run setup:evvm:local
```

This will:
- Deploy EVVM contracts to localhost
- Set EVVM address in MotusNameService
- Enable gasless transactions

#### 4. Test Gasless Transactions

```bash
# Terminal 2: Test gasless registration
npm run test:gasless:local
```

#### 5. Start Frontend

```bash
# Terminal 3: Start frontend dev server
npm run frontend:dev
```

Open `http://localhost:5173` and test gasless domain registration!

### Deployment to Testnet

```bash
# Deploy to Celo Sepolia (testnet) - Recommended
npm run deploy:celoSepolia

# Deploy to Celo Alfajores (legacy testnet)
npm run deploy:alfajores

# Deploy to Celo Mainnet
npm run deploy:mainnet
```

### Gasless Transactions

The Motus Name Service supports **gasless transactions** via EVVM integration:

- **No gas fees** for users
- **EIP-191 signatures** for secure authorization
- **Principal Token payments** instead of native CELO

To enable gasless transactions:
1. Deploy EVVM contracts (see `docs/evvm-research.md`)
2. Set `EVVM_ADDRESS` in `.env.local`
3. Run deployment script (automatically sets EVVM address)
4. Users can now register domains without paying gas!

### Celo Sepolia Testnet

**Network Details:**
- **Chain ID**: 11142220
- **RPC URL**: `https://forno.celo-sepolia.celo-testnet.org`
- **Block Explorer**: `https://celo-sepolia.blockscout.com`
- **Faucet**: 
  - [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/celo/sepolia)
  - [Celo Sepolia Self-Serve Faucet](https://faucet.celo.org/celo-sepolia)

**Add to MetaMask:**
- Network Name: Celo Sepolia Testnet
- RPC URL: `https://forno.celo-sepolia.celo-testnet.org`
- Chain ID: 11142220
- Currency Symbol: CELO
- Block Explorer: `https://celo-sepolia.blockscout.com`

## Project Structure

```
├── contracts/
│   ├── core/
│   │   └── MotusNameService.sol
│   └── healthcare/
│       ├── PatientRecords.sol
│       ├── Telemedicine.sol
│       └── SupplyChain.sol
├── scripts/
│   ├── deploy.ts
│   └── register-name.ts
├── test/
│   └── MotusNameService.test.ts
└── docs/
    └── architecture.md
```

## Motus Name Service

Register human-readable names like `gerry.motus`:

```typescript
// Register a name
await motusNameService.register("gerry", {
  resolver: yourResolverAddress,
  metadata: {
    type: "healthcare-provider",
    specialty: "cardiology"
  }
});
```

## License

See LICENSE file for details.

## Available Scripts

```bash
# Compile contracts
npm run compile

# Local development
npm run node                    # Start Hardhat node
npm run deploy:local            # Deploy to localhost
npm run setup:evvm:local        # Set up EVVM for gasless transactions
npm run test:local              # Test traditional payments
npm run test:gasless:local      # Test gasless transactions
npm run frontend:dev            # Start frontend dev server

# Testnet deployment
npm run deploy:celoSepolia      # Deploy to Celo Sepolia
npm run register-name:gerry     # Register a domain name
```

## Deployment & Hosting

### GitHub Setup
See `docs/github-vercel-setup.md` for detailed instructions.

### Vercel Deployment
1. Push code to GitHub
2. Import repository to Vercel
3. Configure environment variables (see `vercel.json`)
4. Deploy!

## Resources

- [EVVM Documentation](https://www.evvm.info/docs/intro)
- [Celo Documentation](https://docs.celo.org)
- [Motus Network](https://motus.network)
- [Gasless Transactions Guide](docs/gasless-transactions.md)
- [Local Testing Guide](docs/local-testing.md)

## Contract Addresses (Celo Sepolia)

- **Motus Name Service**: `0x7b2a5c1E00B62A47dcF89cB4A4868e344bAf3736`
- **Patient Records**: `0x3b5B974d560dd7281aEFE0425daBDEFEcA8B9e57`
- **Telemedicine**: `0xCd28Fa8d0071E004C976dFF1d3f688D02e52EE8c`
- **Walrus Storage**: `0x0AD0B2AC5304Cb711bdD7330440a0493CFFfB6eF`
- **HL7 FHIR Adapter**: `0x6fc0d2D4626613ac404cb90f2967f6e6b143Cdf4`
- **EVVM Core**: `0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537` (EVVM ID: 1047)
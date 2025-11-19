# Motus Name Service Frontend

A modern web interface for the Motus Name Service on Celo Sepolia.

## Features

- 🔌 Wallet connection (MetaMask, Valora, etc.)
- 🔍 Domain availability checking
- 📝 Domain registration
- 🔎 Domain lookup
- 📱 Mobile-responsive design

## Getting Started

### Install Dependencies

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

## Configuration

The contract address is hardcoded in `src/App.tsx`. Update it if you deploy to a different network or address.

## Network

Currently configured for **Celo Sepolia Testnet** (Chain ID: 11142220)

## Contract Address

- Motus Name Service: `0x7b2a5c1E00B62A47dcF89cB4A4868e344bAf3736`


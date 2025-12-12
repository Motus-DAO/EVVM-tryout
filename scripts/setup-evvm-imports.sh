#!/bin/bash
# Setup script to copy SignatureRecover.sol from local Testnet-Contracts to npm package
# This is needed because the npm package version doesn't have the signatureVerification function

set -e

echo "🔧 Setting up EVVM imports for Hardhat compilation..."

# Check if node_modules exists
if [ ! -d "node_modules/@evvm/testnet-contracts" ]; then
  echo "❌ @evvm/testnet-contracts not found. Installing..."
  npm install @evvm/testnet-contracts
fi

# Check if local Testnet-Contracts exists
if [ ! -f "Testnet-Contracts/src/library/SignatureRecover.sol" ]; then
  echo "❌ Local Testnet-Contracts/src/library/SignatureRecover.sol not found!"
  echo "   Make sure Testnet-Contracts is cloned and up to date."
  exit 1
fi

# Create directory if it doesn't exist
mkdir -p node_modules/@evvm/testnet-contracts/library/primitives

# Copy the file with signatureVerification function
echo "📋 Copying SignatureRecover.sol from local Testnet-Contracts..."
cp Testnet-Contracts/src/library/SignatureRecover.sol node_modules/@evvm/testnet-contracts/library/primitives/SignatureRecover.sol

echo "✅ Setup complete! You can now run: npx hardhat compile"

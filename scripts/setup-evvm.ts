import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

/**
 * Script to configure EVVM on an already-deployed MotusNameService contract
 * 
 * Usage:
 *   npx hardhat run scripts/setup-evvm.ts --network celoSepolia
 * 
 * Or for local:
 *   npx hardhat run scripts/setup-evvm.ts --network localhost
 */
async function main() {
  const network = process.env.HARDHAT_NETWORK || process.env.NETWORK || 'celoSepolia';
  console.log(`\n🔧 Configuring EVVM for MotusNameService on ${network}...\n`);

  // Get contract addresses from environment
  const nameServiceAddress = process.env.MOTUS_NAME_SERVICE_ADDRESS || process.env.NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS;
  const evvmAddress = process.env.EVVM_ADDRESS || process.env.NEXT_PUBLIC_EVVM_ADDRESS;

  if (!nameServiceAddress) {
    throw new Error('MOTUS_NAME_SERVICE_ADDRESS not set in environment variables');
  }

  if (!evvmAddress) {
    throw new Error('EVVM_ADDRESS not set in environment variables');
  }

  console.log('Contract Addresses:');
  console.log('  MotusNameService:', nameServiceAddress);
  console.log('  EVVM:', evvmAddress);

  // Get signer (contract owner)
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY not set in environment variables. You need the contract owner private key.');
  }

  let provider: ethers.Provider;
  if (network === 'localhost' || network === 'hardhat') {
    provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
  } else if (network === 'celoSepolia') {
    provider = new ethers.JsonRpcProvider('https://forno.celo-sepolia.celo-testnet.org');
  } else {
    throw new Error(`Unknown network: ${network}`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  const signerAddress = await wallet.getAddress();
  console.log('  Signer (Owner):', signerAddress);

  // Load contract
  const contractABI = [
    'function evvmAddress() view returns (address)',
    'function evvmEnabled() view returns (bool)',
    'function owner() view returns (address)',
    'function setEvvmAddress(address _evvmAddress)',
    'function setEvvmEnabled(bool _enabled)',
  ];

  const nameService = new ethers.Contract(nameServiceAddress, contractABI, wallet);

  // Check current owner
  const owner = await nameService.owner();
  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(`Signer ${signerAddress} is not the contract owner. Owner is ${owner}`);
  }

  // Check current EVVM status
  console.log('\n📊 Current EVVM Status:');
  const currentEvvmAddress = await nameService.evvmAddress();
  const currentEnabled = await nameService.evvmEnabled();
  console.log('  EVVM Address:', currentEvvmAddress);
  console.log('  EVVM Enabled:', currentEnabled);

  // Configure EVVM if needed
  if (currentEvvmAddress.toLowerCase() !== evvmAddress.toLowerCase()) {
    console.log('\n⚙️  Setting EVVM address...');
    const setEvvmTx = await nameService.setEvvmAddress(evvmAddress);
    console.log('  Transaction:', setEvvmTx.hash);
    await setEvvmTx.wait();
    console.log('  ✅ EVVM address set!');
  } else {
    console.log('\n✅ EVVM address already configured');
  }

  // Enable EVVM if not already enabled
  const newEvvmAddress = await nameService.evvmAddress();
  const newEnabled = await nameService.evvmEnabled();
  
  if (!newEnabled) {
    console.log('\n⚙️  Enabling EVVM...');
    const enableTx = await nameService.setEvvmEnabled(true);
    console.log('  Transaction:', enableTx.hash);
    await enableTx.wait();
    console.log('  ✅ EVVM enabled!');
  } else {
    console.log('\n✅ EVVM already enabled');
  }

  // Final verification
  console.log('\n✅ Final Verification:');
  const finalEvvmAddress = await nameService.evvmAddress();
  const finalEnabled = await nameService.evvmEnabled();
  console.log('  EVVM Address:', finalEvvmAddress);
  console.log('  EVVM Enabled:', finalEnabled);

  if (finalEvvmAddress.toLowerCase() === evvmAddress.toLowerCase() && finalEnabled) {
    console.log('\n🎉 SUCCESS! Gasless transactions are now enabled!');
    console.log('   Users can now register domains without paying gas fees.');
    console.log('   Make sure the relayer service is running and configured.');
  } else {
    console.log('\n⚠️  Configuration incomplete. Please check the values above.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });


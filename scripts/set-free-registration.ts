import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * Script to set registration fee to 0 for free name claiming
 * 
 * Usage:
 *   npx hardhat run scripts/set-free-registration.ts --network celoSepolia
 */
async function main() {
  const network = process.env.HARDHAT_NETWORK || process.env.NETWORK || 'celoSepolia';
  console.log(`\n🔧 Setting registration fee to 0 for free name claiming on ${network}...\n`);

  // Get contract address from environment
  const nameServiceAddress = process.env.MOTUS_NAME_SERVICE_ADDRESS || process.env.NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS;

  if (!nameServiceAddress) {
    throw new Error('MOTUS_NAME_SERVICE_ADDRESS not set in environment variables');
  }

  console.log('Contract Address:', nameServiceAddress);

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
  console.log('Signer (Owner):', signerAddress);

  // Load contract
  const contractABI = [
    'function baseRegistrationFee() view returns (uint256)',
    'function owner() view returns (address)',
    'function setBaseRegistrationFee(uint256 newFee)',
  ];

  const nameService = new ethers.Contract(nameServiceAddress, contractABI, wallet);

  // Check current owner
  const owner = await nameService.owner();
  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    throw new Error(`Signer ${signerAddress} is not the contract owner. Owner is ${owner}`);
  }

  // Check current fee
  console.log('\n📊 Current Registration Fee:');
  const currentFee = await nameService.baseRegistrationFee();
  console.log('  Current Fee:', ethers.formatEther(currentFee), 'CELO/Principal Tokens');

  // Set fee to 0
  if (currentFee > 0n) {
    console.log('\n⚙️  Setting registration fee to 0...');
    const setFeeTx = await nameService.setBaseRegistrationFee(0);
    console.log('  Transaction:', setFeeTx.hash);
    await setFeeTx.wait();
    console.log('  ✅ Registration fee set to 0!');
  } else {
    console.log('\n✅ Registration fee is already 0');
  }

  // Final verification
  console.log('\n✅ Final Verification:');
  const finalFee = await nameService.baseRegistrationFee();
  console.log('  Registration Fee:', ethers.formatEther(finalFee), 'CELO/Principal Tokens');

  if (finalFee === 0n) {
    console.log('\n🎉 SUCCESS! Free name registration is now enabled!');
    console.log('   Users can now claim names with no tokens required.');
  } else {
    console.log('\n⚠️  Fee is not zero. Please check the transaction.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

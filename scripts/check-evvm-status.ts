import { ethers } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const nameServiceAddress = process.env.MOTUS_NAME_SERVICE_ADDRESS || process.env.NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS || '0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1';
  const evvmAddress = process.env.EVVM_ADDRESS || process.env.NEXT_PUBLIC_EVVM_ADDRESS || '0xfc99769602914d649144f6b2397e2aa528b2878d';
  
  const provider = new ethers.JsonRpcProvider('https://forno.celo-sepolia.celo-testnet.org');
  
  const contractABI = [
    'function evvmAddress() view returns (address)',
    'function evvmEnabled() view returns (bool)',
  ];
  
  const contract = new ethers.Contract(nameServiceAddress, contractABI, provider);
  
  try {
    const currentEvvmAddress = await contract.evvmAddress();
    const currentEnabled = await contract.evvmEnabled();
    
    console.log('\n📊 EVVM Status on Contract:');
    console.log('  Contract Address:', nameServiceAddress);
    console.log('  EVVM Address (expected):', evvmAddress);
    console.log('  EVVM Address (current):', currentEvvmAddress);
    console.log('  EVVM Enabled:', currentEnabled);
    
    if (currentEvvmAddress === ethers.ZeroAddress) {
      console.log('\n❌ EVVM address is not set!');
      console.log('   Run: npx hardhat run scripts/setup-evvm.ts --network celoSepolia');
    } else if (currentEvvmAddress.toLowerCase() !== evvmAddress.toLowerCase()) {
      console.log('\n⚠️  EVVM address mismatch!');
      console.log('   Run: npx hardhat run scripts/setup-evvm.ts --network celoSepolia');
    } else if (!currentEnabled) {
      console.log('\n⚠️  EVVM is configured but not enabled!');
      console.log('   Run: npx hardhat run scripts/setup-evvm.ts --network celoSepolia');
    } else {
      console.log('\n✅ EVVM is properly configured and enabled!');
    }
  } catch (error: any) {
    console.error('❌ Error checking EVVM status:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

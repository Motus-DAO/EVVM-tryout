import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { execSync } from "child_process";

// Load .env.local if it exists, otherwise fall back to .env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

async function main() {
  console.log("🚀 Setting up EVVM for localhost gasless transactions...\n");

  // Check if Hardhat node is running
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    await provider.getBlockNumber();
    console.log("✅ Hardhat node is running\n");
  } catch (error) {
    console.error("❌ Error: Hardhat node is not running!");
    console.log("   Please run 'npm run node' in another terminal first.\n");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Step 1: Deploy EVVM contracts using Foundry
  console.log("=== Step 1: Deploying EVVM Contracts ===");
  console.log("This will deploy EVVM contracts to localhost using Foundry...\n");

  try {
    // Change to Testnet-Contracts directory
    const testnetContractsDir = process.cwd() + "/Testnet-Contracts";
    if (!fs.existsSync(testnetContractsDir)) {
      console.error("❌ Error: Testnet-Contracts directory not found!");
      console.log("   Make sure you've cloned the EVVM Testnet Contracts repository.");
      process.exit(1);
    }

    // Deploy EVVM to localhost using Foundry
    console.log("Deploying EVVM contracts to localhost...");
    const deployCommand = `cd ${testnetContractsDir} && make deployTestnetAnvil`;
    
    console.log("Running:", deployCommand);
    execSync(deployCommand, { 
      stdio: 'inherit',
      cwd: testnetContractsDir 
    });

    // Read the deployment output to get EVVM address
    // The deployment script should output the addresses
    console.log("\n✅ EVVM contracts deployed!");
    console.log("   Note: Check the output above for EVVM Core contract address.\n");

  } catch (error: any) {
    console.error("❌ Error deploying EVVM contracts:", error.message);
    console.log("\n💡 Alternative: You can manually deploy EVVM using:");
    console.log("   cd Testnet-Contracts");
    console.log("   make deployTestnetAnvil\n");
    process.exit(1);
  }

  // Step 2: Get EVVM address (user needs to provide it or we read from deployment)
  console.log("=== Step 2: Configure MotusNameService ===");
  
  // Try to read EVVM address from environment or prompt
  let evvmAddress = process.env.EVVM_ADDRESS;
  
  if (!evvmAddress) {
    console.log("⚠️  EVVM_ADDRESS not found in .env.local");
    console.log("   Please add the EVVM Core contract address from the deployment above.");
    console.log("   Format: EVVM_ADDRESS=0x...\n");
    
    // Try to read from a deployment file if it exists
    const deploymentFile = process.cwd() + "/Testnet-Contracts/broadcast/DeployTestnetOnAnvil.s.sol/31337/run-latest.json";
    if (fs.existsSync(deploymentFile)) {
      try {
        const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
        // Find EVVM Core contract address from transactions
        const evvmTx = deploymentData.transactions?.find((tx: any) => 
          tx.contractName === "Evvm" || tx.contractName === "EVVM"
        );
        if (evvmTx) {
          evvmAddress = evvmTx.contractAddress;
          console.log(`✅ Found EVVM address in deployment: ${evvmAddress}\n`);
        }
      } catch (e) {
        console.log("   Could not auto-detect EVVM address from deployment file.\n");
      }
    }
    
    if (!evvmAddress) {
      console.log("   After adding EVVM_ADDRESS to .env.local, run this script again.");
      process.exit(0);
    }
  }

  // Step 3: Deploy or get MotusNameService address
  console.log("=== Step 3: Setting EVVM Address in MotusNameService ===");
  
  let nameServiceAddress = process.env.MOTUS_NAME_SERVICE_ADDRESS;
  let nameService;

  if (nameServiceAddress) {
    console.log("Using existing MotusNameService:", nameServiceAddress);
    const MotusNameService = await ethers.getContractFactory("MotusNameService");
    nameService = MotusNameService.attach(nameServiceAddress);
  } else {
    console.log("Deploying new MotusNameService...");
    const MotusNameService = await ethers.getContractFactory("MotusNameService");
    nameService = await MotusNameService.deploy(deployer.address);
    await nameService.waitForDeployment();
    nameServiceAddress = await nameService.getAddress();
    console.log("✅ MotusNameService deployed to:", nameServiceAddress);
  }

  // Set EVVM address
  console.log("\nSetting EVVM address...");
  const setEvvmTx = await nameService.setEvvmAddress(evvmAddress);
  await setEvvmTx.wait();
  console.log("✅ EVVM address set:", evvmAddress);

  // Enable EVVM
  console.log("\nEnabling EVVM...");
  const enableTx = await nameService.setEvvmEnabled(true);
  await enableTx.wait();
  console.log("✅ EVVM enabled!");

  // Verify setup
  const currentEvvmAddress = await nameService.evvmAddress();
  const isEnabled = await nameService.evvmEnabled();
  
  console.log("\n=== Verification ===");
  console.log("EVVM Address:", currentEvvmAddress);
  console.log("EVVM Enabled:", isEnabled);

  if (currentEvvmAddress.toLowerCase() === evvmAddress.toLowerCase() && isEnabled) {
    console.log("\n✅ Gasless transactions are now enabled!");
    console.log("   You can now register domains without paying gas fees!");
  } else {
    console.log("\n⚠️  Setup incomplete. Please check the configuration.");
  }

  // Update .env.local
  const envContent = fs.existsSync('.env.local') 
    ? fs.readFileSync('.env.local', 'utf8')
    : '';
  
  let updatedEnv = envContent;
  if (!envContent.includes('MOTUS_NAME_SERVICE_ADDRESS')) {
    updatedEnv += `\nMOTUS_NAME_SERVICE_ADDRESS=${nameServiceAddress}`;
  }
  if (!envContent.includes('EVVM_ADDRESS')) {
    updatedEnv += `\nEVVM_ADDRESS=${evvmAddress}`;
  }
  
  fs.writeFileSync('.env.local', updatedEnv);
  console.log("\n✅ .env.local updated with contract addresses");

  // Update frontend .env.local
  const frontendEnv = `VITE_MOTUS_NAME_SERVICE_ADDRESS=${nameServiceAddress}
VITE_EVVM_ADDRESS=${evvmAddress}
VITE_NETWORK=localhost
VITE_CHAIN_ID=31337
VITE_RPC_URL=http://127.0.0.1:8545
`;
  fs.writeFileSync('frontend/.env.local', frontendEnv);
  console.log("✅ Frontend .env.local updated");

  console.log("\n🎉 Setup complete! Gasless transactions are ready to test.");
  console.log("\nNext steps:");
  console.log("  1. Start frontend: npm run frontend:dev");
  console.log("  2. Connect wallet to localhost (Chain ID: 31337)");
  console.log("  3. Check 'Use Gasless Transaction' checkbox");
  console.log("  4. Register a domain - no gas fees!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


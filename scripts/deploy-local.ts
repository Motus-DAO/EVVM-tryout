import { ethers } from "hardhat";
import * as dotenv from "dotenv";

// Load .env.local if it exists, otherwise fall back to .env
import * as fs from "fs";
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts locally with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // For local testing, we'll deploy a mock EVVM contract or use a simplified setup
  // First, let's deploy MotusNameService
  console.log("\n=== Deploying MotusNameService ===");
  const MotusNameService = await ethers.getContractFactory("MotusNameService");
  const nameService = await MotusNameService.deploy(deployer.address);
  await nameService.waitForDeployment();
  const nameServiceAddress = await nameService.getAddress();
  console.log("✅ MotusNameService deployed to:", nameServiceAddress);

  // For local testing, you can either:
  // 1. Deploy a simplified EVVM mock contract
  // 2. Skip EVVM setup and test traditional payments first
  // 3. Use the actual EVVM contracts from Testnet-Contracts (more complex)

  console.log("\n=== Local Testing Setup ===");
  console.log("Contract Addresses:");
  console.log("  MotusNameService:", nameServiceAddress);
  console.log("\n📝 To test gasless transactions:");
  console.log("  1. Deploy EVVM contracts locally (or use mock)");
  console.log("  2. Set EVVM address: nameService.setEvvmAddress(evvmAddress)");
  console.log("  3. Enable EVVM: nameService.setEvvmEnabled(true)");
  console.log("\n📝 To test traditional payments:");
  console.log("  Just call register() with msg.value - no EVVM needed!");

  // Save addresses for frontend
  const deploymentInfo = {
    network: "localhost",
    chainId: 1337,
    deployer: deployer.address,
    contracts: {
      motusNameService: nameServiceAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Info (JSON) ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Write to a file for frontend to use
  const frontendEnv = `VITE_MOTUS_NAME_SERVICE_ADDRESS=${nameServiceAddress}
VITE_NETWORK=localhost
VITE_CHAIN_ID=1337
VITE_RPC_URL=http://127.0.0.1:8545
`;
  fs.writeFileSync('frontend/.env.local', frontendEnv);
  console.log("\n✅ Frontend .env.local updated!");
  console.log("   Contract address saved for frontend to use");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load .env.local if it exists, otherwise fall back to .env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

async function main() {
  const [deployer, user] = await ethers.getSigners();
  console.log("Testing MotusNameService locally");
  console.log("Deployer:", deployer.address);
  console.log("Test User:", user.address);

  // Get contract address from deployment or use a known address
  const nameServiceAddress = process.env.MOTUS_NAME_SERVICE_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  console.log("\n=== Connecting to MotusNameService ===");
  console.log("Address:", nameServiceAddress);
  
  const MotusNameService = await ethers.getContractFactory("MotusNameService");
  const nameService = MotusNameService.attach(nameServiceAddress);

  // Test 1: Check if name is available
  console.log("\n=== Test 1: Check Name Availability ===");
  const testName = "testuser";
  const isAvailable = await nameService.isAvailable(testName);
  console.log(`Name "${testName}.motus" is available:`, isAvailable);

  // Test 2: Calculate registration fee
  console.log("\n=== Test 2: Calculate Registration Fee ===");
  const duration = 365 * 24 * 60 * 60; // 1 year
  const fee = await nameService.calculateRegistrationFee(testName, duration);
  console.log(`Registration fee for "${testName}.motus" (1 year):`, ethers.formatEther(fee), "CELO");

  // Test 3: Register domain (traditional payment)
  if (isAvailable) {
    console.log("\n=== Test 3: Register Domain (Traditional Payment) ===");
    try {
      const metadata = JSON.stringify({
        type: "healthcare-provider",
        specialty: "general",
        registeredAt: new Date().toISOString(),
      });

      const tx = await nameService.connect(user).register(
        testName,
        duration,
        ethers.ZeroAddress, // no resolver
        metadata,
        { value: fee + ethers.parseEther("0.001") } // Add buffer for gas
      );
      console.log("Transaction hash:", tx.hash);
      const receipt = await tx.wait();
      console.log("✅ Domain registered in block:", receipt?.blockNumber);

      // Test 4: Get domain info
      console.log("\n=== Test 4: Get Domain Info ===");
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(`${testName}.motus`));
      const domain = await nameService.getDomain(nameHash);
      console.log("Domain Owner:", domain.owner);
      console.log("Expiration:", new Date(Number(domain.expirationTime) * 1000).toISOString());
      console.log("Metadata:", domain.metadata);

      // Test 5: Check EVVM status
      console.log("\n=== Test 5: Check EVVM Status ===");
      const evvmAddress = await nameService.evvmAddress();
      const evvmEnabled = await nameService.evvmEnabled();
      console.log("EVVM Address:", evvmAddress);
      console.log("EVVM Enabled:", evvmEnabled);
      
      if (evvmAddress === ethers.ZeroAddress) {
        console.log("\n⚠️  EVVM not configured. Gasless transactions are disabled.");
        console.log("   To enable: nameService.setEvvmAddress(evvmAddress)");
      } else {
        console.log("\n✅ EVVM configured! Gasless transactions are available.");
      }

    } catch (error: any) {
      console.error("❌ Registration failed:", error.message);
    }
  }

  console.log("\n=== Local Testing Complete ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


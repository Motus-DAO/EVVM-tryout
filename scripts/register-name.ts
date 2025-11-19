import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load .env.local if it exists, otherwise fall back to .env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Registering name with account:", signer.address);

  // Get contract address from environment or use a default
  const nameServiceAddress = process.env.MOTUS_NAME_SERVICE_ADDRESS;
  if (!nameServiceAddress) {
    throw new Error("MOTUS_NAME_SERVICE_ADDRESS not set in .env");
  }

  const MotusNameService = await ethers.getContractFactory("MotusNameService");
  const nameService = MotusNameService.attach(nameServiceAddress);

  // Name to register (e.g., "gerry")
  // Support both environment variable and command-line argument
  const name = process.env.NAME || process.argv[2] || "gerry";
  const duration = 365 * 24 * 60 * 60; // 1 year in seconds
  const resolver = ethers.ZeroAddress; // No resolver for now
  const metadata = JSON.stringify({
    type: "healthcare-provider",
    specialty: "general",
    registeredAt: new Date().toISOString(),
  });

  console.log(`\nRegistering name: ${name}.motus`);
  console.log(`Duration: ${duration / (365 * 24 * 60 * 60)} year(s)`);

  // Check if name is available
  const isAvailable = await nameService.isAvailable(name);
  if (!isAvailable) {
    console.log(`\n❌ Name ${name}.motus is not available`);
    return;
  }

  console.log(`✅ Name ${name}.motus is available`);

  // Calculate fee
  const fee = await nameService.calculateRegistrationFee(name, duration);
  console.log(`Registration fee: ${ethers.formatEther(fee)} CELO`);

  // Register the name
  console.log("\nRegistering...");
  const tx = await nameService.register(name, duration, resolver, metadata, {
    value: fee + ethers.parseEther("0.001"), // Add small buffer for gas
  });
  console.log("Transaction hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Registration confirmed in block:", receipt?.blockNumber);

  // Get the name hash
  const nameHash = ethers.keccak256(ethers.toUtf8Bytes(`${name}.motus`));
  const domain = await nameService.getDomain(nameHash);
  
  console.log("\n=== Registration Details ===");
  console.log("Name:", `${name}.motus`);
  console.log("Owner:", domain.owner);
  console.log("Expiration:", new Date(Number(domain.expirationTime) * 1000).toISOString());
  console.log("Metadata:", domain.metadata);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


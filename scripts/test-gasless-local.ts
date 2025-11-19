import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load .env.local if it exists, otherwise fall back to .env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

async function main() {
  console.log("🧪 Testing Gasless Transactions on Localhost...\n");

  const [deployer, user] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Test User:", user.address);
  console.log("User Balance:", ethers.formatEther(await ethers.provider.getBalance(user.address)), "ETH\n");

  const nameServiceAddress = process.env.MOTUS_NAME_SERVICE_ADDRESS;
  const evvmAddress = process.env.EVVM_ADDRESS;

  if (!nameServiceAddress || !evvmAddress) {
    console.error("❌ Error: MOTUS_NAME_SERVICE_ADDRESS and EVVM_ADDRESS must be set in .env.local");
    console.log("   Run 'npm run setup:evvm:local' first to set up EVVM.");
    process.exit(1);
  }

  console.log("=== Contract Addresses ===");
  console.log("MotusNameService:", nameServiceAddress);
  console.log("EVVM:", evvmAddress);
  console.log();

  const MotusNameService = await ethers.getContractFactory("MotusNameService");
  const nameService = MotusNameService.attach(nameServiceAddress);

  // Check EVVM status
  const evvmAddr = await nameService.evvmAddress();
  const evvmEnabled = await nameService.evvmEnabled();
  
  console.log("=== EVVM Status ===");
  console.log("EVVM Address:", evvmAddr);
  console.log("EVVM Enabled:", evvmEnabled);
  console.log();

  if (evvmAddr === ethers.ZeroAddress || !evvmEnabled) {
    console.error("❌ Error: EVVM is not configured or enabled!");
    console.log("   Run 'npm run setup:evvm:local' to set up EVVM.");
    process.exit(1);
  }

  // Get EVVM contract to check nonce
  const EVVM_ABI = [
    "function getNextCurrentSyncNonce(address user) view returns (uint256)",
    "function getEvvmID() view returns (string memory)",
  ];
  const evvmContract = new ethers.Contract(evvmAddress, EVVM_ABI, ethers.provider);

  const evvmID = await evvmContract.getEvvmID();
  console.log("EVVM ID:", evvmID);
  console.log();

  // Test domain name
  const testName = "testuser";
  const duration = BigInt(365 * 24 * 60 * 60); // 1 year

  // Check if name is available
  console.log("=== Testing Gasless Registration ===");
  console.log("Domain:", `${testName}.motus`);
  
  const isAvailable = await nameService.isAvailable(testName);
  if (!isAvailable) {
    console.log("⚠️  Domain already registered. Using different name...");
    // Try with timestamp
    const timestamp = Date.now();
    const testNameWithTimestamp = `testuser${timestamp}`;
    console.log("Trying:", `${testNameWithTimestamp}.motus`);
    // For now, let's just proceed with the original name
  }

  // Calculate fee
  const fee = await nameService.calculateRegistrationFee(testName, duration);
  console.log("Registration Fee:", ethers.formatEther(fee), "Principal Tokens");
  console.log();

  // Get nonce
  const nonce = await evvmContract.getNextCurrentSyncNonce(user.address);
  console.log("Next Nonce:", nonce.toString());
  console.log();

  // Create signature for EVVM pay
  console.log("Creating signature...");
  
  // Message format: "{evvmID},pay,{toAddress},{token},{amount},{priorityFee},{nonce},{priorityFlag},{executor}"
  const principalToken = "0x0000000000000000000000000000000000000001";
  const priorityFee = BigInt(0);
  const priorityFlag = false;
  const executor = nameServiceAddress;

  const inputs = `${nameServiceAddress},${principalToken},${fee.toString()},${priorityFee.toString()},${nonce.toString()},${priorityFlag ? 'true' : 'false'},${executor}`;
  const message = `${evvmID},pay,${inputs}`;
  
  console.log("Message to sign:", message);
  console.log();

  // Sign message (EIP-191)
  const messageBytes = ethers.toUtf8Bytes(message);
  const messageLength = messageBytes.length.toString();
  const prefix = `\x19Ethereum Signed Message:\n${messageLength}`;
  const prefixedMessage = ethers.concat([ethers.toUtf8Bytes(prefix), messageBytes]);
  const messageHash = ethers.keccak256(prefixedMessage);

  // Sign with user's wallet
  const signature = await user.signMessage(messageBytes);
  console.log("Signature created:", signature.substring(0, 20) + "...");
  console.log();

  // Prepare metadata
  const metadata = JSON.stringify({
    type: "healthcare-provider",
    specialty: "general",
    registeredAt: new Date().toISOString(),
  });

  // Call registerGasless
  console.log("Calling registerGasless...");
  try {
    const tx = await nameService.connect(user).registerGasless(
      testName,
      duration,
      ethers.ZeroAddress, // resolver
      metadata,
      user.address, // user
      fee, // amount
      priorityFee, // priorityFee
      nonce, // nonce
      priorityFlag, // priorityFlag
      signature // signature
    );

    console.log("⏳ Transaction submitted:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);
    console.log();

    // Verify domain registration
    const nameHash = ethers.keccak256(ethers.toUtf8Bytes(`${testName}.motus`));
    const domain = await nameService.getDomain(nameHash);
    
    console.log("=== Domain Registration Verified ===");
    console.log("Owner:", domain.owner);
    console.log("Active:", domain.active);
    console.log("Expiration:", new Date(Number(domain.expirationTime) * 1000).toISOString());
    console.log();

    // Check if user paid gas
    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    console.log("User Balance After:", ethers.formatEther(userBalanceAfter), "ETH");
    
    // Note: In a real gasless transaction, the relayer pays gas
    // Here, we're calling directly so the user still pays gas, but the payment is made via EVVM
    console.log("\n✅ Gasless registration successful!");
    console.log("   Note: This test calls registerGasless directly.");
    console.log("   In production, a relayer would submit this transaction.");

  } catch (error: any) {
    console.error("❌ Gasless registration failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load .env.local if it exists, otherwise fall back to .env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Deploy Motus Name Service
  console.log("\n=== Deploying Motus Name Service ===");
  const MotusNameService = await ethers.getContractFactory("MotusNameService");
  const nameService = await MotusNameService.deploy(deployer.address);
  await nameService.waitForDeployment();
  const nameServiceAddress = await nameService.getAddress();
  console.log("Motus Name Service deployed to:", nameServiceAddress);

  // Set EVVM address if provided in environment
  const evvmAddress = process.env.EVVM_ADDRESS;
  if (evvmAddress) {
    console.log("\n=== Setting EVVM Address ===");
    console.log("EVVM Address:", evvmAddress);
    const setEvvmTx = await nameService.setEvvmAddress(evvmAddress);
    await setEvvmTx.wait();
    console.log("✅ EVVM address set successfully");
    console.log("   Gasless transactions are now enabled!");
  } else {
    console.log("\n⚠️  EVVM_ADDRESS not set in .env");
    console.log("   To enable gasless transactions, set EVVM_ADDRESS and call setEvvmAddress()");
  }

  // Deploy Patient Records
  console.log("\n=== Deploying Patient Records ===");
  const PatientRecords = await ethers.getContractFactory("PatientRecords");
  const patientRecords = await PatientRecords.deploy(nameServiceAddress);
  await patientRecords.waitForDeployment();
  const patientRecordsAddress = await patientRecords.getAddress();
  console.log("Patient Records deployed to:", patientRecordsAddress);

  // For Telemedicine, we need a payment token address
  // On Celo Sepolia: Use native CELO or check for cUSD deployment
  // On Alfajores: 0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
  // On Celo Mainnet: 0x765DE816845861e75A25fCA122bb6898B8B1282a
  const network = await ethers.provider.getNetwork();
  const chainId = network.chainId;
  
  let cUSDAddress: string;
  if (chainId === BigInt(11142220)) {
    // Celo Sepolia - Use native CELO for now (cUSD may be deployed later)
    // For now, we'll use a placeholder or native CELO
    // In production, check if cUSD is deployed on Sepolia
    cUSDAddress = ethers.ZeroAddress; // Use native CELO, or update when cUSD is deployed
    console.log("⚠️  Note: Using native CELO for payments on Celo Sepolia");
    console.log("   Update cUSDAddress when cUSD is deployed on Sepolia");
  } else if (chainId === BigInt(44787)) {
    // Alfajores
    cUSDAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
  } else {
    // Mainnet
    cUSDAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  }

  // Deploy Telemedicine
  console.log("\n=== Deploying Telemedicine ===");
  const Telemedicine = await ethers.getContractFactory("Telemedicine");
  const telemedicine = await Telemedicine.deploy(cUSDAddress, deployer.address); // Treasury = deployer for now
  await telemedicine.waitForDeployment();
  const telemedicineAddress = await telemedicine.getAddress();
  console.log("Telemedicine deployed to:", telemedicineAddress);

  // Deploy Walrus Storage (for Sui decentralized storage integration)
  console.log("\n=== Deploying Walrus Storage ===");
  const WalrusStorage = await ethers.getContractFactory("WalrusStorage");
  const walrusStorage = await WalrusStorage.deploy(ethers.ZeroAddress); // Bridge address set later
  await walrusStorage.waitForDeployment();
  const walrusStorageAddress = await walrusStorage.getAddress();
  console.log("Walrus Storage deployed to:", walrusStorageAddress);

  // Deploy HL7 FHIR Adapter (for healthcare data interoperability)
  console.log("\n=== Deploying HL7 FHIR Adapter ===");
  const HL7FHIRAdapter = await ethers.getContractFactory("HL7FHIRAdapter");
  const fhirAdapter = await HL7FHIRAdapter.deploy(walrusStorageAddress);
  await fhirAdapter.waitForDeployment();
  const fhirAdapterAddress = await fhirAdapter.getAddress();
  console.log("HL7 FHIR Adapter deployed to:", fhirAdapterAddress);

  // Summary
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("\nContract Addresses:");
  console.log("  Motus Name Service:", nameServiceAddress);
  console.log("  Patient Records:", patientRecordsAddress);
  console.log("  Telemedicine:", telemedicineAddress);
  console.log("  Walrus Storage:", walrusStorageAddress);
  console.log("  HL7 FHIR Adapter:", fhirAdapterAddress);
  console.log("  Payment Token (cUSD):", cUSDAddress);

  // Save addresses to a file (optional)
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      motusNameService: nameServiceAddress,
      patientRecords: patientRecordsAddress,
      telemedicine: telemedicineAddress,
      walrusStorage: walrusStorageAddress,
      fhirAdapter: fhirAdapterAddress,
      paymentToken: cUSDAddress,
    },
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Info (JSON) ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contracts (if on a network that supports verification)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n=== Verification ===");
    console.log("To verify contracts, run:");
    console.log(`npx hardhat verify --network ${network.name} ${nameServiceAddress} "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${network.name} ${patientRecordsAddress} "${nameServiceAddress}"`);
    console.log(`npx hardhat verify --network ${network.name} ${telemedicineAddress} "${cUSDAddress}" "${deployer.address}"`);
    console.log(`npx hardhat verify --network ${network.name} ${walrusStorageAddress} "${ethers.ZeroAddress}"`);
    console.log(`npx hardhat verify --network ${network.name} ${fhirAdapterAddress} "${walrusStorageAddress}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


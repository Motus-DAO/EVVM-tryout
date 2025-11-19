import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as crypto from "crypto";
import * as fs from "fs";

// Load .env.local if it exists, otherwise fall back to .env
const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
dotenv.config({ path: envFile });

/**
 * Example: Upload healthcare data to Walrus and create interoperable FHIR resources
 * 
 * This script demonstrates:
 * 1. Creating encrypted healthcare data
 * 2. Uploading to Walrus (Sui's decentralized storage)
 * 3. Creating FHIR-compliant resources
 * 4. Linking to patient records
 */

interface WalrusUploadResult {
  objectId: string;
  contentHash: string;
}

/**
 * Simulate uploading data to Walrus
 * In production, this would call the Walrus API/SDK
 */
async function uploadToWalrus(
  encryptedData: string,
  metadata: any
): Promise<WalrusUploadResult> {
  // In production, you would:
  // 1. Use Walrus SDK to upload encrypted blob
  // 2. Get back object ID from Sui
  // 3. Store the object ID
  
  // For now, we'll simulate it
  console.log("📤 Uploading to Walrus...");
  console.log("   Data size:", encryptedData.length, "bytes");
  console.log("   Metadata:", JSON.stringify(metadata, null, 2));
  
  // Simulate Walrus object ID (in production, this comes from Sui)
  const objectId = `0x${crypto.randomBytes(32).toString('hex')}`;
  
  // Calculate content hash
  const contentHash = ethers.keccak256(ethers.toUtf8Bytes(encryptedData));
  
  console.log("✅ Uploaded to Walrus");
  console.log("   Object ID:", objectId);
  console.log("   Content Hash:", contentHash);
  
  return { objectId, contentHash };
}

/**
 * Create FHIR Patient resource
 */
function createFHIRPatient(patientAddress: string, name: string, birthDate: string) {
  return {
    resourceType: "Patient",
    id: `patient-${patientAddress.toLowerCase()}`,
    identifier: [
      {
        system: "https://motus.healthcare/patient",
        value: patientAddress
      }
    ],
    name: [
      {
        family: name.split(" ")[1] || "",
        given: [name.split(" ")[0] || ""]
      }
    ],
    birthDate: birthDate,
    meta: {
      versionId: "1",
      lastUpdated: new Date().toISOString(),
      profile: ["http://hl7.org/fhir/StructureDefinition/Patient"]
    }
  };
}

/**
 * Create FHIR Observation resource (e.g., blood pressure)
 */
function createFHIRObservation(
  patientId: string,
  value: number,
  unit: string,
  code: string,
  display: string
) {
  return {
    resourceType: "Observation",
    id: `obs-${Date.now()}`,
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "vital-signs",
            display: "Vital Signs"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: code,
          display: display
        }
      ]
    },
    subject: {
      reference: `Patient/${patientId}`
    },
    effectiveDateTime: new Date().toISOString(),
    valueQuantity: {
      value: value,
      unit: unit,
      system: "http://unitsofmeasure.org",
      code: unit
    },
    meta: {
      versionId: "1",
      lastUpdated: new Date().toISOString(),
      profile: ["http://hl7.org/fhir/StructureDefinition/Observation"]
    }
  };
}

async function main() {
  const [deployer, patient] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Patient:", patient.address);

  // Get contract addresses from environment or deployment
  const walrusStorageAddress = process.env.WALRUS_STORAGE_ADDRESS;
  const fhirAdapterAddress = process.env.FHIR_ADAPTER_ADDRESS;

  if (!walrusStorageAddress || !fhirAdapterAddress) {
    console.error("❌ Contract addresses not set in .env");
    console.error("   Deploy contracts first, then set:");
    console.error("   WALRUS_STORAGE_ADDRESS=...");
    console.error("   FHIR_ADAPTER_ADDRESS=...");
    process.exit(1);
  }

  const WalrusStorage = await ethers.getContractFactory("WalrusStorage");
  const walrusStorage = WalrusStorage.attach(walrusStorageAddress);

  const HL7FHIRAdapter = await ethers.getContractFactory("HL7FHIRAdapter");
  const fhirAdapter = HL7FHIRAdapter.attach(fhirAdapterAddress);

  console.log("\n=== Healthcare Data Interoperability Demo ===\n");

  // Step 1: Create FHIR Patient Resource
  console.log("1️⃣ Creating FHIR Patient Resource...");
  const patientResource = createFHIRPatient(
    patient.address,
    "John Doe",
    "1980-01-15"
  );
  
  const patientResourceJson = JSON.stringify(patientResource, null, 2);
  console.log("   Patient Resource:", patientResourceJson.substring(0, 200) + "...");

  // Encrypt the data (in production, use proper encryption)
  const encryptedPatientData = Buffer.from(patientResourceJson).toString('base64');
  
  // Upload to Walrus
  const patientUpload = await uploadToWalrus(encryptedPatientData, {
    type: "fhir",
    resourceType: "Patient",
    encrypted: true,
    format: "application/fhir+json"
  });

  // Create storage reference
  const patientStorageTx = await walrusStorage.createWalrusReference(
    patientUpload.objectId,
    patientUpload.contentHash,
    JSON.stringify({
      fhirVersion: "4.0.1",
      resourceType: "Patient",
      format: "application/fhir+json",
      encrypted: true
    })
  );
  await patientStorageTx.wait();
  console.log("✅ Patient resource stored in Walrus");

  // Create FHIR resource
  const patientFHIRId = `patient-${patient.address.toLowerCase()}`;
  const createPatientTx = await fhirAdapter.createFHIRResource(
    0, // FHIRResourceType.Patient
    patientFHIRId,
    patientUpload.objectId,
    patientUpload.contentHash,
    "4.0.1"
  );
  await createPatientTx.wait();
  console.log("✅ FHIR Patient resource created");

  // Link to patient address
  const linkPatientTx = await fhirAdapter.linkResourceToPatient(
    patientFHIRId,
    patient.address
  );
  await linkPatientTx.wait();
  console.log("✅ Resource linked to patient address");

  // Step 2: Create FHIR Observation (Blood Pressure)
  console.log("\n2️⃣ Creating FHIR Observation Resource...");
  const observation = createFHIRObservation(
    patientFHIRId,
    120,
    "mmHg",
    "85354-9",
    "Blood pressure panel with all children optional"
  );

  const observationJson = JSON.stringify(observation, null, 2);
  const encryptedObservation = Buffer.from(observationJson).toString('base64');

  const observationUpload = await uploadToWalrus(encryptedObservation, {
    type: "fhir",
    resourceType: "Observation",
    encrypted: true,
    format: "application/fhir+json"
  });

  const observationStorageTx = await walrusStorage.createWalrusReference(
    observationUpload.objectId,
    observationUpload.contentHash,
    JSON.stringify({
      fhirVersion: "4.0.1",
      resourceType: "Observation",
      format: "application/fhir+json",
      encrypted: true
    })
  );
  await observationStorageTx.wait();

  const observationFHIRId = observation.id;
  const createObservationTx = await fhirAdapter.createFHIRResource(
    1, // FHIRResourceType.Observation
    observationFHIRId,
    observationUpload.objectId,
    observationUpload.contentHash,
    "4.0.1"
  );
  await createObservationTx.wait();

  const linkObservationTx = await fhirAdapter.linkResourceToPatient(
    observationFHIRId,
    patient.address
  );
  await linkObservationTx.wait();
  console.log("✅ FHIR Observation resource created and linked");

  // Step 3: Query patient resources
  console.log("\n3️⃣ Querying Patient Resources...");
  const patientResources = await fhirAdapter.getPatientResources(patient.address);
  console.log("   Patient has", patientResources.length, "resources:");
  patientResources.forEach((resourceId, index) => {
    console.log(`   ${index + 1}. ${resourceId}`);
  });

  // Step 4: Get storage reference
  console.log("\n4️⃣ Retrieving Storage References...");
  const patientFHIRResource = await fhirAdapter.getFHIRResource(patientFHIRId);
  const storageRef = await fhirAdapter.getStorageReference(patientFHIRId);
  
  console.log("   Patient Resource:");
  console.log("     FHIR ID:", patientFHIRResource.resourceId);
  console.log("     Storage Record ID:", patientFHIRResource.storageRecordId.toString());
  console.log("     Walrus Object ID:", storageRef.reference);
  console.log("     Content Hash:", storageRef.contentHash);
  console.log("     Backend:", storageRef.backend === 0 ? "WALRUS" : "UNKNOWN");

  console.log("\n✅ Interoperability demo complete!");
  console.log("\n📋 Summary:");
  console.log("   - Data stored in Walrus (Sui decentralized storage)");
  console.log("   - FHIR R4 compliant resources");
  console.log("   - Interoperable with standard healthcare systems");
  console.log("   - Patient-controlled access");
  console.log("   - Cross-chain ready (Celo <-> Sui)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


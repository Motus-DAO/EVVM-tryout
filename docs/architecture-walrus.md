# Healthcare EVVM Architecture with Walrus & Interoperability

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CELO BLOCKCHAIN                           │
│                                                              │
│  ┌──────────────────┐    ┌──────────────────┐                │
│  │ Motus Name       │    │ Patient Records  │                │
│  │ Service          │    │                  │                │
│  │ (gerry.motus)    │    │ - Access Control │                │
│  └────────┬─────────┘    │ - Consent Mgmt   │                │
│           │              └────────┬──────────┘                │
│           │                      │                            │
│           │              ┌───────▼──────────┐                │
│           │              │ HL7 FHIR Adapter │                │
│           │              │ - FHIR R4        │                │
│           │              │ - Resource Mgmt  │                │
│           │              └───────┬──────────┘                │
│           │                      │                            │
│           │              ┌───────▼──────────┐                │
│           │              │ Walrus Storage   │                │
│           │              │ - References     │                │
│           │              │ - Content Hash   │                │
│           │              └───────┬──────────┘                │
│           │                      │                            │
└───────────┼──────────────────────┼──────────────────────────┘
            │                      │
            │              ┌───────▼──────────┐
            │              │ Cross-Chain      │
            │              │ Bridge           │
            │              │ (Celo ↔ Sui)    │
            │              └───────┬──────────┘
            │                      │
┌───────────┼──────────────────────┼──────────────────────────┐
│           │                      │                          │
│           │              ┌───────▼──────────┐              │
│           │              │   SUI BLOCKCHAIN  │              │
│           │              │                  │              │
│           │              │  ┌─────────────┐ │              │
│           │              │  │   Walrus    │ │              │
│           │              │  │   Storage   │ │              │
│           │              │  │             │ │              │
│           │              │  │ - Encrypted │ │              │
│           │              │  │   Data      │ │              │
│           │              │  │ - Object ID │ │              │
│           │              │  │ - Proofs    │ │              │
│           │              │  └─────────────┘ │              │
│           │              └──────────────────┘              │
│           │                                                  │
└───────────┼──────────────────────────────────────────────────┘
            │
            │
┌───────────▼──────────────────────────────────────────────────┐
│                    EXTERNAL SYSTEMS                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ EHR Systems  │  │ Lab Systems  │  │ Imaging      │      │
│  │ (Epic, Cerner)│  │              │  │ (PACS)       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                  ┌────────▼─────────┐                        │
│                  │  FHIR API        │                        │
│                  │  (REST/GraphQL)  │                        │
│                  └──────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Patient Record

### Step 1: Data Preparation
```typescript
// 1. Create FHIR Patient resource
const patientResource = {
  resourceType: "Patient",
  id: "patient-123",
  name: [{ family: "Doe", given: ["John"] }],
  birthDate: "1980-01-15",
  // ... more fields
};

// 2. Convert to JSON
const fhirJson = JSON.stringify(patientResource);

// 3. Encrypt data (AES-256)
const encrypted = encrypt(fhirJson, patientKey);

// 4. Calculate content hash
const contentHash = sha256(encrypted);
```

### Step 2: Upload to Walrus (Sui)
```typescript
// 5. Upload to Walrus via bridge
const walrusClient = new WalrusClient();
const objectId = await walrusClient.upload(
  encrypted,
  {
    contentType: "application/fhir+json",
    encrypted: true,
    fhirVersion: "4.0.1"
  }
);
// Returns: "0x1234..." (Sui object ID)
```

### Step 3: Store Reference on Celo
```solidity
// 6. Create storage reference on Celo
walrusStorage.createWalrusReference(
    objectId,      // From Sui
    contentHash,   // SHA-256
    metadata       // JSON metadata
);

// 7. Create FHIR resource record
fhirAdapter.createFHIRResource(
    FHIRResourceType.Patient,
    "patient-123",
    objectId,
    contentHash,
    "4.0.1"
);

// 8. Link to patient address
fhirAdapter.linkResourceToPatient(
    "patient-123",
    patientAddress
);
```

### Step 4: Access Control
```solidity
// 9. Patient grants consent
patientRecords.grantConsent(
    doctorAddress,
    "read",
    365 days
);
```

## Data Flow: Retrieving a Patient Record

### Step 1: Authorization Check
```solidity
// 1. Check consent on Celo
bool hasConsent = patientRecords.hasConsent(
    patientAddress,
    doctorAddress,
    "read"
);
require(hasConsent, "No consent");
```

### Step 2: Get Storage Reference
```solidity
// 2. Get FHIR resource
FHIRResource memory resource = fhirAdapter.getFHIRResource("patient-123");

// 3. Get storage reference
StorageReference memory storageRef = fhirAdapter.getStorageReference("patient-123");
// Returns: { backend: WALRUS, reference: "0x1234...", contentHash: "0x..." }
```

### Step 3: Retrieve from Walrus
```typescript
// 4. Retrieve from Walrus via bridge
const encrypted = await walrusClient.retrieve(storageRef.reference);

// 5. Verify content hash
const retrievedHash = sha256(encrypted);
require(retrievedHash === storageRef.contentHash, "Data tampered");

// 6. Decrypt
const fhirJson = decrypt(encrypted, patientKey);

// 7. Parse FHIR resource
const patientResource = JSON.parse(fhirJson);
```

## Interoperability Features

### 1. FHIR R4 Compliance
- **Standard Format**: All data stored as FHIR R4 resources
- **Resource Types**: Patient, Observation, Condition, Medication, etc.
- **Versioning**: Support for resource versioning
- **Profiles**: Standard FHIR profiles for validation

### 2. Multi-Backend Support
- **Walrus**: Primary storage (Sui)
- **IPFS**: Fallback or hybrid storage
- **Arweave**: Long-term archival
- **Hybrid**: Multiple backends for redundancy

### 3. Cross-Chain Bridge
- **Celo → Sui**: Upload data to Walrus
- **Sui → Celo**: Retrieve data from Walrus
- **Security**: Cryptographic proofs and verification
- **Reliability**: Multiple bridge operators

### 4. External System Integration
- **FHIR API**: RESTful API for EHR systems
- **HL7 v2**: Conversion layer for legacy systems
- **DICOM**: Medical imaging support
- **Standards**: ICD-10, SNOMED CT, LOINC

## Security Architecture

### Encryption Layers
```
┌─────────────────────────────────────┐
│   Application Layer                 │
│   - User Interface                  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Access Control Layer (Celo)       │
│   - Smart Contract Permissions      │
│   - Consent Management              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Encryption Layer                  │
│   - AES-256 Encryption              │
│   - Key Management (DKMS)           │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Storage Layer (Walrus/Sui)         │
│   - Encrypted Blobs                 │
│   - Availability Proofs              │
└──────────────────────────────────────┘
```

### Key Management
- **Distributed Key Management System (DKMS)**
- **Patient-Controlled Keys**: Patients own encryption keys
- **Key Sharing**: Secure key sharing with providers
- **Key Rotation**: Regular key rotation for security
- **Backup**: Secure key backup and recovery

## Benefits of This Architecture

### 1. Decentralization
- **No Single Point of Failure**: Data distributed across nodes
- **Censorship Resistant**: No central authority
- **Global Access**: Access from anywhere

### 2. Interoperability
- **FHIR Standards**: Works with existing healthcare systems
- **Multi-Chain**: Celo and Sui integration
- **API Compatibility**: Standard REST/GraphQL APIs

### 3. Cost Efficiency
- **Lower Storage Costs**: Walrus is cost-effective
- **Gas Optimization**: Minimal on-chain storage
- **Scalability**: Handle large datasets

### 4. Security & Privacy
- **Encryption**: End-to-end encryption
- **Access Control**: Patient-controlled access
- **Audit Trails**: Immutable access logs
- **Compliance**: HIPAA, GDPR compliant design

### 5. Innovation
- **Modern Technology**: Blockchain and decentralized storage
- **Future-Proof**: Extensible architecture
- **AI/ML Ready**: Support for research and analytics

## Implementation Roadmap

### Phase 1: Foundation ✅
- [x] WalrusStorage contract
- [x] HL7FHIRAdapter contract
- [x] Basic integration scripts

### Phase 2: Bridge Development
- [ ] Cross-chain bridge (Celo ↔ Sui)
- [ ] Bridge security audits
- [ ] Multi-operator setup

### Phase 3: Walrus SDK Integration
- [ ] Walrus SDK integration
- [ ] Upload/retrieve functions
- [ ] Error handling and retries

### Phase 4: FHIR API
- [ ] RESTful FHIR API
- [ ] GraphQL endpoint
- [ ] Authentication and authorization

### Phase 5: External Integration
- [ ] EHR system connectors
- [ ] Lab system integration
- [ ] Imaging system (DICOM) support

### Phase 6: Production
- [ ] Security audits
- [ ] Compliance review
- [ ] Performance testing
- [ ] Production deployment

## Conclusion

This architecture combines:
- **EVVM on Celo**: Smart contracts and access control
- **Walrus on Sui**: Decentralized storage
- **FHIR Standards**: Healthcare interoperability
- **Cross-Chain Bridge**: Seamless data flow

Result: A secure, interoperable, cost-effective healthcare data system that respects patient privacy while enabling seamless data exchange.


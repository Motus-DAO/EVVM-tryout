# Deployed Contract Addresses

## Celo Sepolia Testnet (Chain ID: 11142220)

**Deployment Date:** December 10, 2025  
**Deployer:** `0x64608C2d5E4685830348e9155bAB423bf905E9c9`

### Contract Addresses

| Contract | Address | Status |
|----------|---------|--------|
| **MotusNameService** | `0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1` | ✅ Deployed |
| **PatientRecords** | `0xFe9d2AdFE34B9D9115e4C5Bd59819356A3230498` | ✅ Deployed |
| **Telemedicine** | `0x41109C2BB4C129C5c35556320C0B5951F0fCBFd1` | ✅ Deployed |
| **WalrusStorage** | `0x26B7922d63B19368872C4b44F1B26af458f2392A` | ✅ Deployed |
| **HL7FHIRAdapter** | `0x7daee3E3dfa966D649752a14f41D988Bf996F0B4` | ✅ Deployed |

### EVVM Configuration

- **EVVM Address:** `0xfc99769602914d649144f6b2397e2aa528b2878d`
- **EVVM Status:** ⚠️ Not yet configured on MotusNameService
- **Action Required:** Run `scripts/configure-evvm.ts` to enable gasless transactions

### View on CeloScan

- MotusNameService: https://celoscan.io/address/0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1
- PatientRecords: https://celoscan.io/address/0xFe9d2AdFE34B9D9115e4C5Bd59819356A3230498
- Telemedicine: https://celoscan.io/address/0x41109C2BB4C129C5c35556320C0B5951F0fCBFd1

### Environment Variables

**Backend (.env / .env.local):**
```bash
MOTUS_NAME_SERVICE_ADDRESS=0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1
PATIENT_RECORDS_ADDRESS=0xFe9d2AdFE34B9D9115e4C5Bd59819356A3230498
TELEMEDICINE_ADDRESS=0x41109C2BB4C129C5c35556320C0B5951F0fCBFd1
WALRUS_STORAGE_ADDRESS=0x26B7922d63B19368872C4b44F1B26af458f2392A
FHIR_ADAPTER_ADDRESS=0x7daee3E3dfa966D649752a14f41D988Bf996F0B4
EVVM_ADDRESS=0xfc99769602914d649144f6b2397e2aa528b2878d
```

**Frontend (frontend/.env.local):**
```bash
NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS=0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1
NEXT_PUBLIC_EVVM_ADDRESS=0xfc99769602914d649144f6b2397e2aa528b2878d
NEXT_PUBLIC_NETWORK=celoSepolia
```

### Previous Deployment (Old Addresses - Replaced)

| Contract | Old Address | Status |
|----------|-------------|--------|
| MotusNameService | `0x7b2a5c1E00B62A47dcF89cB4A4868e344bAf3736` | ❌ Replaced |
| PatientRecords | `0x3b5B974d560dd7281aEFE0425daBDEFEcA8B9e57` | ❌ Replaced |
| Telemedicine | `0xCd28Fa8d0071E004C976dFF1d3f688D02e52EE8c` | ❌ Replaced |

### Next Steps

1. ✅ Contract addresses updated in `.env` and `.env.local`
2. ✅ Frontend updated with new contract address
3. ⏳ Configure EVVM on MotusNameService (run `scripts/configure-evvm.ts`)
4. ⏳ Test contract interactions
5. ⏳ Verify contracts on CeloScan (optional)


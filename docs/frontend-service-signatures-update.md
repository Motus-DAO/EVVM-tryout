# Frontend Service Signatures Update ✅

## Summary

Successfully updated the frontend to create service signatures for EVVM gasless transactions, matching the new contract implementation.

## Changes Made

### 1. Updated `frontend/lib/evvm.ts`

#### Added New Functions

**`signServiceFunction()`** - Creates service signatures
```typescript
signServiceFunction(signer, evvmID, functionName, params)
```
- Message format: `"<evvmID>,<functionName>,<params>"`
- Uses EIP-191 standard signing

**`generateServiceNonce()`** - Generates async nonces
```typescript
generateServiceNonce(): bigint
```
- Uses timestamp + random number for uniqueness
- Async nonces can be any unused number (unlike sync nonces which must be sequential)

**`isServiceNonceUsed()`** - Checks if a service nonce has been used
```typescript
isServiceNonceUsed(provider, contractAddress, userAddress, nonce)
```

#### Updated Functions

**`createGaslessRegistration()`** - Now creates both signatures
- **Before**: Only created EVVM payment signature
- **After**: Creates both service signature AND EVVM payment signature
- Uses separate nonces for service and EVVM payment
- Returns updated args array matching new contract signature

**New Signature:**
```typescript
createGaslessRegistration(
  signer, evvmID, name, duration, resolver, metadata,
  amount, priorityFee, contractAddress, provider, evvmAddress
)
```

**`getEvvmID()`** - Updated to handle both uint256 and string return types
- Tries uint256 first (new format)
- Falls back to string (old format for compatibility)

#### Added New Helper Functions

**`createGaslessRenewal()`** - Creates renewal with service signature
```typescript
createGaslessRenewal(
  signer, evvmID, nameHash, duration, amount,
  priorityFee, contractAddress, provider, evvmAddress
)
```

**`createGaslessTransfer()`** - Creates transfer with service signature
```typescript
createGaslessTransfer(
  signer, evvmID, nameHash, newOwner, contractAddress
)
```

### 2. Updated `frontend/lib/contracts.ts`

#### Updated Contract ABI

**Added new function signatures:**
- `registerGasless` - Updated to new signature with separate service/EVVM params
- `renewGasless` - Added full signature
- `transferGasless` - Added full signature
- `isServiceNonceUsed` - Added view function
- `calculateRenewalFee` - Added view function

**New `registerGasless` signature:**
```typescript
'function registerGasless(string name, uint256 duration, address resolver, string metadata, address user, uint256 amount, uint256 nonce, bytes signature, uint256 priorityFee_EVVM, uint256 nonce_EVVM, bool priorityFlag_EVVM, bytes signature_EVVM)'
```

### 3. Updated `frontend/app/components/RegisterCard.tsx`

#### Updated Registration Flow

**Before:**
```typescript
const nonce = await getNextNonce(provider, evvmAddress, account)
const gaslessData = await createGaslessRegistration(
  signerInstance, evvmID, domainName, durationSeconds,
  DEFAULT_RESOLVER, DEFAULT_METADATA, calculatedFee,
  BigInt(0), nonce, CONTRACT_ADDRESS
)
```

**After:**
```typescript
const gaslessData = await createGaslessRegistration(
  signerInstance, evvmID, domainName, durationSeconds,
  DEFAULT_RESOLVER, DEFAULT_METADATA, calculatedFee,
  BigInt(0), CONTRACT_ADDRESS, provider, evvmAddress
)
// No need to manually get nonce - function handles it internally
```

## How It Works

### Service Signature Creation

1. **Generate Service Nonce**: Creates a unique async nonce using timestamp + random
2. **Build Service Message**: `"<evvmID>,registerGasless,<name>,<duration>,<amount>,<nonce>"`
3. **Sign Service Message**: User signs the service message (EIP-191)
4. **Get EVVM Payment Nonce**: Gets next sequential sync nonce from EVVM contract
5. **Build EVVM Payment Message**: `"<evvmID>,pay,<toAddress>,<token>,<amount>,<priorityFee>,<nonce>,<priorityFlag>,<executor>"`
6. **Sign EVVM Payment Message**: User signs the EVVM payment message
7. **Return Both Signatures**: Returns args array with both signatures

### Message Format Examples

**Service Signature for Registration:**
```
"1047,registerGasless,health-provider,31536000,10000000000000000,1234567890123456789"
```

**Service Signature for Renewal:**
```
"1047,renewGasless,0xabc123...,31536000,5000000000000000,1234567890123456790"
```

**Service Signature for Transfer:**
```
"1047,transferGasless,0xabc123...,0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb,1234567890123456791"
```

## Security Improvements

1. ✅ **Service Authorization**: Users must sign specific function calls
2. ✅ **Replay Prevention**: Async nonces prevent transaction replay
3. ✅ **Separate Concerns**: Service nonce separate from EVVM payment nonce
4. ✅ **Nonce Validation**: Can check if nonce is used before submitting

## Usage Examples

### Register Domain (Gasless)

```typescript
import { createGaslessRegistration, getEvvmID, getProvider } from '@/lib/evvm'

const provider = await getProvider()
const signer = await provider.getSigner()
const evvmID = await getEvvmID(provider, evvmAddress)

const gaslessData = await createGaslessRegistration(
  signer,
  evvmID,
  'health-provider',
  BigInt(365 * 24 * 60 * 60), // 1 year
  ethers.ZeroAddress,
  JSON.stringify({ type: 'healthcare' }),
  BigInt('10000000000000000'), // 0.01 tokens
  BigInt(0), // priority fee
  contractAddress,
  provider,
  evvmAddress
)

await contract.registerGasless(...gaslessData.args)
```

### Renew Domain (Gasless)

```typescript
import { createGaslessRenewal } from '@/lib/evvm'

const nameHash = ethers.keccak256(ethers.toUtf8Bytes('health-provider.motus'))
const renewalData = await createGaslessRenewal(
  signer,
  evvmID,
  nameHash,
  BigInt(365 * 24 * 60 * 60), // 1 year
  BigInt('5000000000000000'), // 0.005 tokens
  BigInt(0),
  contractAddress,
  provider,
  evvmAddress
)

await contract.renewGasless(...renewalData.args)
```

### Transfer Domain (Gasless)

```typescript
import { createGaslessTransfer } from '@/lib/evvm'

const nameHash = ethers.keccak256(ethers.toUtf8Bytes('health-provider.motus'))
const transferData = await createGaslessTransfer(
  signer,
  evvmID,
  nameHash,
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // new owner
  contractAddress
)

await contract.transferGasless(...transferData.args)
```

### Check Nonce Usage

```typescript
import { isServiceNonceUsed } from '@/lib/evvm'

const used = await isServiceNonceUsed(
  provider,
  contractAddress,
  userAddress,
  BigInt('1234567890123456789')
)

if (used) {
  console.log('Nonce already used, generate a new one')
}
```

## Breaking Changes

⚠️ **IMPORTANT**: The function signatures have changed!

**Before:**
```typescript
createGaslessRegistration(
  signer, evvmID, name, duration, resolver, metadata,
  amount, priorityFee, nonce, contractAddress
)
```

**After:**
```typescript
createGaslessRegistration(
  signer, evvmID, name, duration, resolver, metadata,
  amount, priorityFee, contractAddress, provider, evvmAddress
)
```

## Testing Checklist

- [ ] Test registration with service signature
- [ ] Test registration with invalid service signature (should fail)
- [ ] Test nonce reuse prevention
- [ ] Test renewal with service signature
- [ ] Test transfer with service signature
- [ ] Test nonce checking utility
- [ ] Test with different EVVM IDs
- [ ] Test error handling for missing wallet

## Files Modified

- ✅ `frontend/lib/evvm.ts` - Complete rewrite with service signatures
- ✅ `frontend/lib/contracts.ts` - Updated ABI
- ✅ `frontend/app/components/RegisterCard.tsx` - Updated to use new signature format

## Next Steps

1. **Add Renewal UI Component** - Create component for renewing domains
2. **Add Transfer UI Component** - Create component for transferring domains
3. **Add Nonce Validation** - Check nonce before submitting transaction
4. **Error Handling** - Better error messages for signature failures
5. **Transaction Status** - Show status of gasless transactions

## References

- Contract implementation: `contracts/core/MotusNameService.sol`
- EVVM documentation: https://www.evvm.info/docs/HowToMakeAEVVMService
- Implementation summary: `docs/evvm-service-implementation-summary.md`

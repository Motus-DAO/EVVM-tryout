# Troubleshooting: Contract Function Signature Mismatch

## Error Description

When trying to register a domain using gasless transactions, you may see this error:

```
missing revert data (action="estimateGas", data=null, reason=null, ...)
```

This error typically means:
1. **The contract at the deployed address doesn't have the updated code** with the new `registerGasless` function signature
2. **EVVM is not enabled** on the contract
3. **The contract needs to be redeployed** with the new implementation

## Root Cause

The contract code was updated to include:
- Service signature validation
- Async nonce management
- New function signature with separate service and EVVM payment parameters

However, the contract at address `0x7b2a5c1E00B62A47dcF89cB4A4868e344bAf3736` (or your deployed address) still has the old code.

## Solution

### Option 1: Redeploy the Contract (Recommended)

1. **Compile the updated contract:**
   ```bash
   cd /Users/main/EVVM-CELO-MOTUSNETWORK
   npx hardhat compile
   ```

2. **Deploy the new contract:**
   ```bash
   npx hardhat run scripts/deploy.ts --network celoSepolia
   ```

3. **Update the contract address in your frontend:**
   - Update `NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS` in your `.env` file
   - Or update `CONTRACT_ADDRESS` in `frontend/lib/contracts.ts`

4. **Configure EVVM on the new contract:**
   ```typescript
   // After deployment, call:
   await nameService.setEvvmAddress(evvmAddress)
   await nameService.setEvvmEnabled(true)
   ```

### Option 2: Update Existing Contract (If Upgradeable)

If your contract is upgradeable, you can update it:

1. **Deploy the new implementation**
2. **Upgrade the proxy** to point to the new implementation

### Option 3: Verify Contract Address

If you've already deployed a new version, make sure the frontend is using the correct address:

1. Check your deployment logs for the new contract address
2. Update `NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS` in `.env`
3. Restart your frontend server

## Verification Steps

### 1. Check Contract Has Updated Function

The frontend now includes automatic verification. If the contract doesn't have the updated function, you'll see:

```
Contract does not have the updated registerGasless function. 
Please redeploy the contract with the new code.
```

### 2. Check EVVM Configuration

Verify EVVM is enabled:

```typescript
const contract = await getContractReadOnly(CONTRACT_ADDRESS)
const evvmAddress = await contract.evvmAddress()
const evvmEnabled = await contract.evvmEnabled()

console.log('EVVM Address:', evvmAddress)
console.log('EVVM Enabled:', evvmEnabled)
```

### 3. Check Function Signature

Verify the contract has the new function:

```bash
# Get function selector for new signature
cast sig "registerGasless(string,uint256,address,string,address,uint256,uint256,bytes,uint256,uint256,bool,bytes)"
# Should return: 0xc7ef2325

# Check what the contract has
cast call <CONTRACT_ADDRESS> "registerGasless(string,uint256,address,string,address,uint256,uint256,bytes,uint256,uint256,bool,bytes)" --rpc-url <RPC_URL>
```

## Function Signature Comparison

### Old Signature (Not Working)
```solidity
function registerGasless(
    string memory name,
    uint256 duration,
    address resolver,
    string memory metadata,
    address user,
    uint256 amount,
    uint256 priorityFee,
    uint256 nonce,
    bool priorityFlag,
    bytes memory signature
)
```

**Function Selector:** `0xad611a8d` (or similar)

### New Signature (Required)
```solidity
function registerGasless(
    string memory name,
    uint256 duration,
    address resolver,
    string memory metadata,
    address user,
    uint256 amount,
    uint256 nonce,              // Service nonce
    bytes memory signature,     // Service signature
    uint256 priorityFee_EVVM,   // EVVM priority fee
    uint256 nonce_EVVM,         // EVVM payment nonce
    bool priorityFlag_EVVM,     // EVVM priority flag
    bytes memory signature_EVVM // EVVM payment signature
)
```

**Function Selector:** `0xc7ef2325`

## Error Messages Explained

### "missing revert data"
- **Cause:** Contract reverted but didn't provide a reason
- **Solution:** Usually means function doesn't exist or wrong signature

### "EVVM not enabled"
- **Cause:** `evvmEnabled` is false or `evvmAddress` is zero
- **Solution:** Call `setEvvmAddress()` and `setEvvmEnabled(true)`

### "Invalid signature"
- **Cause:** Service signature validation failed
- **Solution:** Make sure frontend is creating signatures correctly

### "Nonce already used"
- **Cause:** The service nonce has already been used
- **Solution:** Generate a new nonce

## Testing After Fix

1. **Check EVVM Status:**
   - The frontend should show "EVVM enabled" when configured correctly

2. **Try Registration:**
   - Enter a domain name
   - Check availability
   - Enable "Use EVVM Gasless Transaction"
   - Click "Register Domain"

3. **Verify Transaction:**
   - Transaction should submit successfully
   - Check transaction hash on block explorer
   - Verify domain is registered

## Prevention

To avoid this issue in the future:

1. **Always redeploy after contract changes** that modify function signatures
2. **Update frontend immediately** after deployment
3. **Test on testnet first** before mainnet
4. **Use version control** to track contract versions
5. **Document contract addresses** in deployment logs

## Related Files

- Contract: `contracts/core/MotusNameService.sol`
- Frontend: `frontend/lib/evvm.ts`
- Frontend Component: `frontend/app/components/RegisterCard.tsx`
- Contract ABI: `frontend/lib/contracts.ts`

## Need Help?

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Verify the contract address is correct
3. Ensure EVVM is properly configured
4. Check that you're on the correct network (Celo Sepolia)
5. Verify you have the latest code from the repository

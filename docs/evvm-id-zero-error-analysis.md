# EVVM ID Zero Error Analysis

## Problem Summary

You're encountering this error:
```
Using EVVM ID from contract: 0
Failed to submit transaction: execution reverted (unknown custom error) (action="estimateGas", data="0x2860e19a", ...)
```

## Root Cause

**The EVVM contract has an EVVM ID of 0, which is invalid.**

According to the [EVVM Signature Structures documentation](https://www.evvm.info/docs/SignatureStructures/Overview):

1. **EVVM ID Requirements:**
   - EVVM ID must be **1 or higher** (typically starts from 1000 after registration)
   - EVVM ID of 0 means the contract hasn't been registered with Registry EVVM
   - All signatures must use the correct EVVM ID

2. **Signature Format:**
   - Service signatures: `<evvmID>,<functionName>,<param1>,<param2>,...,<paramN>`
   - EVVM payment signatures: `<evvmID>,pay,<toAddress>,<token>,<amount>,<priorityFee>,<nonce>,<priorityFlag>,<executor>`

3. **What's Happening:**
   - Frontend gets EVVM ID = 0 from contract
   - Creates signatures with `"0,registerGasless,..."` and `"0,pay,..."`
   - Contract validates signatures using EVVM ID = 0
   - **EVVM payment validation fails** because EVVM ID 0 is not a valid registered ID
   - Error `0x2860e19a` is likely from the EVVM contract's `pay()` function rejecting the signature

## Solution

You need to **register your EVVM contract** and **set the EVVM ID**. Follow these steps:

### Step 1: Check Current EVVM ID

```bash
cd Testnet-Contracts
cast call <EVVM_ADDRESS> "getEvvmID()" --rpc-url <CELO_SEPOLIA_RPC>
```

If it returns `0`, proceed to registration.

### Step 2: Register with Registry EVVM

According to EVVM documentation, all EVVM deployments must register on **Ethereum Sepolia** to get an official EVVM ID.

**Prerequisites:**
- ETH on Ethereum Sepolia (for gas fees)
- Your EVVM contract address on Celo Sepolia
- Chain ID: 11142220 (Celo Sepolia)

**Registry Details:**
- **Contract**: `0x389dC8fb09211bbDA841D59f4a51160dA2377832`
- **Network**: Ethereum Sepolia
- **Function**: `registerEvvm(uint256 chainId, address evvmAddress)`
- **Returns**: Your unique EVVM ID (starts from 1000)

**Registration Script:**
```bash
cd Testnet-Contracts
tsx scripts/register-evvm.ts <EVVM_ADDRESS> 11142220
```

This will:
1. Connect to Ethereum Sepolia
2. Call `registerEvvm(11142220, <EVVM_ADDRESS>)`
3. Return your EVVM ID (e.g., 1047, 1048, etc.)

### Step 3: Set EVVM ID on Contract (WITHIN 1 HOUR!)

After registration, you **must** set the EVVM ID on your contract within 1 hour, or the window expires.

```bash
tsx scripts/set-evvm-id.ts <EVVM_ADDRESS> <YOUR_EVVM_ID> celo
```

**Important:** 
- The EVVM ID can only be changed within a 1-hour window after initial assignment
- After 1 hour, the EVVM ID becomes permanent
- If you miss the window, you'll need to redeploy the EVVM contract

### Step 4: Verify EVVM ID is Set

```bash
cast call <EVVM_ADDRESS> "getEvvmID()" --rpc-url <CELO_SEPOLIA_RPC>
```

Should return your registered EVVM ID (not 0).

### Step 5: Test Registration Again

After setting the EVVM ID:
1. Refresh your frontend
2. The console should show: `Using EVVM ID from contract: <YOUR_ID>` (not 0)
3. Try registering a domain again
4. Signatures will now be created with the correct EVVM ID

## Why This Happens

1. **New EVVM deployments start with ID = 0**
2. **Registration is required** to get a valid ID from Registry EVVM
3. **Signatures are invalid** when created with EVVM ID 0
4. **The EVVM contract's `pay()` function** validates signatures and rejects EVVM ID 0

## Prevention

To avoid this in the future:

1. **Always register EVVM immediately after deployment**
2. **Set the EVVM ID within 1 hour** of registration
3. **Add validation** in your frontend to warn if EVVM ID is 0:
   ```typescript
   if (evvmID === "0") {
     throw new Error('EVVM ID is not set. Please register the EVVM contract first.')
   }
   ```

## Related Documentation

- [EVVM Signature Structures Overview](https://www.evvm.info/docs/SignatureStructures/Overview)
- [How to Create an EVVM Service](https://www.evvm.info/docs/HowToCreateAEVVMService)
- [Registry EVVM](https://www.evvm.info/docs/RegistryEVVM)

## Files to Check

- `Testnet-Contracts/scripts/register-evvm.ts` - Registration script
- `Testnet-Contracts/scripts/set-evvm-id.ts` - Set EVVM ID script
- `frontend/lib/evvm.ts` - EVVM ID retrieval function
- `frontend/app/components/RegisterCard.tsx` - Registration component

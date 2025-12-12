# Setup Guide: Gasless Transactions & Free Name Registration

This guide explains how to enable gasless transactions and free name registration (no tokens required) for the Motus Name Service.

## Current Status

✅ **Frontend Configuration:**
- Contract Address: `0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1`
- EVVM Address: `0xfc99769602914d649144f6b2397e2aa528b2878d`
- Frontend is configured to use the correct contract
- Frontend supports zero-fee registrations

## Steps to Enable

### 1. Configure EVVM on the Contract

Run the setup script to enable EVVM on the deployed contract:

```bash
npx hardhat run scripts/setup-evvm.ts --network celoSepolia
```

This script will:
- Set the EVVM address on the contract
- Enable EVVM functionality
- Verify the configuration

**Requirements:**
- `PRIVATE_KEY` environment variable must be set (contract owner's private key)
- `MOTUS_NAME_SERVICE_ADDRESS` must be set to `0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1`
- `EVVM_ADDRESS` must be set to `0xfc99769602914d649144f6b2397e2aa528b2878d`

### 2. Set Registration Fee to 0 (Free Registration)

To enable free name registration (no tokens required), run:

```bash
npx hardhat run scripts/set-free-registration.ts --network celoSepolia
```

This script will:
- Set `baseRegistrationFee` to 0
- Verify the fee is set correctly

**Requirements:**
- `PRIVATE_KEY` environment variable must be set (contract owner's private key)
- `MOTUS_NAME_SERVICE_ADDRESS` must be set

### 3. Start the Relayer Service

The relayer service is required for gasless transactions. Make sure it's running:

```bash
cd relayer
npm install
npm start
```

The relayer should be accessible at `http://localhost:3001` (or the URL specified in `NEXT_PUBLIC_RELAYER_URL`).

### 4. Frontend Configuration

The frontend is already configured with:
- ✅ Correct contract address
- ✅ EVVM address
- ✅ Support for zero-fee registrations
- ✅ Gasless transaction UI

**Environment Variables (frontend/.env.local):**
```bash
NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS=0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1
NEXT_PUBLIC_EVVM_ADDRESS=0xfc99769602914d649144f6b2397e2aa528b2878d
NEXT_PUBLIC_EVVM_ID=1047
NEXT_PUBLIC_RELAYER_URL=http://localhost:3001
NEXT_PUBLIC_NETWORK=celoSepolia
```

## How It Works

### Gasless Transactions

1. **User Signs Off-Chain**: User signs the transaction using EIP-191 signature
2. **Relayer Submits**: A relayer (Fisher) submits the signed transaction to the blockchain
3. **Payment via EVVM**: Payment is processed through EVVM using Principal Tokens (if fee > 0)
4. **No Gas Fees**: User doesn't pay gas - the relayer does (or earns rewards if staking)

### Free Registration

When `baseRegistrationFee` is set to 0:
- Users can claim names with **no tokens required**
- EVVM payment signature is still created (with amount = 0)
- EVVM handles zero payments gracefully
- Frontend shows "FREE! No tokens required!" message

## Frontend Features

The updated frontend now:
- ✅ Detects when registration is free (fee = 0)
- ✅ Shows special "FREE" messaging
- ✅ Handles zero-fee gasless transactions
- ✅ Automatically enables gasless mode when EVVM is configured
- ✅ Provides clear feedback about transaction status

## Verification

After setup, verify everything is working:

1. **Check EVVM Status:**
   ```bash
   npx hardhat run scripts/check-evvm-status.ts --network celoSepolia
   ```

2. **Check Registration Fee:**
   ```bash
   npx hardhat run scripts/check-fee.ts --network celoSepolia
   ```

3. **Test in Frontend:**
   - Open the frontend
   - Connect wallet
   - Check availability for a domain name
   - If fee shows "0.0", free registration is enabled
   - Enable "Use EVVM Gasless Transaction" checkbox
   - Register the domain (should be free and gasless!)

## Troubleshooting

### EVVM Not Enabled
- Run `scripts/setup-evvm.ts` with the contract owner's private key
- Verify the transaction succeeded on CeloScan

### Fee Not Zero
- Run `scripts/set-free-registration.ts` with the contract owner's private key
- Verify the transaction succeeded on CeloScan

### Relayer Not Available
- Make sure the relayer service is running
- Check `NEXT_PUBLIC_RELAYER_URL` matches the relayer URL
- Verify relayer health endpoint: `http://localhost:3001/health`

### Contract Address Mismatch
- Verify `NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS` in `frontend/.env.local`
- Should be: `0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1`

## Summary

Once all steps are completed:
- ✅ Users can claim names with **no tokens** (if fee is 0)
- ✅ Users can register **without paying gas fees** (gasless transactions)
- ✅ Frontend provides clear UI feedback
- ✅ All transactions go through the relayer for gasless execution

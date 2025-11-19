# EVVM Next Steps - Following Documentation

## ✅ Phase 1: Deployment Complete

Your EVVM contracts are deployed on Celo Sepolia:
- **Evvm Core**: `0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537`
- **Staking**: `0x349974CF184BFE2Ff0CAAF1F87380313CF5C44cD`
- **NameService**: `0x446A05a0aB44834794b41d053E72690391d50527`
- **Treasury**: `0x71d0a6a1dDD4D4CC9cDd8561f0B3BAB6BE7cf283`
- **P2PSwap**: `0x850018Fe6722A1eeF28efBA6f02848Ac2DE02Fcd`

## 📋 Phase 2: Register with Registry EVVM (REQUIRED)

According to EVVM documentation, **all EVVM deployments must register** on Ethereum Sepolia to get an official EVVM ID.

### Step 1: Get ETH Sepolia Tokens

You need ETH on Ethereum Sepolia (not CELO) for registration gas fees.

**Faucets:**
- https://faucet.ethereum.org/
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://faucets.chain.link/sepolia

### Step 2: Add Environment Variables

Add to `Testnet-Contracts/.env`:
```bash
PRIVATE_KEY=your_private_key_here
RPC_URL_ETH_SEPOLIA=https://rpc.sepolia.org
```

### Step 3: Register Your EVVM

Run the registration script:
```bash
cd Testnet-Contracts
tsx scripts/register-evvm.ts 0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537 11142220
```

**Registry Details:**
- **Contract**: `0x389dC8fb09211bbDA841D59f4a51160dA2377832`
- **Network**: Ethereum Sepolia
- **Function**: `registerEvvm(uint256 chainId, address evvmAddress)`
- **Returns**: Your unique EVVM ID (starts from 1000)

## 📋 Phase 3: Set EVVM ID (Within 1 Hour!)

After registration, you **must** set the EVVM ID on your contract within 1 hour, or it becomes permanent.

```bash
tsx scripts/set-evvm-id.ts 0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537 <your-evvm-id> celo
```

**Important:** The EVVM ID can only be changed within a 1-hour window after initial assignment.

## 📋 Phase 4: Integrate with Your Contracts

### Update MotusNameService
- Use EVVM's `pay()` function for gasless transactions
- Implement EIP-191 signature signing

### Update PatientRecords & Telemedicine
- Integrate with EVVM payment system
- Enable meta-transactions

## 📋 Phase 5: Set Up Relayer Service (Fisher)

For gasless transactions, you need a relayer that:
1. Receives signed transactions from users
2. Submits them to EVVM contracts
3. Pays gas fees (or stake to become a staker and earn rewards)

## 📋 Phase 6: Update Frontend

1. Install EVVM SDK: `npm install @evvm/testnet-contracts`
2. Implement EIP-191 signature signing
3. Send signed transactions to your relayer
4. Users don't pay gas - relayers do!

## 📚 Documentation Resources

- **QuickStart**: https://www.evvm.info/docs/QuickStart
- **Full Docs**: https://www.evvm.info/docs/intro
- **LLM Docs**: https://evvm.info/llms-full.txt

## 🎯 Current Priority

**RIGHT NOW:** Register your EVVM with Registry EVVM on Ethereum Sepolia!

1. Get ETH Sepolia tokens from faucets
2. Add `RPC_URL_ETH_SEPOLIA` to `.env`
3. Run registration script
4. Set EVVM ID within 1 hour


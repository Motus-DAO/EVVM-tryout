# Getting Your Private Key for Deployment

## ⚠️ SECURITY WARNING

**NEVER share your private key with anyone!**
- Never commit it to git
- Never share it in chat/email
- Never use your main wallet's private key for testing
- Consider creating a separate wallet for development

## Where to Get Your Private Key

### Option 1: From MetaMask (Most Common)

1. **Open MetaMask** browser extension
2. Click the **three dots (⋮)** next to your account name
3. Select **"Account details"**
4. Click **"Show private key"**
5. Enter your MetaMask password
6. Copy the private key (it will start with `0x`)

### Option 2: From Other Wallets

**WalletConnect / Other Wallets:**
- Similar process - look for "Export Private Key" or "Show Private Key" in account settings
- You'll need to enter your wallet password

**Hardware Wallets (Ledger/Trezor):**
- Hardware wallets don't expose private keys (by design)
- For deployment, you'll need to use a software wallet or import a key

## Adding to .env File

1. **Open your `.env` file** (in the project root)
2. **Add your private key:**

```bash
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Important:**
- Include the `0x` prefix
- No spaces or quotes needed
- Make sure `.env` is in `.gitignore` (it should be already)

## Recommended: Create a Separate Wallet for Development

For safety, create a new wallet just for testing:

1. **Create new MetaMask account:**
   - MetaMask → Add Account → Create Account
   - Name it "Development" or "Testnet"

2. **Fund it with testnet CELO:**
   - Get testnet CELO from a faucet: https://faucet.celo.org/
   - Or use: https://faucet.celo.org/alfajores

3. **Export the private key** from this new account

4. **Use this for deployment** - safer than using your main wallet

## Verify Your .env File

Your `.env` should look like this:

```bash
# Your private key (with 0x prefix)
PRIVATE_KEY=0xYourPrivateKeyHere

# EVVM Address (optional, but recommended)
EVVM_ADDRESS=0xfc99769602914d649144f6b2397e2aa528b2878d

# Network
NETWORK=celoSepolia
```

## After Adding Private Key

Once you've added your `PRIVATE_KEY` to `.env`, you can deploy:

```bash
npm run deploy:celoSepolia
```

## Security Checklist

- ✅ `.env` file is in `.gitignore`
- ✅ Using a separate wallet for development
- ✅ Never sharing private key
- ✅ Only using testnet for now
- ✅ Have backup of private key (stored securely)

## Troubleshooting

**"Insufficient funds" error:**
- Make sure your wallet has CELO tokens
- For Celo Sepolia, get testnet CELO from faucet
- Check balance: https://celoscan.io/address/YOUR_ADDRESS

**"Invalid private key" error:**
- Make sure it starts with `0x`
- Make sure there are no extra spaces
- Should be 66 characters total (0x + 64 hex characters)

## Next Steps

After adding your private key:

1. **Deploy the contracts:**
   ```bash
   npm run deploy:celoSepolia
   ```

2. **Configure EVVM** (if you added EVVM_ADDRESS, it's automatic)

3. **Update frontend** with the new contract address

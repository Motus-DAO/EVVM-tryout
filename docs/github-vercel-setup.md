# GitHub & Vercel Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Node.js 18+ installed
- Git installed

## Step 1: Prepare for GitHub

### 1.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial commit: Motus Name Service with EVVM gasless transactions"
```

### 1.2 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `motus-name-service`)
3. **Don't** initialize with README, .gitignore, or license (we already have these)

### 1.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/motus-name-service.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Vercel

### 2.1 Connect Repository to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the Vite framework

### 2.2 Configure Build Settings

Vercel should auto-detect these settings from `vercel.json`:
- **Framework Preset:** Vite
- **Build Command:** `npm run frontend:build`
- **Output Directory:** `frontend/dist`
- **Install Command:** `npm install && cd frontend && npm install`

### 2.3 Add Environment Variables

In Vercel project settings, add these environment variables:

```
VITE_MOTUS_NAME_SERVICE_ADDRESS=0x7b2a5c1E00B62A47dcF89cB4A4868e344bAf3736
VITE_EVVM_ADDRESS=0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537
VITE_NETWORK=celoSepolia
VITE_CHAIN_ID=11142220
VITE_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
```

**Note:** Replace with your actual deployed contract addresses.

### 2.4 Deploy

Click "Deploy" and wait for the build to complete. Your app will be live at `https://your-project.vercel.app`

## Step 3: Update Contract Addresses

After deploying contracts to Celo Sepolia, update the environment variables in Vercel:

1. Go to Project Settings → Environment Variables
2. Update `VITE_MOTUS_NAME_SERVICE_ADDRESS` with your deployed address
3. Update `VITE_EVVM_ADDRESS` with your EVVM address
4. Redeploy the project

## Step 4: Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

- Check that all dependencies are in `package.json`
- Ensure `frontend/package.json` exists
- Verify build command works locally: `npm run frontend:build`

### Environment Variables Not Working

- Make sure variables start with `VITE_` prefix
- Redeploy after adding/updating variables
- Check browser console for errors

### Contract Not Found

- Verify contract addresses are correct
- Ensure contracts are deployed to the correct network
- Check that the network matches `VITE_NETWORK`

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:
- `main` branch → Production
- Other branches → Preview deployments

## Next Steps

1. Test the deployed app
2. Share the Vercel URL with users
3. Start onboarding users to register `.motus` domains!


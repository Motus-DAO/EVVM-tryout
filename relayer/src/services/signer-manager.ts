import { ethers } from 'ethers';
import { query } from '../db/client.js';
import dotenv from 'dotenv';

dotenv.config();

export interface SignerInfo {
  id: number;
  address: string;
  name: string;
  isActive: boolean;
  balance: bigint;
  minBalance: bigint;
  wallet: ethers.Wallet;
}

export class SignerManager {
  private signers: SignerInfo[] = [];
  private currentIndex: number = 0;
  private provider: ethers.JsonRpcProvider;

  constructor(provider: ethers.JsonRpcProvider) {
    this.provider = provider;
  }

  /**
   * Initialize signers from database and environment
   */
  async initialize() {
    console.log('🔐 Initializing signer manager...');

    // Get signers from database
    const dbSigners = await query(
      'SELECT id, address, name, is_active, min_balance_wei FROM signers WHERE is_active = true'
    );

    // Get private keys from environment
    // Format: RELAYER_PRIVATE_KEY_1, RELAYER_PRIVATE_KEY_2, etc.
    const privateKeys: string[] = [];
    let index = 1;
    while (process.env[`RELAYER_PRIVATE_KEY_${index}`]) {
      privateKeys.push(process.env[`RELAYER_PRIVATE_KEY_${index}`]!);
      index++;
    }

    // If no numbered keys, try single key
    if (privateKeys.length === 0 && process.env.RELAYER_PRIVATE_KEY) {
      privateKeys.push(process.env.RELAYER_PRIVATE_KEY);
    }

    if (privateKeys.length === 0) {
      throw new Error('No RELAYER_PRIVATE_KEY found in environment variables');
    }

    // Create signer instances
    for (let i = 0; i < privateKeys.length; i++) {
      const privateKey = privateKeys[i];
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const address = wallet.address;

      // Check if signer exists in database
      let signerRecord = dbSigners.rows.find((s: any) => 
        s.address.toLowerCase() === address.toLowerCase()
      );

      if (!signerRecord) {
        // Insert new signer into database
        const result = await query(
          `INSERT INTO signers (address, name, is_active, min_balance_wei)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (address) DO UPDATE SET is_active = $3
           RETURNING id, address, name, is_active, min_balance_wei`,
          [
            address,
            `Relayer ${i + 1}`,
            true,
            process.env.MIN_BALANCE_WEI || '1000000000000000000' // 1 CELO default
          ]
        );
        signerRecord = result.rows[0];
      }

      const balance = await this.provider.getBalance(address);
      const minBalance = BigInt(signerRecord.min_balance_wei || '1000000000000000000');

      this.signers.push({
        id: signerRecord.id,
        address: signerRecord.address,
        name: signerRecord.name || `Relayer ${i + 1}`,
        isActive: signerRecord.is_active,
        balance,
        minBalance,
        wallet,
      });

      console.log(`  ✓ Signer ${i + 1}: ${address} (Balance: ${ethers.formatEther(balance)} CELO)`);
    }

    console.log(`✅ Initialized ${this.signers.length} signer(s)`);
  }

  /**
   * Get next available signer with sufficient balance
   */
  async getNextSigner(): Promise<SignerInfo | null> {
    if (this.signers.length === 0) {
      return null;
    }

    // Try to find a signer with sufficient balance (round-robin)
    const startIndex = this.currentIndex;
    let attempts = 0;

    while (attempts < this.signers.length) {
      const signer = this.signers[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % this.signers.length;

      // Check balance
      const balance = await this.provider.getBalance(signer.address);
      signer.balance = balance;

      if (balance >= signer.minBalance) {
        // Update last used timestamp
        await query(
          'UPDATE signers SET last_used_at = NOW(), balance_wei = $1 WHERE id = $2',
          [balance.toString(), signer.id]
        );
        return signer;
      }

      attempts++;
    }

    // No signer with sufficient balance
    console.warn('⚠️  No signer with sufficient balance available');
    return null;
  }

  /**
   * Check if any signer has sufficient balance
   */
  async hasAvailableSigner(): Promise<boolean> {
    for (const signer of this.signers) {
      const balance = await this.provider.getBalance(signer.address);
      if (balance >= signer.minBalance) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all signers with their current balances
   */
  async getAllSigners(): Promise<SignerInfo[]> {
    // Refresh balances
    for (const signer of this.signers) {
      signer.balance = await this.provider.getBalance(signer.address);
    }
    return this.signers;
  }

  /**
   * Update signer balance in database
   */
  async updateSignerBalance(signerId: number, balance: bigint) {
    await query(
      'UPDATE signers SET balance_wei = $1, last_balance_check = NOW() WHERE id = $2',
      [balance.toString(), signerId]
    );
  }
}



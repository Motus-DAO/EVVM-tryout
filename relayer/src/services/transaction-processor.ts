import { ethers } from 'ethers';
import { query } from '../db/client.js';
import { SignerManager, SignerInfo } from './signer-manager.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load contract ABI
const contractABI = JSON.parse(
  readFileSync(join(__dirname, '../contracts/MotusNameService.json'), 'utf-8')
);

export interface TransactionRequest {
  userAddress: string;
  contractAddress: string;
  functionName: string;
  args: any[];
  signature: string;
  nonce: bigint;
}

export class TransactionProcessor {
  private provider: ethers.JsonRpcProvider;
  private signerManager: SignerManager;

  constructor(provider: ethers.JsonRpcProvider, signerManager: SignerManager) {
    this.provider = provider;
    this.signerManager = signerManager;
  }

  /**
   * Validate transaction signature
   * Matches the signature format from frontend: "<userAddress>,<contractAddress>,<functionName>,<argsHash>,<nonce>"
   */
  async validateSignature(
    userAddress: string,
    contractAddress: string,
    functionName: string,
    args: any[],
    nonce: bigint,
    signature: string
  ): Promise<boolean> {
    try {
      // Recreate the message that was signed in the frontend
      // Format: "<userAddress>,<contractAddress>,<functionName>,<argsHash>,<nonce>"
      const argsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(args)));
      const message = `${userAddress},${contractAddress},${functionName},${argsHash},${nonce.toString()}`;
      const messageBytes = ethers.toUtf8Bytes(message);

      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(messageBytes, signature);

      return recoveredAddress.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Check and update user nonce
   */
  async checkAndUpdateNonce(userAddress: string, nonce: bigint): Promise<boolean> {
    const result = await query(
      'SELECT current_nonce FROM user_nonces WHERE user_address = $1',
      [userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // First transaction for this user
      await query(
        'INSERT INTO user_nonces (user_address, current_nonce) VALUES ($1, $2)',
        [userAddress.toLowerCase(), nonce.toString()]
      );
      return true;
    }

    const currentNonce = BigInt(result.rows[0].current_nonce);
    
    if (nonce <= currentNonce) {
      return false; // Nonce too low or already used
    }

    // Update nonce
    await query(
      'UPDATE user_nonces SET current_nonce = $1, last_updated = NOW() WHERE user_address = $2',
      [nonce.toString(), userAddress.toLowerCase()]
    );

    return true;
  }

  /**
   * Submit transaction to blockchain
   * The relayer pays gas fees for this transaction
   */
  async submitTransaction(
    txRequest: TransactionRequest,
    signer: SignerInfo
  ): Promise<string> {
    try {
      // Convert string args back to proper types (bigint, etc.)
      const processedArgs = txRequest.args.map((arg: any, index: number) => {
        // Skip conversion for bytes (signatures) - they should stay as hex strings
        // Signatures are typically at specific indices in registerGasless
        // Index 7: service signature (bytes)
        // Index 11: EVVM signature (bytes)
        if (index === 7 || index === 11) {
          // This is a signature, keep it as a string (ethers will handle it)
          return arg;
        }
        
        // If it's a string that looks like a bigint, convert it
        if (typeof arg === 'string' && /^\d+$/.test(arg)) {
          // Check if it's a large number (likely a bigint)
          if (arg.length > 15) {
            return BigInt(arg);
          }
          // For smaller numbers, check if they should be BigInt based on function signature
          // For registerGasless: duration (index 1), amount (index 5), nonce (index 6), etc. should be BigInt
          if (index === 1 || index === 5 || index === 6 || index === 9 || index === 10) {
            return BigInt(arg);
          }
        }
        
        // For boolean values
        if (arg === 'true' || arg === true) return true;
        if (arg === 'false' || arg === false) return false;
        
        return arg;
      });

      // Create contract instance with ABI
      const contract = new ethers.Contract(
        txRequest.contractAddress,
        contractABI,
        signer.wallet
      );

      // Verify the function exists
      if (!contract[txRequest.functionName]) {
        throw new Error(`Function ${txRequest.functionName} not found in contract ABI`);
      }

      // Estimate gas first to get better error messages
      try {
        await contract[txRequest.functionName].estimateGas(...processedArgs);
      } catch (estimateError: any) {
        // Try to decode the error
        let errorMessage = estimateError.message || 'Unknown error';
        
        // Check for common EVVM errors
        if (estimateError.data) {
          const errorData = estimateError.data;
          // Check for custom errors
          if (errorData === '0x8baa579f') {
            errorMessage = 'InvalidSignature: Signature verification failed. Check EVVM ID and signature format.';
          } else if (errorData === '0xf4d678b8') {
            errorMessage = 'InsufficientBalance: User does not have sufficient balance in EVVM contract. User needs to deposit tokens first.';
          } else if (errorData === '0x1849850b') {
            errorMessage = 'InvalidAsyncNonce: Nonce has already been used.';
          } else if (errorData === '0x5c758b7e') {
            errorMessage = 'SenderIsNotTheExecutor: Executor address mismatch.';
          } else if (errorData === '0x2860e19a') {
            // UpdateBalanceFailed - user doesn't have sufficient balance in EVVM contract
            errorMessage = 'UpdateBalanceFailed: User does not have sufficient balance in the EVVM contract. The user needs to deposit tokens into the EVVM contract via the Treasury contract before using gasless transactions.';
          }
        }
        
        console.error('Gas estimation failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Call the gasless function
      // The contract will validate the user's signature internally
      const tx = await contract[txRequest.functionName](...processedArgs);
      
      console.log(`Transaction submitted: ${tx.hash} by relayer ${signer.address}`);
      return tx.hash;
    } catch (error: any) {
      console.error('Transaction submission error:', error);
      throw new Error(`Failed to submit transaction: ${error.message}`);
    }
  }

  /**
   * Process a new transaction request
   */
  async processTransaction(txRequest: TransactionRequest): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    // Validate signature
    const isValid = await this.validateSignature(
      txRequest.userAddress,
      txRequest.contractAddress,
      txRequest.functionName,
      txRequest.args,
      txRequest.nonce,
      txRequest.signature
    );

    if (!isValid) {
      return {
        success: false,
        error: 'Invalid signature',
      };
    }

    // Check nonce
    const nonceValid = await this.checkAndUpdateNonce(
      txRequest.userAddress,
      txRequest.nonce
    );

    if (!nonceValid) {
      return {
        success: false,
        error: 'Invalid or already used nonce',
      };
    }

    // Insert transaction into database
    const txResult = await query(
      `INSERT INTO transactions 
       (user_address, contract_address, function_name, args, signature, nonce, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        txRequest.userAddress.toLowerCase(),
        txRequest.contractAddress.toLowerCase(),
        txRequest.functionName,
        JSON.stringify(txRequest.args),
        txRequest.signature,
        txRequest.nonce.toString(),
        'pending',
      ]
    );

    const txId = txResult.rows[0].id;

    // Get available signer
    const signer = await this.signerManager.getNextSigner();
    if (!signer) {
      await query(
        'UPDATE transactions SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', 'No signer available', txId]
      );
      return {
        success: false,
        error: 'No signer available with sufficient balance',
      };
    }

    try {
      // Submit transaction
      const txHash = await this.submitTransaction(txRequest, signer);

      // Update transaction with hash and signer
      await query(
        `UPDATE transactions 
         SET tx_hash = $1, signer_address = $2, status = $3, submitted_at = NOW()
         WHERE id = $4`,
        [txHash, signer.address, 'submitted', txId]
      );

      // Log transaction
      await query(
        'INSERT INTO transaction_logs (transaction_id, log_level, message) VALUES ($1, $2, $3)',
        [txId, 'info', `Transaction submitted: ${txHash}`]
      );

      return {
        success: true,
        txHash,
      };
    } catch (error: any) {
      // Update transaction with error
      await query(
        'UPDATE transactions SET status = $1, error_message = $2 WHERE id = $3',
        ['failed', error.message, txId]
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check transaction status
   */
  async checkTransactionStatus(txHash: string): Promise<{
    status: string;
    blockNumber?: number;
    gasUsed?: bigint;
  }> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    
    if (!receipt) {
      return { status: 'pending' };
    }

    // Update database
    await query(
      `UPDATE transactions 
       SET status = $1, block_number = $2, gas_used = $3, confirmed_at = NOW()
       WHERE tx_hash = $4`,
      [
        receipt.status === 1 ? 'confirmed' : 'failed',
        receipt.blockNumber.toString(),
        receipt.gasUsed.toString(),
        txHash,
      ]
    );

    return {
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }
}



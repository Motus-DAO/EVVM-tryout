import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { SignerManager } from './services/signer-manager.js';
import { TransactionProcessor, TransactionRequest } from './services/transaction-processor.js';
import { initializeSchema, query } from './db/client.js';
import { z } from 'zod';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Provider setup
const RPC_URL = process.env.RPC_URL || 'https://forno.celo-sepolia.celo-testnet.org';
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Services
let signerManager: SignerManager;
let transactionProcessor: TransactionProcessor;

// Validation schemas
const submitTransactionSchema = z.object({
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address'),
  contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address'),
  functionName: z.string().min(1),
  args: z.array(z.any()),
  signature: z.string(),
  nonce: z.string().or(z.number()).transform((val) => BigInt(val)),
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const hasSigner = await signerManager.hasAvailableSigner();
    res.json({
      status: 'healthy',
      hasAvailableSigner: hasSigner,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

// Get signer status
app.get('/api/signers', async (req: Request, res: Response) => {
  try {
    const signers = await signerManager.getAllSigners();
    res.json({
      signers: signers.map((s) => ({
        address: s.address,
        name: s.name,
        balance: ethers.formatEther(s.balance),
        minBalance: ethers.formatEther(s.minBalance),
        isActive: s.isActive,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Submit transaction endpoint
app.post('/api/submit', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validated = submitTransactionSchema.parse(req.body);
    const txRequest: TransactionRequest = {
      userAddress: validated.userAddress,
      contractAddress: validated.contractAddress,
      functionName: validated.functionName,
      args: validated.args,
      signature: validated.signature,
      nonce: validated.nonce,
    };

    // Process transaction
    const result = await transactionProcessor.processTransaction(txRequest);

    if (result.success) {
      res.json({
        success: true,
        txHash: result.txHash,
        message: 'Transaction submitted successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
});

// Check transaction status
app.get('/api/transaction/:txHash', async (req: Request, res: Response) => {
  try {
    const { txHash } = req.params;

    // Get from database first
    const dbResult = await query(
      'SELECT * FROM transactions WHERE tx_hash = $1',
      [txHash]
    );

    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = dbResult.rows[0];

    // If submitted but not confirmed, check blockchain
    if (tx.status === 'submitted') {
      const status = await transactionProcessor.checkTransactionStatus(txHash);
      return res.json({
        ...tx,
        blockchainStatus: status,
      });
    }

    res.json(tx);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user transactions
app.get('/api/user/:address/transactions', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await query(
      `SELECT * FROM transactions 
       WHERE user_address = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [address.toLowerCase(), limit]
    );

    res.json({ transactions: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize and start server
async function start() {
  try {
    console.log('🚀 Starting Motus Relayer Service...');

    // Initialize database
    console.log('📊 Initializing database...');
    await initializeSchema();

    // Initialize signer manager
    console.log('🔐 Initializing signer manager...');
    signerManager = new SignerManager(provider);
    await signerManager.initialize();

    // Initialize transaction processor
    transactionProcessor = new TransactionProcessor(provider, signerManager);

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Relayer service running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API: http://localhost:${PORT}/api/`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();



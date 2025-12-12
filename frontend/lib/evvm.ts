import { ethers } from 'ethers'
import { CONTRACT_ADDRESS } from './contracts'

export const EVVM_ADDRESS = process.env.NEXT_PUBLIC_EVVM_ADDRESS || '0xfc99769602914d649144f6b2397e2aa528b2878d'
export const EVVM_ID = process.env.NEXT_PUBLIC_EVVM_ID || '1047'
export const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001'

/**
 * Checks if the relayer service is available
 */
export async function checkRelayerHealth(relayerUrl: string): Promise<{ available: boolean; error?: string }> {
  try {
    const response = await fetch(`${relayerUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!response.ok) {
      return { available: false, error: `Relayer returned status ${response.status}` }
    }
    const data = await response.json()
    return { available: data.status === 'healthy' }
  } catch (error: any) {
    return { available: false, error: error.message || 'Failed to connect to relayer' }
  }
}

/**
 * Signs an EVVM payment transaction
 * Message format: "<evvmID>,pay,<toAddress>,<token>,<amount>,<priorityFee>,<nonce>,<priorityFlag>,<executor>"
 */
export async function signEvvmPay(
  signer: ethers.Signer,
  evvmID: string,
  toAddress: string,
  token: string,
  amount: bigint,
  priorityFee: bigint,
  nonce: bigint,
  priorityFlag: boolean,
  executor: string
): Promise<string> {
  // Format matches EVVM contract: addressToString converts to lowercase without 0x prefix
  // But actually, let's use the address directly as the contract does
  // The contract uses: _receiverAddress == address(0) ? _receiverIdentity : AdvancedStrings.addressToString(_receiverAddress)
  // Since we're using an address (not identity), we use the address
  // AdvancedStrings.addressToString likely converts to lowercase hex without 0x
  // But for now, let's use the address as-is (lowercase) to match
  const formatAddress = (addr: string) => addr.toLowerCase()
  const inputs = `${formatAddress(toAddress)},${formatAddress(token)},${amount.toString()},${priorityFee.toString()},${nonce.toString()},${priorityFlag ? 'true' : 'false'},${formatAddress(executor)}`
  const message = `${evvmID},pay,${inputs}`
  const messageBytes = ethers.toUtf8Bytes(message)
  const signature = await signer.signMessage(messageBytes)
  return signature
}

/**
 * Signs a service function call
 * Message format: "<evvmID>,<functionName>,<params>"
 */
export async function signServiceFunction(
  signer: ethers.Signer,
  evvmID: string,
  functionName: string,
  params: string
): Promise<string> {
  const message = `${evvmID},${functionName},${params}`
  const messageBytes = ethers.toUtf8Bytes(message)
  const signature = await signer.signMessage(messageBytes)
  return signature
}

/**
 * Generates a random nonce for service functions (async nonce)
 * Uses timestamp + random number to ensure uniqueness
 */
export function generateServiceNonce(): bigint {
  const timestamp = BigInt(Date.now())
  const random = BigInt(Math.floor(Math.random() * 1000000))
  return timestamp * BigInt(1000000) + random
}

/**
 * Creates gasless registration data with both service and EVVM payment signatures
 */
export async function createGaslessRegistration(
  signer: ethers.Signer,
  evvmID: string,
  name: string,
  duration: bigint,
  resolver: string,
  metadata: string,
  amount: bigint,
  priorityFee: bigint,
  contractAddress: string,
  provider: ethers.Provider,
  evvmAddress: string
) {
  const userAddress = await signer.getAddress()
  
  // 1. Generate service nonce (async nonce - can be any unused number)
  const serviceNonce = generateServiceNonce()
  
  // 2. Create service signature
  // Format: "<evvmID>,registerGasless,<name>,<duration>,<amount>,<nonce>"
  const serviceParams = `${name},${duration.toString()},${amount.toString()},${serviceNonce.toString()}`
  const serviceSignature = await signServiceFunction(
    signer,
    evvmID,
    'registerGasless',
    serviceParams
  )
  
  // 3. Get EVVM payment nonce (sync nonce - must be sequential)
  const evvmNonce = await getNextNonce(provider, evvmAddress, userAddress)
  
  // 4. Create EVVM payment signature
  const evvmSignature = await signEvvmPay(
    signer,
    evvmID,
    contractAddress,
    '0x0000000000000000000000000000000000000001', // Principal token (MATE)
    amount,
    priorityFee,
    evvmNonce,
    false, // priorityFlag for EVVM payment
    contractAddress
  )

  return {
    functionName: 'registerGasless',
    args: [
      name,
      duration,
      resolver,
      metadata,
      userAddress,
      amount,
      serviceNonce,        // Service nonce
      serviceSignature,    // Service signature
      priorityFee,         // EVVM priority fee
      evvmNonce,           // EVVM payment nonce
      false,               // EVVM priority flag
      evvmSignature,       // EVVM payment signature
    ],
  }
}

/**
 * Creates gasless renewal data with both service and EVVM payment signatures
 */
export async function createGaslessRenewal(
  signer: ethers.Signer,
  evvmID: string,
  nameHash: string,
  duration: bigint,
  amount: bigint,
  priorityFee: bigint,
  contractAddress: string,
  provider: ethers.Provider,
  evvmAddress: string
) {
  const userAddress = await signer.getAddress()
  
  // 1. Generate service nonce
  const serviceNonce = generateServiceNonce()
  
  // 2. Create service signature
  // Format: "<evvmID>,renewGasless,<nameHash>,<duration>,<amount>,<nonce>"
  const serviceParams = `${nameHash},${duration.toString()},${amount.toString()},${serviceNonce.toString()}`
  const serviceSignature = await signServiceFunction(
    signer,
    evvmID,
    'renewGasless',
    serviceParams
  )
  
  // 3. Get EVVM payment nonce
  const evvmNonce = await getNextNonce(provider, evvmAddress, userAddress)
  
  // 4. Create EVVM payment signature
  const evvmSignature = await signEvvmPay(
    signer,
    evvmID,
    contractAddress,
    '0x0000000000000000000000000000000000000001',
    amount,
    priorityFee,
    evvmNonce,
    false,
    contractAddress
  )

  return {
    functionName: 'renewGasless',
    args: [
      nameHash,
      duration,
      userAddress,
      amount,
      serviceNonce,
      serviceSignature,
      priorityFee,
      evvmNonce,
      false,
      evvmSignature,
    ],
  }
}

/**
 * Creates gasless transfer data with service signature
 */
export async function createGaslessTransfer(
  signer: ethers.Signer,
  evvmID: string,
  nameHash: string,
  newOwner: string,
  contractAddress: string
) {
  const userAddress = await signer.getAddress()
  
  // 1. Generate service nonce
  const serviceNonce = generateServiceNonce()
  
  // 2. Create service signature
  // Format: "<evvmID>,transferGasless,<nameHash>,<newOwner>,<nonce>"
  const serviceParams = `${nameHash},${newOwner},${serviceNonce.toString()}`
  const serviceSignature = await signServiceFunction(
    signer,
    evvmID,
    'transferGasless',
    serviceParams
  )

  return {
    functionName: 'transferGasless',
    args: [
      nameHash,
      newOwner,
      userAddress,
      serviceNonce,
      serviceSignature,
    ],
  }
}

/**
 * Gets the next sync nonce for EVVM payments
 */
export async function getNextNonce(provider: ethers.Provider, evvmAddress: string, userAddress: string): Promise<bigint> {
  const evvmAbi = ['function getNextCurrentSyncNonce(address user) view returns (uint256)']
  const evvmContract = new ethers.Contract(evvmAddress, evvmAbi, provider)
  return evvmContract.getNextCurrentSyncNonce(userAddress)
}

/**
 * Gets the EVVM ID (returns as string for compatibility)
 */
export async function getEvvmID(provider: ethers.Provider, evvmAddress: string): Promise<string> {
  // Try uint256 first (new format), fallback to string (old format)
  try {
    const evvmAbi = ['function getEvvmID() view returns (uint256)']
    const evvmContract = new ethers.Contract(evvmAddress, evvmAbi, provider)
    const id = await evvmContract.getEvvmID()
    // Return the ID as string, even if it's 0
    // Note: EVVM ID of 0 means the contract hasn't been registered
    return id.toString()
  } catch {
    // Fallback to string format for older contracts
    try {
      const evvmAbi = ['function getEvvmID() view returns (string)']
      const evvmContract = new ethers.Contract(evvmAddress, evvmAbi, provider)
      const id = await evvmContract.getEvvmID()
      return id
    } catch {
      // If all else fails, return "0" as default (matches contract behavior)
      // This indicates the EVVM contract hasn't been registered
      return "0"
    }
  }
}

/**
 * Checks if a service nonce has been used
 */
export async function isServiceNonceUsed(
  provider: ethers.Provider,
  contractAddress: string,
  userAddress: string,
  nonce: bigint
): Promise<boolean> {
  const abi = ['function isServiceNonceUsed(address user, uint256 nonce) view returns (bool)']
  const contract = new ethers.Contract(contractAddress, abi, provider)
  return contract.isServiceNonceUsed(userAddress, nonce)
}

/**
 * Verifies that the contract has the updated registerGasless function
 * Returns true if the contract has the new signature, false otherwise
 */
export async function verifyContractHasUpdatedFunction(
  provider: ethers.Provider,
  contractAddress: string
): Promise<{ hasUpdatedFunction: boolean; error?: string }> {
  try {
    // Try to call the new function signature with estimateGas
    // This will fail if the function doesn't exist or has wrong signature
    const abi = [
      'function registerGasless(string name, uint256 duration, address resolver, string metadata, address user, uint256 amount, uint256 nonce, bytes signature, uint256 priorityFee_EVVM, uint256 nonce_EVVM, bool priorityFlag_EVVM, bytes signature_EVVM)'
    ]
    const contract = new ethers.Contract(contractAddress, abi, provider)
    
    // Try to estimate gas with dummy parameters
    // If the function exists, this will work (even if it reverts for other reasons)
    try {
      await contract.registerGasless.estimateGas(
        'test',
        BigInt(365 * 24 * 60 * 60),
        ethers.ZeroAddress,
        '{}',
        ethers.ZeroAddress,
        BigInt(0),
        BigInt(0),
        '0x',
        BigInt(0),
        BigInt(0),
        false,
        '0x'
      )
      return { hasUpdatedFunction: true }
    } catch (err: any) {
      // If it's a signature mismatch, the function doesn't exist
      if (err?.code === 'CALL_EXCEPTION' && err?.data === null) {
        return { 
          hasUpdatedFunction: false, 
          error: 'Contract does not have the updated registerGasless function. Please redeploy the contract with the new code.' 
        }
      }
      // Other errors (like revert) mean the function exists but failed for other reasons
      return { hasUpdatedFunction: true }
    }
  } catch (err: any) {
    return { 
      hasUpdatedFunction: false, 
      error: `Failed to verify contract: ${err?.message || 'Unknown error'}` 
    }
  }
}

/**
 * Signs a transaction request for the relayer
 * This signature proves the user authorized sending this transaction to the relayer
 * Format: "<userAddress>,<contractAddress>,<functionName>,<argsHash>,<nonce>"
 */
export async function signTransactionRequest(
  signer: ethers.Signer,
  userAddress: string,
  contractAddress: string,
  functionName: string,
  args: any[],
  nonce: bigint
): Promise<string> {
  // Create a message that includes all transaction details
  // Convert args to a consistent format for hashing
  const normalizedArgs = args.map(arg => {
    if (typeof arg === 'bigint') {
      return arg.toString()
    }
    return arg
  })
  const argsHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(normalizedArgs)))
  const message = `${userAddress},${contractAddress},${functionName},${argsHash},${nonce.toString()}`
  const messageBytes = ethers.toUtf8Bytes(message)
  const signature = await signer.signMessage(messageBytes)
  return signature
}

/**
 * Sends transaction to relayer service
 * The relayer will submit the transaction on behalf of the user (paying gas)
 */
export async function sendToRelayer(
  relayerUrl: string,
  userAddress: string,
  contractAddress: string,
  functionName: string,
  args: any[],
  serviceNonce: bigint,
  signer: ethers.Signer
): Promise<string> {
  // Sign the transaction request for relayer validation
  const signature = await signTransactionRequest(
    signer,
    userAddress,
    contractAddress,
    functionName,
    args,
    serviceNonce
  )

  const response = await fetch(`${relayerUrl}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userAddress,
      contractAddress,
      functionName,
      args: args.map(arg => {
        // Convert bigint to string for JSON serialization
        if (typeof arg === 'bigint') {
          return arg.toString()
        }
        return arg
      }),
      signature,
      nonce: serviceNonce.toString(),
    }),
  })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(`Relayer error: ${errorData.error || response.statusText}`)
  }
  
  const data = await response.json()
  if (!data.success) {
    throw new Error(`Relayer error: ${data.error || 'Transaction submission failed'}`)
  }
  
  return data.txHash
}

export const DEFAULT_METADATA = JSON.stringify({
  type: 'healthcare-provider',
  specialty: 'general',
})

export const DEFAULT_RESOLVER = ethers.ZeroAddress
export const ZERO_ADDRESS = ethers.ZeroAddress
export const NAME_SUFFIX = '.motus'
export const BASE_PAYMENT_TOKEN = '0x0000000000000000000000000000000000000001'
export const CONTRACT_FALLBACK = CONTRACT_ADDRESS

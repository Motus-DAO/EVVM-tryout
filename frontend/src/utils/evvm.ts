/**
 * EVVM Gasless Transaction Utilities
 * 
 * This module provides utilities for creating and signing gasless transactions
 * using the EVVM protocol. Users sign transactions off-chain, and relayers submit them.
 */

import { ethers } from 'ethers';

// EVVM Contract Address (from your deployment)
export const EVVM_ADDRESS = import.meta.env.VITE_EVVM_ADDRESS || '0x3C6Ab857425c5f8edfaad3ED9D92E115Af78a537';
export const EVVM_ID = '1047'; // Your EVVM ID from registration

// Motus Name Service Contract Address
export const MOTUS_NAME_SERVICE_ADDRESS = import.meta.env.VITE_MOTUS_NAME_SERVICE_ADDRESS || '';

/**
 * Create EIP-191 signature for EVVM pay function
 * 
 * @param signer The signer (user's wallet)
 * @param evvmID EVVM ID (string)
 * @param toAddress Recipient address (contract address)
 * @param token Token address (Principal Token = 0x1)
 * @param amount Amount to pay
 * @param priorityFee Priority fee for relayer
 * @param nonce Transaction nonce
 * @param priorityFlag True for async, false for sync
 * @param executor Executor address (contract address)
 * @returns Signature bytes
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
  // Construct the message according to EVVM signature format
  // Format: "{evvmID},pay,{toAddress},{token},{amount},{priorityFee},{nonce},{priorityFlag},{executor}"
  const inputs = `${toAddress},${token},${amount.toString()},${priorityFee.toString()},${nonce.toString()},${priorityFlag ? 'true' : 'false'},${executor}`;
  const message = `${evvmID},pay,${inputs}`;
  
  // Sign using EIP-191 standard format
  // Format: "\x19Ethereum Signed Message:\n" + messageLength + message
  const messageBytes = ethers.toUtf8Bytes(message);
  const messageLength = messageBytes.length.toString();
  const prefix = `\x19Ethereum Signed Message:\n${messageLength}`;
  const prefixedMessage = ethers.concat([ethers.toUtf8Bytes(prefix), messageBytes]);
  const messageHash = ethers.keccak256(prefixedMessage);
  
  // Sign the message (MetaMask will handle the EIP-191 prefix automatically)
  const signature = await signer.signMessage(messageBytes);
  
  return signature;
}

/**
 * Create gasless domain registration transaction
 * 
 * @param signer User's wallet signer
 * @param evvmID EVVM ID (string)
 * @param name Domain name (without .motus)
 * @param duration Registration duration in seconds
 * @param resolver Resolver address (optional)
 * @param metadata Metadata JSON string
 * @param amount Amount in Principal Tokens
 * @param priorityFee Priority fee for relayer
 * @param nonce Transaction nonce (get from EVVM contract)
 * @param contractAddress MotusNameService contract address
 * @returns Transaction data ready to send
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
  nonce: bigint,
  contractAddress: string
) {
  const userAddress = await signer.getAddress();
  
  // Sign the payment
  const signature = await signEvvmPay(
    signer,
    evvmID,
    contractAddress,
    '0x0000000000000000000000000000000000000001', // Principal Token
    amount,
    priorityFee,
    nonce,
    false, // sync transaction
    contractAddress
  );
  
  return {
    functionName: 'registerGasless',
    args: [
      name,
      duration,
      resolver,
      metadata,
      userAddress,
      amount,
      priorityFee,
      nonce,
      false, // priorityFlag
      signature
    ]
  };
}

/**
 * Create gasless domain renewal transaction
 * 
 * @param signer User's wallet signer
 * @param nameHash Domain name hash
 * @param duration Renewal duration in seconds
 * @param amount Amount in Principal Tokens
 * @param priorityFee Priority fee for relayer
 * @param nonce Transaction nonce
 * @returns Transaction data ready to send to relayer
 */
export async function createGaslessRenewal(
  signer: ethers.Signer,
  nameHash: string,
  duration: bigint,
  amount: bigint,
  priorityFee: bigint,
  nonce: bigint
) {
  const userAddress = await signer.getAddress();
  
  // Sign the payment
  const signature = await signEvvmPay(
    signer,
    MOTUS_NAME_SERVICE_ADDRESS,
    '0x0000000000000000000000000000000000000001', // Principal Token
    amount,
    priorityFee,
    nonce,
    false, // sync transaction
    MOTUS_NAME_SERVICE_ADDRESS
  );
  
  return {
    functionName: 'renewGasless',
    args: [
      nameHash,
      duration,
      userAddress,
      amount,
      priorityFee,
      nonce,
      false, // priorityFlag
      signature
    ]
  };
}

/**
 * Get next nonce from EVVM contract
 * 
 * @param provider Ethers provider
 * @param evvmAddress EVVM contract address
 * @param userAddress User's address
 * @returns Next nonce to use
 */
export async function getNextNonce(
  provider: ethers.Provider,
  evvmAddress: string,
  userAddress: string
): Promise<bigint> {
  // EVVM contract ABI for getNextCurrentSyncNonce
  const evvmAbi = [
    'function getNextCurrentSyncNonce(address user) view returns (uint256)'
  ];
  
  const evvmContract = new ethers.Contract(evvmAddress, evvmAbi, provider);
  const nonce = await evvmContract.getNextCurrentSyncNonce(userAddress);
  return nonce;
}

/**
 * Get EVVM ID from EVVM contract
 * 
 * @param provider Ethers provider
 * @param evvmAddress EVVM contract address
 * @returns EVVM ID as string
 */
export async function getEvvmID(
  provider: ethers.Provider,
  evvmAddress: string
): Promise<string> {
  const evvmAbi = [
    'function getEvvmID() view returns (string memory)'
  ];
  
  const evvmContract = new ethers.Contract(evvmAddress, evvmAbi, provider);
  const evvmID = await evvmContract.getEvvmID();
  return evvmID;
}

/**
 * Send gasless transaction to relayer
 * 
 * @param relayerUrl Relayer API endpoint
 * @param contractAddress Contract address to call
 * @param functionName Function name to call
 * @param args Function arguments
 * @returns Transaction hash from relayer
 */
export async function sendToRelayer(
  relayerUrl: string,
  contractAddress: string,
  functionName: string,
  args: any[]
): Promise<string> {
  const response = await fetch(`${relayerUrl}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contractAddress,
      functionName,
      args,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Relayer error: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.txHash;
}


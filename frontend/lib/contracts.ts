import { ethers } from 'ethers'

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_MOTUS_NAME_SERVICE_ADDRESS || '0xC59F2Dafc255C0518F048B64b9120Ff7c7113fa1'
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'celoSepolia'
export const CELO_SEPOLIA_CHAIN_ID_HEX = '0xaa044c' // 11142220
export const CELO_SEPOLIA_CHAIN_ID_DEC = 11142220
export const LOCALHOST_CHAIN_ID_DEC = 1337

const MOTUS_NAME_SERVICE_ABI = [
  'function domains(bytes32) view returns (address owner, address resolver, uint256 registrationTime, uint256 expirationTime, string metadata, bool active)',
  'function nameFromHash(bytes32) view returns (string)',
  'function isAvailable(string name) view returns (bool)',
  'function calculateRegistrationFee(string name, uint256 duration) view returns (uint256)',
  'function calculateRenewalFee(uint256 duration) view returns (uint256)',
  'function register(string name, uint256 duration, address resolver, string metadata) payable',
  'function registerGasless(string name, uint256 duration, address resolver, string metadata, address user, uint256 amount, uint256 nonce, bytes signature, uint256 priorityFee_EVVM, uint256 nonce_EVVM, bool priorityFlag_EVVM, bytes signature_EVVM)',
  'function renewGasless(bytes32 nameHash, uint256 duration, address user, uint256 amount, uint256 nonce, bytes signature, uint256 priorityFee_EVVM, uint256 nonce_EVVM, bool priorityFlag_EVVM, bytes signature_EVVM)',
  'function transferGasless(bytes32 nameHash, address newOwner, address user, uint256 nonce, bytes signature)',
  'function isServiceNonceUsed(address user, uint256 nonce) view returns (bool)',
  'function evvmAddress() view returns (address)',
  'function evvmEnabled() view returns (bool)',
  'function TLD() view returns (string)',
]

export function normalizeChainId(chainId: string | number): number {
  if (typeof chainId === 'number') return chainId
  const cleaned = chainId.startsWith('0x') ? chainId.slice(2) : chainId
  return parseInt(cleaned, 16)
}

export function isCeloOrLocal(chainId: string | number | null): boolean {
  if (!chainId) return false
  const id = normalizeChainId(chainId)
  return id === CELO_SEPOLIA_CHAIN_ID_DEC || id === LOCALHOST_CHAIN_ID_DEC
}

export async function getProvider(): Promise<ethers.BrowserProvider> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Wallet not found. Please open in a web3-enabled browser.')
  }
  return new ethers.BrowserProvider((window as any).ethereum)
}

export async function getContract(contractAddress = CONTRACT_ADDRESS) {
  const provider = await getProvider()
  const signer = await provider.getSigner()
  return new ethers.Contract(contractAddress, MOTUS_NAME_SERVICE_ABI, signer)
}

export async function getContractReadOnly(contractAddress = CONTRACT_ADDRESS) {
  const provider = await getProvider()
  return new ethers.Contract(contractAddress, MOTUS_NAME_SERVICE_ABI, provider)
}

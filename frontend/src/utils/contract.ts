import { ethers } from 'ethers'

// Minimal ABI for MotusNameService
const MOTUS_NAME_SERVICE_ABI = [
  "function domains(bytes32) view returns (address owner, address resolver, uint256 registrationTime, uint256 expirationTime, string memory metadata, bool active)",
  "function nameFromHash(bytes32) view returns (string memory)",
  "function isAvailable(string memory name) view returns (bool)",
  "function calculateRegistrationFee(string memory name, uint256 duration) view returns (uint256)",
  "function calculateRenewalFee(uint256 duration) view returns (uint256)",
  "function register(string memory name, uint256 duration, address resolver, string memory metadata) payable",
  "function registerGasless(string memory name, uint256 duration, address resolver, string memory metadata, address user, uint256 amount, uint256 priorityFee, uint256 nonce, bool priorityFlag, bytes memory signature)",
  "function ownedDomains(address) view returns (bytes32[] memory)",
  "function reverseLookup(address) view returns (bytes32)",
  "function TLD() view returns (string memory)",
  "function MIN_NAME_LENGTH() view returns (uint256)",
  "function MAX_NAME_LENGTH() view returns (uint256)",
  "function baseRegistrationFee() view returns (uint256)",
  "function renewalFee() view returns (uint256)",
  "function evvmAddress() view returns (address)",
  "function evvmEnabled() view returns (bool)",
  "event DomainRegistered(bytes32 indexed nameHash, string name, address indexed owner, address resolver, uint256 expirationTime)",
  "event DomainRegisteredGasless(bytes32 indexed nameHash, string name, address indexed owner, address indexed executor, uint256 expirationTime)",
  "event DomainRenewed(bytes32 indexed nameHash, string name, uint256 newExpirationTime)",
  "event DomainTransferred(bytes32 indexed nameHash, string name, address indexed from, address indexed to)",
]

// EVVM Contract ABI
const EVVM_ABI = [
  "function getNextCurrentSyncNonce(address user) view returns (uint256)",
  "function getEvvmID() view returns (string memory)",
]

export async function getProvider(): Promise<ethers.BrowserProvider> {
  if (!window.ethereum) {
    throw new Error('MetaMask or compatible wallet not found')
  }
  return new ethers.BrowserProvider(window.ethereum)
}

export async function getContract(contractAddress: string) {
  const provider = await getProvider()
  const signer = await provider.getSigner()
  return new ethers.Contract(contractAddress, MOTUS_NAME_SERVICE_ABI, signer)
}

export async function getContractReadOnly(contractAddress: string) {
  const provider = await getProvider()
  return new ethers.Contract(contractAddress, MOTUS_NAME_SERVICE_ABI, provider)
}

export async function getEvvmContract(evvmAddress: string) {
  const provider = await getProvider()
  return new ethers.Contract(evvmAddress, EVVM_ABI, provider)
}


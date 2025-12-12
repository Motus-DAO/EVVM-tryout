import { CELO_SEPOLIA_CHAIN_ID_DEC, LOCALHOST_CHAIN_ID_DEC } from '@/lib/contracts'

export const CELO_SEPOLIA_CHAIN_ID = '0xaa044c'

export function normalizeChainId(chainId: string | number): number {
  if (typeof chainId === 'number') return chainId
  const cleaned = chainId.startsWith('0x') ? chainId.slice(2) : chainId
  return parseInt(cleaned, 16)
}

export function isCeloOrLocal(chainId: string | number | null): boolean {
  if (!chainId) return false
  const normalized = normalizeChainId(chainId)
  return normalized === CELO_SEPOLIA_CHAIN_ID_DEC || normalized === LOCALHOST_CHAIN_ID_DEC
}

export { CELO_SEPOLIA_CHAIN_ID_DEC, LOCALHOST_CHAIN_ID_DEC }

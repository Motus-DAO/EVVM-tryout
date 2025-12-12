"use client"

import { HStack } from './Primitives'
import { HoloPanel, HoloButton } from './ui'
import { isCeloOrLocal, normalizeChainId, CELO_SEPOLIA_CHAIN_ID, CELO_SEPOLIA_CHAIN_ID_DEC, LOCALHOST_CHAIN_ID_DEC } from '../support/network'

interface ConnectCardProps {
  account: string | null
  chainId: string | null
  isCorrectNetwork: boolean
  onConnect: () => Promise<void>
}

export function ConnectCard({ account, chainId, isCorrectNetwork, onConnect }: ConnectCardProps) {
  return (
    <HoloPanel hover>
      <HStack justify="between" wrap>
        <div>
          <div className="badge" style={{ marginBottom: '0.5rem' }}>Wallet Connection</div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>
            {account ? 'Connected' : 'Not Connected'}
          </div>
          <div className="subtitle">
            {isCorrectNetwork ? '✓ Celo Sepolia / Localhost' : '⚠ Switch to Celo Sepolia or Localhost'}
          </div>
        </div>
        <HoloButton onClick={onConnect} variant="primary">
          {account ? 'Reconnect' : 'Connect Wallet'}
        </HoloButton>
      </HStack>

      <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <StatusRow 
          label="Wallet Address" 
          value={account ? truncate(account) : 'Not connected'} 
          tone={account ? 'ok' : 'warn'} 
        />
        <StatusRow
          label="Chain ID"
          value={chainId ? `${chainId} (dec ${normalizeChainId(chainId)})` : 'Unknown'}
          tone={isCorrectNetwork ? 'ok' : 'warn'}
        />
        {!isCorrectNetwork && chainId && (
          <div style={{ padding: '0.75rem', background: 'rgba(251, 191, 36, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <div className="subtitle" style={{ fontSize: '0.9rem', color: 'var(--warning)' }}>
            Expected: {CELO_SEPOLIA_CHAIN_ID} (dec {CELO_SEPOLIA_CHAIN_ID_DEC}) or 0x539 (dec {LOCALHOST_CHAIN_ID_DEC})
            </div>
          </div>
        )}
      </div>
    </HoloPanel>
  )
}

function StatusRow({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'warn' }) {
  const color = tone === 'ok' ? 'var(--success)' : 'var(--warning)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 0 4px ${color}20`,
          flexShrink: 0,
        }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
        <span style={{ color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>{label}</span>
        <span style={{ fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.95rem' }}>{value}</span>
      </div>
    </div>
  )
}

function truncate(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

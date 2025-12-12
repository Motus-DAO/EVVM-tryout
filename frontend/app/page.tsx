'use client'

import { useEffect, useState } from 'react'
import { ConnectCard } from './components/ConnectCard'
import { RegisterCard } from './components/RegisterCard'
import { LookupCard } from './components/LookupCard'
import { HolographicBackground, HoloText, HoloPanel, HoloButton } from './components/ui'
import { isCeloOrLocal, normalizeChainId, CELO_SEPOLIA_CHAIN_ID, CELO_SEPOLIA_CHAIN_ID_DEC, LOCALHOST_CHAIN_ID_DEC } from './support/network'
import { CELO_SEPOLIA_CHAIN_ID_HEX, CONTRACT_ADDRESS, NETWORK } from '@/lib/contracts'

export default function Page() {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  useEffect(() => {
    checkConnection()
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const eth = (window as any).ethereum
      eth.on('accountsChanged', handleAccountsChanged)
      eth.on('chainChanged', handleChainChanged)
      return () => {
        eth.removeListener('accountsChanged', handleAccountsChanged)
        eth.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  async function checkConnection() {
    if (typeof window === 'undefined' || !(window as any).ethereum) return
    try {
      const eth = (window as any).ethereum
      const accounts = await eth.request({ method: 'eth_accounts' })
      if (accounts.length > 0) setAccount(accounts[0])
      const cId = await eth.request({ method: 'eth_chainId' })
      setChainId(cId)
      setIsCorrectNetwork(isCeloOrLocal(cId))
    } catch (err) {
      console.error('check connection error', err)
    }
  }

  function handleAccountsChanged(accounts: string[]) {
    setAccount(accounts.length ? accounts[0] : null)
  }

  function handleChainChanged(cId: string) {
    setChainId(cId)
    setIsCorrectNetwork(isCeloOrLocal(cId))
  }

  async function connectWallet() {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('Please install a Celo-compatible wallet (MetaMask + Celo extension)')
      return
    }
    try {
      const eth = (window as any).ethereum
      const accounts = await eth.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0])
      const currentChainId = await eth.request({ method: 'eth_chainId' })
      setChainId(currentChainId)
      if (!isCeloOrLocal(currentChainId)) {
        try {
          await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CELO_SEPOLIA_CHAIN_ID_HEX }] })
          const newChainId = await eth.request({ method: 'eth_chainId' })
          setChainId(newChainId)
          setIsCorrectNetwork(isCeloOrLocal(newChainId))
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            try {
              await eth.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: CELO_SEPOLIA_CHAIN_ID_HEX,
                    chainName: 'Celo Sepolia Testnet',
                    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
                    rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
                    blockExplorerUrls: ['https://celo-sepolia.blockscout.com'],
                  },
                ],
              })
              const newChainId = await eth.request({ method: 'eth_chainId' })
              setChainId(newChainId)
              setIsCorrectNetwork(isCeloOrLocal(newChainId))
            } catch (addError) {
              console.error('add chain error', addError)
              setIsCorrectNetwork(false)
            }
          } else {
            console.error('switch chain error', switchError)
            setIsCorrectNetwork(false)
          }
        }
      } else {
        setIsCorrectNetwork(true)
      }
    } catch (err) {
      console.error('connect error', err)
      alert('Failed to connect wallet')
    }
  }

  return (
    <HolographicBackground intensity="medium">
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 4rem', display: 'grid', gap: '2rem', position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        <header className="hero">
          <div className="badge">🏥 Motus Name Service</div>
          <HoloText as="h1" variant="heading" gradient="accent">
            Register and resolve .motus identities
          </HoloText>
          <p className="subtitle" style={{ fontSize: '1.1rem', marginTop: '-0.5rem' }}>
            Decentralized domain names on Celo with EVVM gasless transactions support
          </p>
        <div className="tableish" style={{ marginTop: '1rem' }}>
          <Stat label="Contract" value={CONTRACT_ADDRESS} mono />
          <Stat label="Network" value={NETWORK === 'localhost' ? 'Localhost (1337)' : 'Celo Sepolia (11142220)'} />
        </div>
      </header>

      <ConnectCard account={account} chainId={chainId} isCorrectNetwork={isCorrectNetwork} onConnect={connectWallet} />

      {account && !isCorrectNetwork && (
        <HoloPanel variant="glow" style={{ borderColor: 'rgba(248, 113, 113, 0.4)', background: 'rgba(248, 113, 113, 0.08)' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--danger)' }}>
            ⚠️ Wrong Network
          </div>
          <div className="subtitle" style={{ marginBottom: '1rem' }}>
            Please switch to Celo Sepolia ({CELO_SEPOLIA_CHAIN_ID} / {CELO_SEPOLIA_CHAIN_ID_DEC}) or Localhost (0x539 / {LOCALHOST_CHAIN_ID_DEC}).
          </div>
          <HoloButton variant="primary" onClick={connectWallet}>
            Switch Network
          </HoloButton>
        </HoloPanel>
      )}

      {account && isCorrectNetwork && (
        <div className="section-grid">
          <RegisterCard account={account} />
          <LookupCard />
        </div>
      )}

      {!account && (
        <HoloPanel hover>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Get Started</div>
          <div className="subtitle" style={{ marginBottom: '1rem' }}>
            Connect your wallet to register or lookup .motus domains on Celo.
          </div>
          <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem', padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontWeight: 700, fontSize: '0.85rem' }}>1</div>
              <span>Connect your wallet (we'll prompt for Celo Sepolia if needed)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontWeight: 700, fontSize: '0.85rem' }}>2</div>
              <span>Register a new .motus domain name</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bg)', fontWeight: 700, fontSize: '0.85rem' }}>3</div>
              <span>Lookup domain owners and metadata anytime</span>
            </div>
          </div>
        </HoloPanel>
      )}
      </main>
    </HolographicBackground>
  )
}

function Stat({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <HoloPanel variant="subtle" style={{ padding: '1rem' }}>
      <div className="subtitle" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontWeight: 700, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', wordBreak: 'break-all', fontSize: '0.95rem' }}>{value}</div>
    </HoloPanel>
  )
}

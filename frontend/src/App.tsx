import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WalletConnect from './components/WalletConnect'
import DomainRegister from './components/DomainRegister'
import DomainLookup from './components/DomainLookup'
import { getProvider, getContract } from './utils/contract'
import { HolographicBackground } from './components/molecules/HolographicBackground'
import { HoloText, HoloPanel, HoloButton } from './components/ui/index'
import './App.css'

// Get contract address from environment or use default
const CONTRACT_ADDRESS = import.meta.env.VITE_MOTUS_NAME_SERVICE_ADDRESS || '0x7b2a5c1E00B62A47dcF89cB4A4868e344bAf3736'
const NETWORK = import.meta.env.VITE_NETWORK || 'celoSepolia'
const CHAIN_ID = import.meta.env.VITE_CHAIN_ID || '11142220'
const CELO_SEPOLIA_CHAIN_ID = '0xaa044c' // 11142220 in hex (correct value)
const CELO_SEPOLIA_CHAIN_ID_DECIMAL = 11142220
const LOCALHOST_CHAIN_ID_DECIMAL = 1337

// Normalize chain ID for comparison (handles both hex and decimal)
function normalizeChainId(chainId: string | number): number {
  if (typeof chainId === 'number') return chainId
  // Remove '0x' prefix if present and convert to number
  const cleaned = chainId.startsWith('0x') ? chainId.slice(2) : chainId
  return parseInt(cleaned, 16)
}

function isCeloSepolia(chainId: string | number | null): boolean {
  if (!chainId) return false
  const normalized = normalizeChainId(chainId)
  // Support both Celo Sepolia and localhost for testing
  return normalized === CELO_SEPOLIA_CHAIN_ID_DECIMAL || normalized === LOCALHOST_CHAIN_ID_DECIMAL
}

function App() {
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  useEffect(() => {
    checkConnection()
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        window.ethereum.removeListener('chainChanged', handleChainChanged)
      }
    }
  }, [])

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setAccount(accounts[0])
        }
        const chainId = await window.ethereum.request({ method: 'eth_chainId' })
        setChainId(chainId)
        const isCorrect = isCeloSepolia(chainId)
        setIsCorrectNetwork(isCorrect)
        console.log('Chain ID:', chainId, 'Normalized:', normalizeChainId(chainId), 'Is Celo Sepolia:', isCorrect)
      } catch (error) {
        console.error('Error checking connection:', error)
      }
    }
  }

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      setAccount(null)
    } else {
      setAccount(accounts[0])
    }
  }

  const handleChainChanged = (chainId: string) => {
    setChainId(chainId)
    setIsCorrectNetwork(isCeloSepolia(chainId))
    // Don't reload, just update state
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or a Celo-compatible wallet!')
      return
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAccount(accounts[0])

      // Check and switch network if needed
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
      setChainId(currentChainId)
      
      if (!isCeloSepolia(currentChainId)) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CELO_SEPOLIA_CHAIN_ID }],
          })
          // After switching, check again
          const newChainId = await window.ethereum.request({ method: 'eth_chainId' })
          setChainId(newChainId)
          setIsCorrectNetwork(isCeloSepolia(newChainId))
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: CELO_SEPOLIA_CHAIN_ID,
                    chainName: 'Celo Sepolia Testnet',
                    nativeCurrency: {
                      name: 'CELO',
                      symbol: 'CELO',
                      decimals: 18,
                    },
                    rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
                    blockExplorerUrls: ['https://celo-sepolia.blockscout.com'],
                  },
                ],
              })
              // After adding, check again
              const newChainId = await window.ethereum.request({ method: 'eth_chainId' })
              setChainId(newChainId)
              setIsCorrectNetwork(isCeloSepolia(newChainId))
            } catch (addError) {
              console.error('Error adding chain:', addError)
              setIsCorrectNetwork(false)
            }
          } else {
            console.error('Error switching chain:', switchError)
            setIsCorrectNetwork(false)
          }
        }
      } else {
        setIsCorrectNetwork(true)
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      alert('Failed to connect wallet')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="relative min-h-screen overflow-hidden"
    >
      {/* Holographic Background */}
      <HolographicBackground />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full py-8"
        >
          <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-8">
            <div>
              <HoloText as="h1" size="xl" weight="bold" className="mb-2 text-fuchsia-300 drop-shadow-[0_0_20px_rgba(225,68,255,0.9)]">
                🏥 Motus Name Service
              </HoloText>
              <HoloText size="base" className="text-fuchsia-200/80 drop-shadow-[0_0_10px_rgba(225,68,255,0.6)]">
                Register your .motus domain on Celo
              </HoloText>
            </div>
          </div>
        </motion.header>

        {/* Main Content */}
        <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 py-8 lg:px-8">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            >
              <WalletConnect
                account={account}
                isCorrectNetwork={isCorrectNetwork}
                onConnect={connectWallet}
              />
            </motion.div>

            {account && isCorrectNetwork && (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }}
                >
                  <DomainRegister account={account} contractAddress={CONTRACT_ADDRESS} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
                >
                  <DomainLookup contractAddress={CONTRACT_ADDRESS} />
                </motion.div>
              </>
            )}
          </div>

          {account && !isCorrectNetwork && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.4 }}
            >
              <HoloPanel variant="elevated" size="lg" className="border-red-400/30">
                <HoloText as="h3" size="lg" weight="bold" className="mb-4 text-red-300">
                  ⚠️ Wrong Network
                </HoloText>
                <HoloText size="sm" className="mb-4 text-white/80">
                  Please switch to Celo Sepolia Testnet or Localhost to use the Motus Name Service.
                </HoloText>
                <div className="space-y-2 mb-4 font-mono text-xs text-white/60">
                  <p>
                    Current Chain ID: <code className="text-cyan-300">{chainId || 'Unknown'}</code> (Decimal: {chainId ? normalizeChainId(chainId) : 'N/A'})
              </p>
                  <p>
                Expected Chain IDs: 
                    <br />• Celo Sepolia: <code className="text-cyan-300">{CELO_SEPOLIA_CHAIN_ID}</code> (Decimal: {CELO_SEPOLIA_CHAIN_ID_DECIMAL})
                    <br />• Localhost: <code className="text-cyan-300">0x539</code> (Decimal: {LOCALHOST_CHAIN_ID_DECIMAL})
              </p>
                </div>
                <HoloButton variant="primary" onClick={connectWallet}>
                Switch Network
                </HoloButton>
              </HoloPanel>
            </motion.div>
          )}
      </main>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.6 }}
          className="w-full py-6 mt-auto"
        >
          <div className="max-w-[1440px] mx-auto w-full px-4 lg:px-8">
            <div className="space-y-2 font-mono text-xs text-white/60">
              <p>
                Contract Address: <code className="text-cyan-300">{CONTRACT_ADDRESS}</code>
              </p>
              <p>
                Network: {NETWORK === 'localhost' ? 'Localhost (Chain ID: 1337)' : 'Celo Sepolia Testnet (Chain ID: 11142220)'}
              </p>
            </div>
          </div>
        </motion.footer>

        {/* Scan Line Effect */}
        <motion.div
          animate={{ y: ["-100%", "100%"] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute inset-0 pointer-events-none"
        >
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" />
        </motion.div>
    </div>
    </motion.div>
  )
}

declare global {
  interface Window {
    ethereum?: any
  }
}

export default App


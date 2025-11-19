import { useState, useEffect } from 'react'
import { getContract, getProvider, getContractReadOnly, getEvvmContract } from '../utils/contract'
import { ethers } from 'ethers'
import { getNextNonce, getEvvmID, createGaslessRegistration } from '../utils/evvm'
import { HoloPanel, HoloText, HoloButton } from './ui/index'

interface DomainRegisterProps {
  account: string
  contractAddress: string
}

function DomainRegister({ account, contractAddress }: DomainRegisterProps) {
  const [domainName, setDomainName] = useState('')
  const [duration, setDuration] = useState('1')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [fee, setFee] = useState<string | null>(null)
  const [useGasless, setUseGasless] = useState(false)
  const [evvmEnabled, setEvvmEnabled] = useState(false)
  const [evvmAddress, setEvvmAddress] = useState<string | null>(null)

  const checkAvailability = async () => {
    if (!domainName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a domain name' })
      return
    }

    try {
      const contract = await getContract(contractAddress)
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(`${domainName}.motus`))
      const domain = await contract.domains(nameHash)
      
      if (domain.active) {
        setMessage({ type: 'error', text: `❌ ${domainName}.motus is already registered` })
      } else {
        setMessage({ type: 'success', text: `✅ ${domainName}.motus is available!` })
        // Calculate fee
        const calculatedFee = await contract.calculateRegistrationFee(domainName, getDurationInSeconds())
        setFee(ethers.formatEther(calculatedFee))
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message || 'Failed to check availability'}` })
    }
  }

  const getDurationInSeconds = () => {
    return BigInt(parseInt(duration)) * BigInt(365) * BigInt(24) * BigInt(60) * BigInt(60)
  }

  // Check EVVM status on mount
  useEffect(() => {
    checkEvvmStatus()
  }, [contractAddress])

  const checkEvvmStatus = async () => {
    try {
      // Use read-only contract for view calls
      const contract = await getContractReadOnly(contractAddress)
      
      // Check if contract exists by trying to read a simple constant first
      try {
        await contract.TLD()
      } catch (contractError: any) {
        console.error('Contract not found or not deployed at address:', contractAddress)
        setEvvmEnabled(false)
        setEvvmAddress(null)
        return
      }
      
      // Try to get EVVM address and enabled status
      let evvmAddr = ethers.ZeroAddress
      let enabled = false
      
      try {
        evvmAddr = await contract.evvmAddress()
        enabled = await contract.evvmEnabled()
      } catch (evvmError: any) {
        // If evvmAddress is not set or returns zero, that's okay
        console.log('EVVM not configured:', evvmError.message)
        evvmAddr = ethers.ZeroAddress
        enabled = false
      }
      
      setEvvmAddress(evvmAddr !== ethers.ZeroAddress ? evvmAddr : null)
      setEvvmEnabled(enabled && evvmAddr !== ethers.ZeroAddress)
    } catch (error) {
      console.error('Error checking EVVM status:', error)
      setEvvmEnabled(false)
      setEvvmAddress(null)
    }
  }

  const handleRegister = async () => {
    if (!domainName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a domain name' })
      return
    }

    if (!fee) {
      setMessage({ type: 'error', text: 'Please check availability first' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const contract = await getContract(contractAddress)
      const provider = await getProvider()
      const signer = await provider.getSigner()
      const durationSeconds = getDurationInSeconds()
      const calculatedFee = await contract.calculateRegistrationFee(domainName, durationSeconds)
      
      const metadata = JSON.stringify({
        type: 'healthcare-provider',
        specialty: 'general',
        registeredAt: new Date().toISOString(),
      })

      // Use gasless if enabled and selected
      if (useGasless && evvmEnabled && evvmAddress) {
        try {
          // Get EVVM ID and nonce
          const evvmID = await getEvvmID(provider, evvmAddress)
          const nonce = await getNextNonce(provider, evvmAddress, account)
          
          // Create gasless registration
          const gaslessData = await createGaslessRegistration(
            signer,
            evvmID,
            domainName,
            durationSeconds,
            ethers.ZeroAddress,
            metadata,
            calculatedFee,
            BigInt(0), // priorityFee = 0 for testing
            nonce,
            contractAddress
          )

          // Call registerGasless directly (for localhost testing, no relayer needed)
          const tx = await contract.registerGasless(...gaslessData.args)

          setMessage({ type: 'info', text: `⏳ Gasless transaction submitted: ${tx.hash}` })
          await tx.wait()

          setMessage({ 
            type: 'success', 
            text: `✅ Successfully registered ${domainName}.motus (gasless)!` 
          })
        } catch (gaslessError: any) {
          console.error('Gasless registration error:', gaslessError)
          setMessage({ 
            type: 'error', 
            text: `Gasless registration failed: ${gaslessError.message || 'Unknown error'}. Try traditional payment.` 
          })
          setLoading(false)
          return
        }
      } else {
        // Traditional payment (requires native token - ETH on localhost, CELO on Celo Sepolia)
        const tx = await contract.register(domainName, durationSeconds, ethers.ZeroAddress, metadata, {
          value: calculatedFee + (calculatedFee / BigInt(10)), // Add 10% buffer
        })

        setMessage({ type: 'info', text: `⏳ Transaction submitted: ${tx.hash}` })
        await tx.wait()

        setMessage({ 
          type: 'success', 
          text: `✅ Successfully registered ${domainName}.motus!` 
        })
      }

      setDomainName('')
      setFee(null)
    } catch (error: any) {
      console.error('Registration error:', error)
      setMessage({ 
        type: 'error', 
        text: `Registration failed: ${error.message || 'Unknown error'}` 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <HoloPanel variant="elevated" size="lg">
      <HoloText as="h2" size="lg" weight="bold" className="mb-6 text-fuchsia-300 drop-shadow-[0_0_15px_rgba(225,68,255,0.8)]">
        Register Domain
      </HoloText>
      
      <div className="space-y-4 mb-4">
        <div>
          <HoloText size="sm" className="mb-2 text-white/80">
        <label htmlFor="domainName">Domain Name</label>
          </HoloText>
          <div className="relative">
          <input
            id="domainName"
            type="text"
            placeholder="gerry"
            value={domainName}
            onChange={(e) => {
              setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setMessage(null)
              setFee(null)
            }}
            disabled={loading}
              className="w-full px-4 py-2 pr-20 rounded-xl bg-black/30 border border-cyan-400/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 backdrop-blur-sm"
          />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-300 font-mono text-sm">.motus</span>
        </div>
          <HoloText size="xs" className="mt-1 text-white/60">
            3-63 characters, alphanumeric and hyphens only
          </HoloText>
      </div>

        <div>
          <HoloText size="sm" className="mb-2 text-white/80">
        <label htmlFor="duration">Registration Duration</label>
          </HoloText>
        <select
          id="duration"
          value={duration}
          onChange={(e) => {
            setDuration(e.target.value)
            setFee(null)
          }}
          disabled={loading}
            className="w-full px-4 py-2 rounded-xl bg-black/30 border border-cyan-400/20 text-white focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 backdrop-blur-sm"
        >
          <option value="1">1 Year</option>
          <option value="2">2 Years</option>
          <option value="3">3 Years</option>
          <option value="5">5 Years</option>
          <option value="10">10 Years</option>
        </select>
        </div>
      </div>

      {fee && (
        <HoloPanel variant="default" size="sm" className="mb-4 bg-green-400/10 border-green-400/30">
          <HoloText size="sm" className="text-green-300">
            <strong>Registration Fee:</strong> {fee} {useGasless ? 'Principal Tokens' : 'CELO/ETH'}
          </HoloText>
        </HoloPanel>
      )}

      {evvmEnabled && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useGasless}
              onChange={(e) => setUseGasless(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-cyan-400/30 bg-black/30 text-cyan-400 focus:ring-cyan-400/50"
            />
            <HoloText size="sm" className="text-white/80">
              Use Gasless Transaction (No gas fees!)
            </HoloText>
          </label>
          {useGasless && (
            <HoloText size="xs" className="mt-2 text-green-300">
              ✅ Gasless transactions enabled - you won't pay gas fees!
            </HoloText>
          )}
        </div>
      )}

      {!evvmEnabled && (
        <HoloPanel variant="default" size="sm" className="mb-4 bg-yellow-400/10 border-yellow-400/30">
          <HoloText size="xs" className="text-yellow-300">
          <strong>ℹ️ Note:</strong> EVVM not configured. Using traditional payment (requires gas fees).
          </HoloText>
        </HoloPanel>
      )}

      <div className="flex gap-4 mb-4">
        <HoloButton
          variant="secondary"
          onClick={checkAvailability}
          disabled={loading || !domainName.trim()}
        >
          Check Availability
        </HoloButton>
        <HoloButton
          variant="primary"
          onClick={handleRegister}
          disabled={loading || !fee}
        >
          {loading ? 'Registering...' : 'Register Domain'}
        </HoloButton>
      </div>

      {message && (
        <HoloPanel 
          variant="default" 
          size="sm" 
          className={`${
            message.type === 'success' ? 'bg-green-400/10 border-green-400/30' :
            message.type === 'error' ? 'bg-red-400/10 border-red-400/30' :
            'bg-cyan-400/10 border-cyan-400/30'
          }`}
        >
          <HoloText 
            size="sm" 
            className={
              message.type === 'success' ? 'text-green-300' :
              message.type === 'error' ? 'text-red-300' :
              'text-cyan-300'
            }
          >
          {message.text}
          </HoloText>
        </HoloPanel>
      )}
    </HoloPanel>
  )
}

export default DomainRegister


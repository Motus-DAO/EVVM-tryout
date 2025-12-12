"use client"

import { useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { Card, Field, HStack } from './Primitives'
import { HoloPanel, HoloButton } from './ui'
import { CONTRACT_ADDRESS, getContract, getContractReadOnly, getProvider } from '@/lib/contracts'
import { createGaslessRegistration, getEvvmID, getNextNonce, EVVM_ADDRESS, EVVM_ID, DEFAULT_METADATA, DEFAULT_RESOLVER, verifyContractHasUpdatedFunction, sendToRelayer, RELAYER_URL, checkRelayerHealth } from '@/lib/evvm'

interface RegisterCardProps {
  account: string
  onTx?: (hash: string) => void
}

export function RegisterCard({ account, onTx }: RegisterCardProps) {
  const [domainName, setDomainName] = useState('')
  const [duration, setDuration] = useState('1')
  const [fee, setFee] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [evvmEnabled, setEvvmEnabled] = useState(false)
  const [evvmAddress, setEvvmAddress] = useState<string | null>(null)
  const [useGasless, setUseGasless] = useState(false)

  useEffect(() => {
    checkEvvmStatus().catch(console.error)
  }, [])

  const getDurationSeconds = () => BigInt(parseInt(duration)) * BigInt(365 * 24 * 60 * 60)

  async function checkEvvmStatus() {
    try {
      const contract = await getContractReadOnly(CONTRACT_ADDRESS)
      let evvmAddr = ethers.ZeroAddress
      let enabled = false
      try {
        evvmAddr = await contract.evvmAddress()
        enabled = await contract.evvmEnabled()
      } catch (err: any) {
        // Check if it's because the function doesn't exist (old contract)
        if (err?.code === 'CALL_EXCEPTION' || err?.message?.includes('missing revert data')) {
          console.warn('Contract may not have EVVM functions. Is this the updated contract?', err)
        } else {
          console.warn('EVVM not configured', err)
        }
      }
      setEvvmAddress(evvmAddr !== ethers.ZeroAddress ? evvmAddr : null)
      setEvvmEnabled(enabled && evvmAddr !== ethers.ZeroAddress)
    } catch (err) {
      console.error('EVVM status error', err)
      setEvvmEnabled(false)
      setEvvmAddress(null)
    }
  }

  async function checkAvailability() {
    if (!domainName.trim()) {
      setMessage({ tone: 'error', text: 'Enter a domain name first' })
      return
    }
    try {
      const contract = await getContract(CONTRACT_ADDRESS)
      const available = await contract.isAvailable(domainName)
      if (!available) {
        setMessage({ tone: 'error', text: `${domainName}.motus is already registered` })
        setFee(null)
        return
      }
      const calcFee = await contract.calculateRegistrationFee(domainName, getDurationSeconds())
      const feeAmount = ethers.formatEther(calcFee)
      setFee(feeAmount)
      if (calcFee === BigInt(0)) {
        setMessage({ tone: 'success', text: `✅ ${domainName}.motus is available! Free registration! 🎉` })
      } else {
        setMessage({ tone: 'success', text: `✅ ${domainName}.motus is available!` })
      }
    } catch (err: any) {
      setMessage({ tone: 'error', text: err?.message || 'Failed to check availability' })
    }
  }

  async function registerDomain() {
    if (!domainName.trim()) {
      setMessage({ tone: 'error', text: 'Enter a domain name' })
      return
    }
    if (!fee) {
      setMessage({ tone: 'error', text: 'Please check availability first' })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const provider = await getProvider()
      const contract = await getContract(CONTRACT_ADDRESS)
      const durationSeconds = getDurationSeconds()
      const calculatedFee = await contract.calculateRegistrationFee(domainName, durationSeconds)
      
      // If fee is 0, we can still use gasless transactions (no payment needed)
      const isFree = calculatedFee === BigInt(0)

      if (useGasless && evvmEnabled && evvmAddress) {
        const browserProvider = provider as ethers.BrowserProvider
        const signerInstance = await browserProvider.getSigner()
        
        // Validate EVVM is properly configured
        if (!evvmAddress || evvmAddress === ethers.ZeroAddress) {
          throw new Error('EVVM address not configured. Please set EVVM address on the contract.')
        }
        
        // Verify contract has updated function
        const contractCheck = await verifyContractHasUpdatedFunction(provider, CONTRACT_ADDRESS)
        if (!contractCheck.hasUpdatedFunction) {
          throw new Error(contractCheck.error || 'Contract does not have the updated code. Please redeploy the contract.')
        }
        
        // Get EVVM ID - MUST use the ID from the contract, not a fallback
        let evvmID: string
        try {
          evvmID = await getEvvmID(provider, evvmAddress)
          // EVVM ID must be 1 or higher (typically 1000+ after registration)
          // EVVM ID of 0 means the contract hasn't been registered with Registry EVVM
          if (evvmID === null || evvmID === undefined || evvmID === '') {
            throw new Error('EVVM ID is empty')
          }
          if (evvmID === '0') {
            throw new Error(
              'EVVM ID is 0. The EVVM contract must be registered with Registry EVVM to get a valid ID. ' +
              'Please register the EVVM contract first using: tsx scripts/register-evvm.ts <EVVM_ADDRESS> <CHAIN_ID> ' +
              'and then set the EVVM ID using: tsx scripts/set-evvm-id.ts <EVVM_ADDRESS> <EVVM_ID> celo'
            )
          }
          console.log('Using EVVM ID from contract:', evvmID)
        } catch (err: any) {
          console.error('Failed to get EVVM ID from contract:', err)
          // If it's our custom error about EVVM ID 0, throw it as-is
          if (err.message && err.message.includes('EVVM ID is 0')) {
            throw err
          }
          throw new Error(`Failed to get EVVM ID from contract: ${err.message}. The contract needs a valid EVVM ID to validate signatures.`)
        }
        
        // Check EVVM balance if payment is required
        if (calculatedFee > BigInt(0)) {
          try {
            const evvmAbi = ['function getBalance(address user, address token) view returns (uint256)']
            const evvmContract = new ethers.Contract(evvmAddress, evvmAbi, provider)
            const principalToken = '0x0000000000000000000000000000000000000001' // MATE token
            const balance = await evvmContract.getBalance(userAddress, principalToken)
            const requiredAmount = calculatedFee + BigInt(0) // priorityFee is 0 in this case
            
            if (balance < requiredAmount) {
              throw new Error(
                `Insufficient EVVM balance. You have ${ethers.formatEther(balance)} tokens, but need ${ethers.formatEther(requiredAmount)} tokens. ` +
                `Please deposit tokens into the EVVM contract via the Treasury contract first.`
              )
            }
            console.log(`EVVM balance check passed: ${ethers.formatEther(balance)} tokens available`)
          } catch (err: any) {
            // If it's our balance error, throw it as-is
            if (err.message && err.message.includes('Insufficient EVVM balance')) {
              throw err
            }
            // Otherwise, log but continue (balance check might fail for other reasons)
            console.warn('Could not check EVVM balance:', err.message)
          }
        }
        
        // Get user address
        const userAddress = await signerInstance.getAddress()
        
        // Create gasless registration data
        // Even if fee is 0, we still need to create the signatures (EVVM handles zero payments)
        const gaslessData = await createGaslessRegistration(
          signerInstance,
          evvmID,
          domainName,
          durationSeconds,
          DEFAULT_RESOLVER,
          DEFAULT_METADATA,
          calculatedFee, // This will be 0 if free registration is enabled
          BigInt(0), // priorityFee
          CONTRACT_ADDRESS,
          provider,
          evvmAddress
        )
        
        // Validate we have all required data
        if (!gaslessData.args || gaslessData.args.length !== 12) {
          throw new Error(`Invalid gasless data: expected 12 args, got ${gaslessData.args?.length || 0}`)
        }
        
        // Check if relayer is available
        const relayerHealth = await checkRelayerHealth(RELAYER_URL)
        if (!relayerHealth.available) {
          throw new Error(`Relayer is not available: ${relayerHealth.error || 'Unknown error'}. Please make sure the relayer service is running at ${RELAYER_URL}`)
        }

        // Send to relayer for gasless transaction
        // The relayer will submit the transaction and pay gas fees
        const serviceNonce = gaslessData.args[6] as bigint
        const txHash = await sendToRelayer(
          RELAYER_URL,
          userAddress,
          CONTRACT_ADDRESS,
          gaslessData.functionName,
          gaslessData.args,
          serviceNonce,
          signerInstance
        )
        
        onTx?.(txHash)
        setMessage({ tone: 'info', text: `⏳ Transaction submitted to relayer: ${txHash}` })
        
        // Wait for transaction confirmation
        const receipt = await provider.waitForTransaction(txHash)
        if (receipt && receipt.status === 1) {
          const successMsg = isFree 
            ? `✅ Registered ${domainName}.motus for FREE (gasless)! 🎉`
            : `✅ Registered ${domainName}.motus (gasless)!`
          setMessage({ tone: 'success', text: successMsg })
        } else {
          throw new Error('Transaction failed')
        }
      } else {
        const tx = await contract.register(domainName, durationSeconds, DEFAULT_RESOLVER, DEFAULT_METADATA, {
          value: calculatedFee + calculatedFee / BigInt(10),
        })
        onTx?.(tx.hash)
        setMessage({ tone: 'info', text: `⏳ Transaction submitted: ${tx.hash}` })
        await tx.wait()
        setMessage({ tone: 'success', text: `✅ Registered ${domainName}.motus!` })
      }
      setDomainName('')
      setFee(null)
    } catch (err: any) {
      console.error('register error', err)
      
      // Provide more helpful error messages
      let errorMessage = err?.message || 'Registration failed'
      
      if (errorMessage.includes('missing revert data')) {
        errorMessage = 'Contract call failed. The contract may not have the updated code, or EVVM may not be enabled. Please check the contract deployment.'
      } else if (errorMessage.includes('EVVM not enabled')) {
        errorMessage = 'EVVM is not enabled on this contract. Please enable EVVM first.'
      } else if (errorMessage.includes('Invalid signature')) {
        errorMessage = 'Signature validation failed. Please try again.'
      } else if (errorMessage.includes('Nonce already used')) {
        errorMessage = 'This nonce has already been used. Please try again.'
      } else if (errorMessage.includes('UpdateBalanceFailed') || errorMessage.includes('Insufficient EVVM balance')) {
        errorMessage = 'Insufficient balance in EVVM contract. You need to deposit tokens into the EVVM contract via the Treasury contract before using gasless transactions.'
      } else if (errorMessage.includes('CALL_EXCEPTION')) {
        errorMessage = 'Contract call failed. Please ensure the contract is deployed and EVVM is configured correctly.'
      }
      
      setMessage({ tone: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <HoloPanel hover>
      <div className="badge" style={{ marginBottom: '1rem' }}>Register .motus Domain</div>
      <div className="hero">
        <Field label="Domain name" hint="3-63 characters, lowercase, numbers, and hyphens only">
          <div style={{ position: 'relative' }}>
          <input
            className="input"
            placeholder="health-provider"
            value={domainName}
            onChange={(e) => {
              setDomainName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setMessage(null)
              setFee(null)
            }}
            disabled={loading}
          />
            <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', pointerEvents: 'none' }}>
              .motus
            </span>
          </div>
        </Field>
        <Field label="Registration Duration" hint="Years">
          <select className="input" value={duration} onChange={(e) => setDuration(e.target.value)} disabled={loading}>
            {[1, 2, 3, 5, 10].map((y) => (
              <option value={y} key={y}>
                {y} year{y > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </Field>
        {evvmEnabled && evvmAddress && (
          <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(52, 211, 153, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(52, 211, 153, 0.2)', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={useGasless} 
              onChange={(e) => setUseGasless(e.target.checked)} 
              disabled={loading}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Use EVVM Gasless Transaction</div>
              <div className="subtitle" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {fee === '0.0' ? '🎉 Free registration + No gas fees!' : 'No gas fees required!'}
              </div>
            </div>
          </label>
        )}
        {!evvmEnabled && (
          <div style={{ padding: '0.75rem', background: 'rgba(251, 191, 36, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <div className="subtitle" style={{ fontSize: '0.9rem', color: 'var(--warning)', marginBottom: '0.5rem' }}>
              ℹ️ EVVM not configured. Using traditional payment (requires gas fees).
            </div>
            <div className="subtitle" style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              To enable gasless transactions, run: <code style={{ background: 'rgba(0,0,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>npx hardhat run scripts/setup-evvm.ts --network celoSepolia</code>
            </div>
          </div>
        )}
        <HStack gap="0.75rem" wrap>
          <HoloButton variant="ghost" onClick={checkAvailability} disabled={loading || !domainName.trim()}>
            Check Availability
          </HoloButton>
          <HoloButton variant="primary" onClick={registerDomain} disabled={loading || !fee}>
            {loading ? 'Registering...' : 'Register Domain'}
          </HoloButton>
        </HStack>
        {fee && (
          <div style={{ padding: '0.75rem', background: fee === '0.0' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(52, 211, 153, 0.08)', borderRadius: 'var(--radius-md)', border: `1px solid ${fee === '0.0' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(52, 211, 153, 0.2)'}` }}>
            <div className="subtitle" style={{ fontSize: '0.9rem', color: fee === '0.0' ? 'var(--accent)' : 'var(--success)', fontWeight: 600 }}>
              {fee === '0.0' ? (
                <>🎉 FREE! No tokens required! {useGasless && 'Gasless transaction enabled.'}</>
              ) : (
                <>Estimated fee: {fee} {useGasless ? 'Principal Tokens' : 'CELO/ETH'} {!useGasless && '(plus 10% buffer)'}</>
              )}
            </div>
          </div>
        )}
        {message && (
          <div
            className="card"
            style={{
              background: 
                message.tone === 'success' ? 'rgba(52, 211, 153, 0.1)' : 
                message.tone === 'error' ? 'rgba(248, 113, 113, 0.1)' : 
                'rgba(96, 165, 250, 0.1)',
              borderColor: 
                message.tone === 'success' ? 'rgba(52, 211, 153, 0.3)' : 
                message.tone === 'error' ? 'rgba(248, 113, 113, 0.3)' : 
                'rgba(96, 165, 250, 0.3)',
              padding: '1rem',
            }}
          >
            <div style={{ 
              color: 
                message.tone === 'success' ? 'var(--success)' : 
                message.tone === 'error' ? 'var(--danger)' : 
                'var(--accent)',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}>
            {message.text}
            </div>
          </div>
        )}
      </div>
    </HoloPanel>
  )
}

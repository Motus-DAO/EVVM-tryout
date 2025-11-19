import { useState } from 'react'
import { getContract } from '../utils/contract'
import { ethers } from 'ethers'
import { HoloPanel, HoloText, HoloButton } from './ui/index'

interface DomainLookupProps {
  contractAddress: string
}

function DomainLookup({ contractAddress }: DomainLookupProps) {
  const [lookupName, setLookupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [domainInfo, setDomainInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!lookupName.trim()) {
      setError('Please enter a domain name')
      return
    }

    setLoading(true)
    setError(null)
    setDomainInfo(null)

    try {
      const contract = await getContract(contractAddress)
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(`${lookupName}.motus`))
      const domain = await contract.domains(nameHash)
      
      if (!domain.active) {
        setError(`${lookupName}.motus is not registered`)
        return
      }

      const nameString = await contract.nameFromHash(nameHash)
      
      setDomainInfo({
        name: nameString,
        owner: domain.owner,
        registrationTime: new Date(Number(domain.registrationTime) * 1000).toLocaleString(),
        expirationTime: new Date(Number(domain.expirationTime) * 1000).toLocaleString(),
        metadata: domain.metadata ? JSON.parse(domain.metadata) : null,
        isExpired: Number(domain.expirationTime) * 1000 < Date.now(),
      })
    } catch (error: any) {
      console.error('Lookup error:', error)
      setError(`Lookup failed: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <HoloPanel variant="elevated" size="lg">
      <HoloText as="h2" size="lg" weight="bold" className="mb-6 text-fuchsia-300 drop-shadow-[0_0_15px_rgba(225,68,255,0.8)]">
        Lookup Domain
      </HoloText>
      
      <div className="mb-4">
        <HoloText size="sm" className="mb-2 text-white/80">
        <label htmlFor="lookupName">Domain Name</label>
        </HoloText>
        <div className="relative">
          <input
            id="lookupName"
            type="text"
            placeholder="gerry"
            value={lookupName}
            onChange={(e) => {
              setLookupName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setError(null)
              setDomainInfo(null)
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLookup()
              }
            }}
            disabled={loading}
            className="w-full px-4 py-2 pr-20 rounded-xl bg-black/30 border border-cyan-400/20 text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 backdrop-blur-sm"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-300 font-mono text-sm">.motus</span>
        </div>
      </div>

      <HoloButton
        variant="primary"
        onClick={handleLookup}
        disabled={loading || !lookupName.trim()}
        className="w-full mb-4"
      >
        {loading ? 'Looking up...' : 'Lookup Domain'}
      </HoloButton>

      {error && (
        <HoloPanel variant="default" size="sm" className="mb-4 bg-red-400/10 border-red-400/30">
          <HoloText size="sm" className="text-red-300">
          {error}
          </HoloText>
        </HoloPanel>
      )}

      {domainInfo && (
        <HoloPanel variant="default" size="lg" className="bg-black/40">
          <HoloText as="h3" size="lg" weight="bold" className="mb-4 text-fuchsia-300 drop-shadow-[0_0_15px_rgba(225,68,255,0.8)]">
            {domainInfo.name}
          </HoloText>
          {domainInfo.isExpired && (
            <HoloPanel variant="default" size="sm" className="mb-4 bg-red-400/10 border-red-400/30">
              <HoloText size="sm" className="text-red-300">
              ⚠️ This domain has expired
              </HoloText>
            </HoloPanel>
          )}
          <div className="space-y-2 font-mono text-sm">
            <HoloText size="sm" className="text-white/80">
              <strong>Owner:</strong> <code className="text-cyan-300">{domainInfo.owner}</code>
            </HoloText>
            <HoloText size="sm" className="text-white/80">
              <strong>Registered:</strong> {domainInfo.registrationTime}
            </HoloText>
            <HoloText size="sm" className="text-white/80">
              <strong>Expires:</strong> {domainInfo.expirationTime}
            </HoloText>
          </div>
          {domainInfo.metadata && (
            <div className="mt-4">
              <HoloText size="sm" className="mb-2 text-white/80">
              <strong>Metadata:</strong>
              </HoloText>
              <pre className="p-4 rounded-xl bg-black/30 border border-cyan-400/20 text-xs text-cyan-300 overflow-auto font-mono">
                {JSON.stringify(domainInfo.metadata, null, 2)}
              </pre>
            </div>
          )}
        </HoloPanel>
      )}
    </HoloPanel>
  )
}

export default DomainLookup


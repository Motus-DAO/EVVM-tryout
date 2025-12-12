"use client"

import { useState } from 'react'
import { ethers } from 'ethers'
import { Card, Field } from './Primitives'
import { HoloPanel, HoloButton } from './ui'
import { CONTRACT_ADDRESS, getContract } from '@/lib/contracts'
import { NAME_SUFFIX } from '@/lib/evvm'

export function LookupCard() {
  const [lookupName, setLookupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [domainInfo, setDomainInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLookup() {
    if (!lookupName.trim()) {
      setError('Enter a name to lookup')
      return
    }
    setLoading(true)
    setError(null)
    setDomainInfo(null)
    try {
      const contract = await getContract(CONTRACT_ADDRESS)
      const nameHash = ethers.keccak256(ethers.toUtf8Bytes(`${lookupName}${NAME_SUFFIX}`))
      const domain = await contract.domains(nameHash)
      if (!domain.active) {
        setError(`${lookupName}${NAME_SUFFIX} is not registered`)
        return
      }
      const resolvedName = await contract.nameFromHash(nameHash)
      setDomainInfo({
        name: resolvedName,
        owner: domain.owner,
        registrationTime: new Date(Number(domain.registrationTime) * 1000).toLocaleString(),
        expirationTime: new Date(Number(domain.expirationTime) * 1000).toLocaleString(),
        metadata: domain.metadata ? safeJson(domain.metadata) : null,
        isExpired: Number(domain.expirationTime) * 1000 < Date.now(),
      })
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <HoloPanel hover>
      <div className="badge" style={{ marginBottom: '1rem' }}>Lookup Domain</div>
      <div className="hero">
        <Field label="Domain name" hint="Enter name without .motus suffix">
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              placeholder="example"
              value={lookupName}
              onChange={(e) => {
                setLookupName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setError(null)
                setDomainInfo(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLookup()
              }}
              disabled={loading}
            />
            <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.9rem', pointerEvents: 'none' }}>
              {NAME_SUFFIX}
            </span>
          </div>
        </Field>
        <HoloButton variant="primary" onClick={handleLookup} disabled={loading || !lookupName.trim()} style={{ width: '100%' }}>
          {loading ? 'Looking up...' : 'Lookup Domain'}
        </HoloButton>
        {error && (
          <div className="card" style={{ background: 'rgba(248, 113, 113, 0.1)', borderColor: 'rgba(248, 113, 113, 0.3)', padding: '1rem' }}>
            <div style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</div>
          </div>
        )}
        {domainInfo && (
          <div className="card" style={{ background: 'rgba(96, 165, 250, 0.05)', borderColor: 'rgba(96, 165, 250, 0.2)', padding: '1.25rem' }}>
            {domainInfo.isExpired && (
              <div style={{ padding: '0.75rem', background: 'rgba(248, 113, 113, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(248, 113, 113, 0.2)', marginBottom: '1rem' }}>
                <div style={{ color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>⚠️ This domain has expired</div>
              </div>
            )}
            <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--accent)' }}>
              {domainInfo.name}
            </div>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <InfoRow label="Owner" value={domainInfo.owner} mono />
              <InfoRow label="Registered" value={domainInfo.registrationTime} />
              <InfoRow label="Expires" value={domainInfo.expirationTime} />
            </div>
            {domainInfo.metadata && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--muted)', fontSize: '0.9rem' }}>Metadata</div>
                <pre style={{ 
                  background: 'rgba(0, 0, 0, 0.3)', 
                  padding: '1rem', 
                  borderRadius: 'var(--radius-md)', 
                  fontFamily: 'JetBrains Mono, monospace', 
                  color: 'var(--accent)',
                  fontSize: '0.85rem',
                  overflow: 'auto',
                  border: '1px solid var(--border)'
                }}>
                {JSON.stringify(domainInfo.metadata, null, 2)}
              </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </HoloPanel>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ color: 'var(--muted)', fontSize: '0.85rem', fontWeight: 500 }}>{label}</div>
      <div style={{ fontWeight: 600, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit', fontSize: '0.95rem', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

function safeJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

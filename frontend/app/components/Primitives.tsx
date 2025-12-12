import { ReactNode } from 'react'
import clsx from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card', className)}>{children}</div>
}

export function HStack({ children, justify = 'start', wrap = false, gap = '1rem' }: { children: ReactNode; justify?: 'start' | 'between' | 'center'; wrap?: boolean; gap?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: justify === 'between' ? 'space-between' : justify === 'center' ? 'center' : 'flex-start',
        gap,
        flexWrap: wrap ? 'wrap' : 'nowrap',
      }}
    >
      {children}
    </div>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gap: '0.4rem' }}>
      <div style={{ color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
      {children}
      {hint && <div className="subtitle" style={{ fontSize: '0.9rem' }}>{hint}</div>}
    </div>
  )
}

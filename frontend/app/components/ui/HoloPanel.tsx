'use client'

import { ReactNode } from 'react'
import clsx from 'clsx'

interface HoloPanelProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'glow' | 'subtle'
  hover?: boolean
  style?: React.CSSProperties
}

export function HoloPanel({ children, className = '', variant = 'default', hover = true, style }: HoloPanelProps) {
  return (
    <div
      className={clsx(
        'holo-panel',
        `holo-panel-${variant}`,
        hover && 'holo-panel-hover',
        className
      )}
      style={style}
    >
      <div className="holo-panel-inner">
        {children}
      </div>
      <div className="holo-panel-border" />
    </div>
  )
}


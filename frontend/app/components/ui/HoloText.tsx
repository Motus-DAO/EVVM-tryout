'use client'

import { ReactNode } from 'react'
import clsx from 'clsx'

interface HoloTextProps {
  children: ReactNode
  variant?: 'heading' | 'subheading' | 'body' | 'mono'
  gradient?: 'default' | 'accent' | 'purple' | 'cyan'
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div'
}

export function HoloText({
  children,
  variant = 'body',
  gradient = 'default',
  className = '',
  as: Component = 'div',
}: HoloTextProps) {
  return (
    <Component
      className={clsx(
        'holo-text',
        `holo-text-${variant}`,
        `holo-text-gradient-${gradient}`,
        className
      )}
    >
      {children}
    </Component>
  )
}


'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

interface HoloButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
}

export function HoloButton({
  children,
  variant = 'primary',
  size = 'md',
  glow = true,
  className = '',
  disabled,
  ...props
}: HoloButtonProps) {
  return (
    <button
      className={clsx(
        'holo-button',
        `holo-button-${variant}`,
        `holo-button-${size}`,
        glow && 'holo-button-glow',
        disabled && 'holo-button-disabled',
        className
      )}
      disabled={disabled}
      {...props}
    >
      <span className="holo-button-content">{children}</span>
      {glow && !disabled && <span className="holo-button-glow-effect" />}
    </button>
  )
}


import type { Metadata } from 'next'
import { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Motus Name Service',
  description: 'Register and resolve .motus identities on Celo',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>{children}</body>
    </html>
  )
}

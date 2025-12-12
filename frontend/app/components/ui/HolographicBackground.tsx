'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface HolographicBackgroundProps {
  children?: ReactNode
  intensity?: 'low' | 'medium' | 'high'
  className?: string
}

export function HolographicBackground({ children, intensity = 'medium', className = '' }: HolographicBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const intensityMap = {
      low: 0.3,
      medium: 0.5,
      high: 0.8,
    }

    const opacity = intensityMap[intensity]
    let time = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Create animated gradient mesh
      const gradient1 = ctx.createRadialGradient(
        canvas.width * 0.3 + Math.sin(time * 0.001) * 200,
        canvas.height * 0.3 + Math.cos(time * 0.001) * 200,
        0,
        canvas.width * 0.3 + Math.sin(time * 0.001) * 200,
        canvas.height * 0.3 + Math.cos(time * 0.001) * 200,
        400
      )
      gradient1.addColorStop(0, `rgba(96, 165, 250, ${opacity * 0.4})`)
      gradient1.addColorStop(1, 'transparent')

      const gradient2 = ctx.createRadialGradient(
        canvas.width * 0.7 + Math.cos(time * 0.0015) * 250,
        canvas.height * 0.7 + Math.sin(time * 0.0015) * 250,
        0,
        canvas.width * 0.7 + Math.cos(time * 0.0015) * 250,
        canvas.height * 0.7 + Math.sin(time * 0.0015) * 250,
        500
      )
      gradient2.addColorStop(0, `rgba(168, 85, 247, ${opacity * 0.3})`)
      gradient2.addColorStop(1, 'transparent')

      const gradient3 = ctx.createRadialGradient(
        canvas.width * 0.5 + Math.sin(time * 0.002) * 150,
        canvas.height * 0.5 + Math.cos(time * 0.002) * 150,
        0,
        canvas.width * 0.5 + Math.sin(time * 0.002) * 150,
        canvas.height * 0.5 + Math.cos(time * 0.002) * 150,
        350
      )
      gradient3.addColorStop(0, `rgba(59, 130, 246, ${opacity * 0.25})`)
      gradient3.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient1
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = gradient2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = gradient3
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      time += 16
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [intensity])

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%', minHeight: '100vh' }}>
      <canvas
        ref={canvasRef}
        style={{ 
          position: 'absolute', 
          inset: 0, 
          width: '100%', 
          height: '100%', 
          pointerEvents: 'none',
          zIndex: 0 
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  )
}


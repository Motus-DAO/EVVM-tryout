/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        'orbitron': ['Orbitron', 'monospace'],
        'display': ['Orbitron', 'monospace'],
        'heading': ['JetBrains Mono', 'monospace'],
        'mono': ['JetBrains Mono', 'monospace'],
        'body': ['Inter', 'sans-serif'],
        'special': ['Jura', 'sans-serif'],
      },
      colors: {
        'psy-purple': '#8B5CF6',
        'psy-blue': '#3B82F6',
        'psy-green': '#10B981',
        bg: 'var(--color-bg)',
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
        secondary: 'var(--color-secondary)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        'electric-cyan': '#00FFFF',
        'vibrant-magenta': '#FF00FF',
        'deep-black': '#000000',
        'translucent-white': 'rgba(255, 255, 255, 0.15)',
        neonCyan: '#00ffff',
        neonMagenta: '#ff00ff',
      },
      borderRadius: {
        glass: 'var(--radius)',
      },
      backdropBlur: {
        glass: 'var(--blur)',
      },
      boxShadow: {
        'holo-glow': '0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(255, 0, 255, 0.3)',
        'holo-glow-magenta': '0 0 20px rgba(255, 0, 255, 0.3), 0 0 40px rgba(255, 0, 255, 0.2)',
        'holo-glow-mixed': '0 0 20px rgba(0, 255, 255, 0.2), 0 0 40px rgba(255, 0, 255, 0.1)',
        'edge-lighting': '0 0 30px rgba(0, 255, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'edge-glow-pulse': 'edge-glow-pulse 4s ease-in-out infinite',
        'gradient-rotation': 'gradient-rotation 3s linear infinite',
        'holographic-scan': 'holographic-scan 6s linear infinite',
        'circuit-flow': 'circuit-flow 3s ease-in-out infinite',
        'holo-glow': 'holo-glow 3s ease-in-out infinite',
        'circuit-pulse': 'circuit-pulse 2s ease-in-out infinite',
        'float-panel': 'float-panel 6s ease-in-out infinite',
        'motion-blur-streak': 'motion-blur-streak 2s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 3s ease-in-out infinite',
      },
      opacity: {
        'bg': 'var(--opacity-bg)',
        'far': 'var(--opacity-far)',
        'mid': 'var(--opacity-mid)',
        'near': 'var(--opacity-near)',
        'main': 'var(--opacity-main)',
      },
      zIndex: {
        'background-deep': 'var(--z-background-deep)',
        'background-mid': 'var(--z-background-mid)',
        'background-overlay': 'var(--z-background-overlay)',
        'content': 'var(--z-content)',
        'content-elevated': 'var(--z-content-elevated)',
        'modal': 'var(--z-modal)',
        'loader': 'var(--z-loader)',
      },
    },
  },
  plugins: [],
}


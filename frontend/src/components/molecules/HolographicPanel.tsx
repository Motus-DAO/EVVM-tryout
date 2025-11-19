import React from 'react';

interface HolographicPanelProps {
  variant?: 'primary' | 'secondary' | 'overlay' | 'background';
  edgeColor?: 'cyan' | 'magenta' | 'purple' | 'mixed';
  opacity?: 'bg' | 'far' | 'mid' | 'near' | 'main';
  size?: 'small' | 'medium' | 'large' | 'xl';
  position?: { x: number; y: number; z: number };
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function HolographicPanel({
  variant = 'primary',
  edgeColor = 'cyan',
  opacity = 'main',
  size = 'medium',
  position = { x: 0, y: 0, z: 0 },
  children,
  className = '',
  style = {}
}: HolographicPanelProps) {
  
  const sizeClasses = {
    small: 'w-32 h-24',
    medium: 'w-48 h-32',
    large: 'w-64 h-40',
    xl: 'w-80 h-48'
  };
  
  const variantClasses = {
    primary: 'bg-black/20 backdrop-blur-xl',
    secondary: 'bg-black/15 backdrop-blur-lg',
    overlay: 'bg-black/10 backdrop-blur-md opacity-80',
    background: 'bg-black/5 backdrop-blur-sm opacity-60'
  };
  
  const edgeClasses = {
    cyan: 'border border-cyan-400/30',
    magenta: 'border border-fuchsia-400/30',
    purple: 'border border-purple-400/30',
    mixed: 'border border-transparent'
  };
  
  const getEdgeGlowStyle = () => {
    if (edgeColor === 'mixed') {
      return {
        background: 'linear-gradient(45deg, #00FFFF, #FF00FF, #9D68FF, #00FFFF)',
        backgroundSize: '400% 400%',
        animation: 'gradient-rotation 3s linear infinite'
      };
    }
    return {};
  };
  
  return (
    <div
      className={`
        absolute rounded-2xl p-4
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${edgeClasses[edgeColor]}
        ${className}
      `}
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, ${position.z}px)`,
        zIndex: Math.floor(position.z / 10) + 5,
        ...getEdgeGlowStyle(),
        ...style
      }}
    >
      <div className="absolute inset-0 rounded-2xl border border-white/10" />
      <div className="absolute inset-1 rounded-2xl border border-white/5" />
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}


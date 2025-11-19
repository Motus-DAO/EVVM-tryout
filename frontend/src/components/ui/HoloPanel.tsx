import React from "react";
import clsx from "clsx";

interface HoloPanelProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "floating";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
  interactive?: boolean;
}

export const HoloPanel: React.FC<HoloPanelProps> = ({
  children,
  variant = "default",
  size = "md",
  className,
  onClick,
  interactive = false,
}) => {
  const baseClasses = "relative overflow-hidden rounded-2xl backdrop-blur-xl transition-all duration-300";
  
  const variantClasses = {
    default: "border border-fuchsia-400/30 shadow-[0_0_20px_rgba(225,68,255,0.2)] bg-black/20",
    elevated: "border border-fuchsia-400/40 shadow-[0_0_30px_rgba(225,68,255,0.3)] hover:shadow-[0_0_40px_rgba(225,68,255,0.4)] bg-black/30",
    floating: "border border-fuchsia-400/30 shadow-[0_0_20px_rgba(225,68,255,0.2)] hover:border-fuchsia-400/40 hover:shadow-[0_0_30px_rgba(225,68,255,0.3)] bg-black/20"
  };
  
  const sizeClasses = {
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
    xl: "p-8"
  };
  
  const interactiveClasses = interactive
    ? "cursor-pointer hover:scale-[1.02] hover:bg-black/40"
    : "";
  
  return (
    <div
      onClick={onClick}
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        interactiveClasses,
        className
      )}
    >
      {/* Holographic border effect */}
      <div className="absolute inset-0 rounded-2xl border border-white/10" />
      <div className="absolute inset-1 rounded-2xl border border-white/5" />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Scan line effect */}
      <div className="absolute inset-0 rounded-2xl opacity-20 animate-[holographic-scan_6s_linear_infinite]" />
    </div>
  );
};


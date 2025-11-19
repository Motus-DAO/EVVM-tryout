import React from "react";
import { motion } from "framer-motion";

export const HolographicBackground: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute inset-0 -z-10"
    >
      {/* Primary radial gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-cyan-500/20 via-transparent to-fuchsia-500/20" />
      
      {/* Secondary gradient overlay */}
      <motion.div
        animate={{
          background: [
            "radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 0, 255, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 80% 20%, rgba(0, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255, 0, 255, 0.15) 0%, transparent 50%)",
            "radial-gradient(circle at 20% 20%, rgba(0, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 0, 255, 0.15) 0%, transparent 50%)"
          ]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0"
      />
      
      {/* Animated blur orbs */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 100, 0],
          scale: [1, 1.2, 0.8, 1]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{
          x: [0, -100, 50, 0],
          y: [0, 50, -100, 0],
          scale: [1, 0.8, 1.2, 1]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-fuchsia-500/10 rounded-full blur-3xl"
      />
      
      {/* Subtle noise texture */}
      <div className="absolute inset-0 opacity-5 bg-gradient-to-br from-transparent via-cyan-500/5 to-transparent" />
    </motion.div>
  );
};


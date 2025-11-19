import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HoloPanel, HoloText } from "../ui";
import { FaTerminal, FaCog, FaRobot, FaUser } from "react-icons/fa";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "system" | "ai" | "user" | "error";
  message: string;
}

interface TerminalWindowProps {
  className?: string;
  maxHeight?: string;
  logs?: LogEntry[];
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  className,
  maxHeight = "400px",
  logs: initialLogs = []
}) => {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [isConnected, setIsConnected] = useState(true);
  
  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "system": return <FaCog className="text-cyan-400" />;
      case "ai": return <FaRobot className="text-fuchsia-500" />;
      case "user": return <FaUser className="text-green-400" />;
      case "error": return <FaTerminal className="text-red-400" />;
      default: return null;
    }
  };
  
  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "system": return "text-cyan-300";
      case "ai": return "text-fuchsia-300";
      case "user": return "text-green-300";
      case "error": return "text-red-300";
      default: return "text-white/80";
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      whileHover={{ scale: 1.01, boxShadow: "0 0 20px rgba(0,255,255,0.3)" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className}
    >
      <HoloPanel variant="elevated" size="lg" className="h-full">
        {/* Terminal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FaTerminal className="text-cyan-400 text-xl" />
            <HoloText size="lg" weight="bold">PsyChat Terminal</HoloText>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} neon-flicker`} />
            <span className="text-sm text-white/60">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {/* Terminal Content */}
        <div 
          className="p-4 font-mono text-sm overflow-hidden"
          style={{ maxHeight }}
        >
          <div className="space-y-1">
            <AnimatePresence>
              {logs.map((log, index) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    ease: "easeOut" 
                  }}
                  className="flex items-center space-x-3 py-1"
                >
                  <span className="text-white/40 text-xs w-16">
                    {log.timestamp}
                  </span>
                  <div className="flex items-center space-x-2">
                    {getLogIcon(log.type)}
                    <span className={`${getLogColor(log.type)} text-xs`}>
                      [{log.type.toUpperCase()}]
                    </span>
                  </div>
                  <span className="text-white/80 text-xs flex-1">
                    {log.message}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Terminal Cursor */}
          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex items-center mt-2"
          >
            <span className="text-cyan-300 neon-flicker">user@psychat:~$</span>
            <div className="w-2 h-4 bg-cyan-400 ml-1 transform rotate-45" />
          </motion.div>
        </div>
        
        {/* Status Bar */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-cyan-400/20">
          <div className="flex space-x-4 text-xs text-white/60">
            <span>Lines: {logs.length}</span>
            <span>Buffer: 1.2KB</span>
            <span>Mode: Interactive</span>
          </div>
        </div>
      </HoloPanel>
    </motion.div>
  );
};


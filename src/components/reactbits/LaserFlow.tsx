"use client";
import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface LaserFlowProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  strokeWidth?: number;
  speed?: number;
}

const LaserFlow: React.FC<LaserFlowProps> = ({
  children,
  className = "",
  color = "hsl(43 88% 50%)",
  strokeWidth = 2,
  speed = 3,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Top border laser */}
      <svg className="absolute top-0 left-0 w-full h-[2px] overflow-visible" preserveAspectRatio="none">
        <motion.line
          x1="0%"
          y1="0"
          x2="100%"
          y2="0"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 1, 1, 0],
            x1: ["0%", "0%", "0%", "100%"],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color})`,
          }}
        />
      </svg>

      {/* Right border laser */}
      <svg className="absolute top-0 right-0 w-[2px] h-full overflow-visible" preserveAspectRatio="none">
        <motion.line
          x1="0"
          y1="0%"
          x2="0"
          y2="100%"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 1, 1, 0],
            y1: ["0%", "0%", "0%", "100%"],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "easeInOut",
            delay: speed * 0.25,
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color})`,
          }}
        />
      </svg>

      {/* Bottom border laser */}
      <svg className="absolute bottom-0 left-0 w-full h-[2px] overflow-visible" preserveAspectRatio="none">
        <motion.line
          x1="100%"
          y1="0"
          x2="0%"
          y2="0"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 1, 1, 0],
            x1: ["100%", "100%", "100%", "0%"],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "easeInOut",
            delay: speed * 0.5,
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color})`,
          }}
        />
      </svg>

      {/* Left border laser */}
      <svg className="absolute top-0 left-0 w-[2px] h-full overflow-visible" preserveAspectRatio="none">
        <motion.line
          x1="0"
          y1="100%"
          x2="0"
          y2="0%"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 1, 0],
            opacity: [0, 1, 1, 0],
            y1: ["100%", "100%", "100%", "0%"],
          }}
          transition={{
            duration: speed,
            repeat: Infinity,
            ease: "easeInOut",
            delay: speed * 0.75,
          }}
          style={{
            filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 16px ${color})`,
          }}
        />
      </svg>

      {children}
    </div>
  );
};

export default LaserFlow;

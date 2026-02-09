"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface Line {
  id: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  duration: number;
  delay: number;
}

interface FloatingLinesProps {
  className?: string;
  lineCount?: number;
  color?: string;
  opacity?: number;
}

const FloatingLines: React.FC<FloatingLinesProps> = ({
  className = "",
  lineCount = 20,
  color = "hsl(43 88% 50%)",
  opacity = 0.15,
}) => {
  const lines: Line[] = Array.from({ length: lineCount }, (_, i) => ({
    id: i,
    x1: Math.random() * 100,
    y1: Math.random() * 100,
    x2: Math.random() * 100,
    y2: Math.random() * 100,
    duration: 15 + Math.random() * 20,
    delay: Math.random() * 10,
  }));

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0" />
            <stop offset="50%" stopColor={color} stopOpacity={opacity} />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {lines.map((line) => (
          <motion.line
            key={line.id}
            x1={`${line.x1}%`}
            y1={`${line.y1}%`}
            x2={`${line.x2}%`}
            y2={`${line.y2}%`}
            stroke="url(#lineGradient)"
            strokeWidth="1"
            initial={{
              x1: `${line.x1}%`,
              y1: `${line.y1}%`,
              x2: `${line.x2}%`,
              y2: `${line.y2}%`,
            }}
            animate={{
              x1: [`${line.x1}%`, `${(line.x1 + 30) % 100}%`, `${line.x1}%`],
              y1: [`${line.y1}%`, `${(line.y1 + 20) % 100}%`, `${line.y1}%`],
              x2: [`${line.x2}%`, `${(line.x2 + 25) % 100}%`, `${line.x2}%`],
              y2: [`${line.y2}%`, `${(line.y2 + 35) % 100}%`, `${line.y2}%`],
            }}
            transition={{
              duration: line.duration,
              delay: line.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Glowing nodes at intersections */}
        {lines.slice(0, 8).map((line, i) => (
          <motion.circle
            key={`node-${line.id}`}
            r={2}
            fill={color}
            initial={{ 
              cx: `${line.x1}%`, 
              cy: `${line.y1}%`,
              opacity: 0.3,
              scale: 1,
            }}
            animate={{
              cx: [`${line.x1}%`, `${(line.x1 + 30) % 100}%`, `${line.x1}%`],
              cy: [`${line.y1}%`, `${(line.y1 + 20) % 100}%`, `${line.y1}%`],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 2, 1],
            }}
            transition={{
              duration: line.duration,
              delay: line.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              filter: `drop-shadow(0 0 6px ${color})`,
              transformOrigin: 'center',
            }}
          />
        ))}
      </svg>
    </div>
  );
};

export default FloatingLines;

"use client";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Spark {
  id: number;
  x: number;
  y: number;
}

interface ClickSparkProps {
  children: React.ReactNode;
  className?: string;
  sparkColor?: string;
  sparkCount?: number;
}

const ClickSpark: React.FC<ClickSparkProps> = ({
  children,
  className = "",
  sparkColor = "hsl(345 75% 65%)",
  sparkCount = 8,
}) => {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newSparks = Array.from({ length: sparkCount }, () => ({
        id: idRef.current++,
        x,
        y,
      }));

      setSparks((prev) => [...prev, ...newSparks]);

      setTimeout(() => {
        setSparks((prev) =>
          prev.filter((s) => !newSparks.find((ns) => ns.id === s.id))
        );
      }, 600);
    },
    [sparkCount]
  );

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onClick={handleClick}
    >
      {children}
      <AnimatePresence>
        {sparks.map((spark, i) => {
          const angle = (i * 360) / sparkCount + Math.random() * 30;
          const distance = 30 + Math.random() * 20;
          const endX = Math.cos((angle * Math.PI) / 180) * distance;
          const endY = Math.sin((angle * Math.PI) / 180) * distance;

          return (
            <motion.div
              key={spark.id}
              className="pointer-events-none absolute h-1 w-1 rounded-full"
              style={{
                left: spark.x,
                top: spark.y,
                backgroundColor: sparkColor,
              }}
              initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
              animate={{
                scale: 0,
                opacity: 0,
                x: endX,
                y: endY,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ClickSpark;

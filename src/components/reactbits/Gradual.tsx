"use client";
import { motion, useScroll, useTransform } from "framer-motion";

interface GradualProps {
  children: React.ReactNode;
  className?: string;
  color?: string;
  height?: string;
}

const Gradual: React.FC<GradualProps> = ({
  children,
  className = "",
  color = "hsl(43 88% 50%)",
  height = "120px",
}) => {
  const { scrollYProgress } = useScroll();
  
  const glowIntensity = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    [0.3, 0.6, 1]
  );

  return (
    <motion.div 
      className={`fixed bottom-0 left-0 right-0 pointer-events-none z-40 ${className}`}
      style={{ height }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${color}, transparent)`,
          opacity: glowIntensity,
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to top, ${color.replace(')', ' / 0.5)')}, transparent)`,
          filter: "blur(30px)",
          opacity: glowIntensity,
        }}
      />
      {children}
    </motion.div>
  );
};

export default Gradual;

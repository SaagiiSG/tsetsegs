"use client";
import { motion } from "framer-motion";

interface AuroraProps {
  className?: string;
  colors?: string[];
  speed?: number;
}

const Aurora: React.FC<AuroraProps> = ({
  className = "",
  colors = [
    "hsl(345 75% 65%)",
    "hsl(25 85% 70%)",
    "hsl(270 50% 75%)",
    "hsl(345 75% 65%)",
  ],
  speed = 10,
}) => {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${colors.join(", ")})`,
          backgroundSize: "400% 400%",
        }}
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div className="absolute inset-0 backdrop-blur-3xl" />
    </div>
  );
};

export default Aurora;

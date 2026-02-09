"use client";
import { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface GalleryItem {
  id: string;
  image: string;
  title?: string;
  subtitle?: string;
}

interface DomeGalleryProps {
  items: GalleryItem[];
  className?: string;
  radius?: number;
}

const DomeGallery: React.FC<DomeGalleryProps> = ({
  items,
  className = "",
  radius = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 150 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const rotateX = useTransform(springY, [-200, 200], [15, -15]);
  const rotateY = useTransform(springX, [-200, 200], [-15, 15]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const angleStep = 360 / items.length;

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center ${className}`}
      style={{ 
        perspective: "1200px",
        height: `${radius * 2 + 200}px`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative"
        style={{
          transformStyle: "preserve-3d",
          rotateX,
          rotateY,
          width: radius * 2,
          height: radius * 2,
        }}
      >
        {items.map((item, index) => {
          const angle = (angleStep * index - 90) * (Math.PI / 180);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius * 0.4; // Flatten for dome effect
          const z = Math.sin(angle) * radius * 0.6;
          const itemRotation = angleStep * index;

          return (
            <motion.div
              key={item.id}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                transform: `translate3d(${x}px, ${y}px, ${z}px) rotateY(${itemRotation}deg)`,
                transformStyle: "preserve-3d",
              }}
              whileHover={{ scale: 1.1, z: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="w-32 h-40 md:w-40 md:h-52 rounded-xl overflow-hidden border-2 border-[hsl(43_88%_50%_/_0.3)] bg-[hsl(45_30%_10%)] shadow-xl shadow-[hsl(43_88%_50%_/_0.2)]">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title || "Gallery item"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[hsl(43_88%_50%_/_0.2)] to-transparent">
                    <span className="text-[hsl(43_88%_70%)] text-sm">Coming Soon</span>
                  </div>
                )}
                {item.title && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-xs font-medium truncate">{item.title}</p>
                    {item.subtitle && (
                      <p className="text-[hsl(43_88%_70%)] text-xs truncate">{item.subtitle}</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default DomeGallery;

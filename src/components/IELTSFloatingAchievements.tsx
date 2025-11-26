import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ielts801 from "@/assets/ielts-8-0-1.jpg";
import ielts751 from "@/assets/ielts-7-5-1.jpg";
import ielts802 from "@/assets/ielts-8-0-2.jpg";

interface FloatingImage {
  id: number;
  x: string;
  y: string;
  rotation: number;
  scale: number;
  zIndex: number;
  blur: number;
  imageUrl: string;
}

export function IELTSFloatingAchievements() {
  const [images, setImages] = useState<FloatingImage[]>([]);

  useEffect(() => {
    // Real IELTS achievement images - no duplication
    const achievementImages = [
      ielts801, ielts751, ielts802,
    ];

    // Generate evenly distributed positions for 3 unique images
    const generatedImages: FloatingImage[] = achievementImages.map((url, i) => {
      // Position images with good spacing across the viewport
      const positions = [
        { x: 25, y: 30 }, // Left-middle
        { x: 50, y: 45 }, // Center
        { x: 75, y: 35 }, // Right-middle
      ];
      
      const pos = positions[i];
      
      // Add random offset for natural scatter
      const offsetX = (Math.random() - 0.5) * 10; // ±5%
      const offsetY = (Math.random() - 0.5) * 10; // ±5%
      
      return {
        id: i,
        x: `${pos.x + offsetX}%`,
        y: `${pos.y + offsetY}%`,
        rotation: 0, // No rotation - keep it clean
        scale: 0.85 + Math.random() * 0.25, // 0.85 to 1.1
        zIndex: Math.floor(Math.random() * 3) + 1,
        blur: Math.random() * 0.3, // 0 to 0.3px blur - very subtle
        imageUrl: url,
      };
    });

    setImages(generatedImages);
  }, []);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      {images.map((image) => (
        <motion.div
          key={image.id}
          className="absolute"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: 1,
            scale: image.scale,
          }}
          transition={{
            duration: 0.8,
            delay: image.id * 0.1,
            ease: "easeOut",
          }}
          style={{
            left: image.x,
            top: image.y,
            transform: "translate(-50%, -50%)",
            zIndex: image.zIndex,
            filter: `blur(${image.blur}px)`,
          }}
        >
          <motion.div
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <div
              className="w-32 h-40 sm:w-36 sm:h-44 md:w-52 md:h-64 rounded-xl overflow-hidden border-2 border-gold/40 shadow-2xl bg-black/10"
              style={{
                boxShadow: `0 ${8 + image.zIndex * 3}px ${16 + image.zIndex * 6}px rgba(0, 0, 0, 0.4)`,
              }}
            >
              <img
                src={image.imageUrl}
                alt={`IELTS Achievement ${image.id + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </motion.div>
      ))}

      {/* Central title overlay - FIXED ABSOLUTE CENTERING */}
      <div className="fixed inset-0 w-screen h-screen pointer-events-none flex items-center justify-center z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center px-6"
        >
          <div className="bg-black/60 backdrop-blur-md rounded-2xl md:rounded-3xl px-6 py-6 md:px-12 md:py-8 border-2 border-gold/50 max-w-xs sm:max-w-md md:max-w-2xl">
            <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent mb-2 md:mb-3">
              Our Achievements
            </h2>
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white font-light">
              Excellence in IELTS
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

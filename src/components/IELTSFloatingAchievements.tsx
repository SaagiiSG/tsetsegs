import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ielts801 from "@/assets/ielts-8-0-1.jpg";
import ielts751 from "@/assets/ielts-7-5-1.jpg";
import ielts802 from "@/assets/ielts-8-0-2.jpg";
import ieltsAchievement1 from "@/assets/ielts-achievement-1.jpg";
import ieltsAchievement2 from "@/assets/ielts-achievement-2.jpg";
import ieltsAchievement3 from "@/assets/ielts-achievement-3.jpg";
import ieltsAchievement4 from "@/assets/ielts-achievement-4.jpg";
import ieltsAchievement5 from "@/assets/ielts-achievement-5.jpg";
import ieltsAchievement6 from "@/assets/ielts-achievement-6.jpg";
import ieltsAchievement7 from "@/assets/ielts-achievement-7.jpg";
import ieltsAchievement8 from "@/assets/ielts-achievement-8.jpg";

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
    // All unique IELTS achievement images - no duplication
    const achievementImages = [
      ielts801, ielts751, ielts802,
      ieltsAchievement1, ieltsAchievement2, ieltsAchievement3,
      ieltsAchievement4, ieltsAchievement5, ieltsAchievement6,
      ieltsAchievement7, ieltsAchievement8,
    ];

    // Generate scattered positions across viewport with good coverage
    const generatedImages: FloatingImage[] = achievementImages.map((url, i) => {
      // Divide screen into regions for even distribution
      const col = i % 4; // 4 columns
      const row = Math.floor(i / 4); // 3 rows for 11 images
      
      // Base position in grid + random offset within cell
      const baseX = 12.5 + (col * 25); // 12.5%, 37.5%, 62.5%, 87.5%
      const baseY = 15 + (row * 30); // Spacing rows vertically
      
      // Add random offset within the grid cell for natural scatter
      const offsetX = (Math.random() - 0.5) * 18; // ±9%
      const offsetY = (Math.random() - 0.5) * 15; // ±7.5%
      
      return {
        id: i,
        x: `${baseX + offsetX}%`,
        y: `${baseY + offsetY}%`,
        rotation: 0, // No rotation - keep it clean
        scale: 0.8 + Math.random() * 0.3, // 0.8 to 1.1
        zIndex: Math.floor(Math.random() * 4) + 1,
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

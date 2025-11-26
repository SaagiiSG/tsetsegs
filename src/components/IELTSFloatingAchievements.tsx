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
import ieltsAchievement9 from "@/assets/ielts-achievement-9.jpg";
import ieltsAchievement10 from "@/assets/ielts-achievement-10.jpg";
import ieltsAchievement11 from "@/assets/ielts-achievement-11.jpg";
import ieltsAchievement12 from "@/assets/ielts-achievement-12.jpg";
import ieltsAchievement13 from "@/assets/ielts-achievement-13.jpg";
import ieltsAchievement14 from "@/assets/ielts-achievement-14.jpg";
import ieltsAchievement15 from "@/assets/ielts-achievement-15.jpg";

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
    // All unique IELTS achievement images - 18 total photos
    const achievementImages = [
      ielts801, ielts751, ielts802,
      ieltsAchievement1, ieltsAchievement2, ieltsAchievement3,
      ieltsAchievement4, ieltsAchievement5, ieltsAchievement6,
      ieltsAchievement7, ieltsAchievement8, ieltsAchievement9,
      ieltsAchievement10, ieltsAchievement11, ieltsAchievement12,
      ieltsAchievement13, ieltsAchievement14, ieltsAchievement15,
    ];

    // Detect mobile viewport
    const isMobile = window.innerWidth < 768;

    // Generate scattered positions across viewport with good coverage
    const generatedImages: FloatingImage[] = achievementImages.map((url, i) => {
      let col, row, baseX, baseY, offsetX, offsetY;

      if (isMobile) {
        // Mobile: 3 columns, 6 rows for better separation
        col = i % 3;
        row = Math.floor(i / 3);
        
        // Better centered positioning on mobile
        baseX = 10 + (col * 30); // Shifted left and more centered
        baseY = 8 + (row * 15); // More vertical spacing
        
        // Smaller random offset for cleaner mobile layout
        offsetX = (Math.random() - 0.5) * 8; // ±4%
        offsetY = (Math.random() - 0.5) * 8; // ±4%
      } else {
        // Desktop: 6 columns, 3 rows (original layout)
        col = i % 6;
        row = Math.floor(i / 6);
        
        baseX = 8 + (col * 16);
        baseY = 12 + (row * 28);
        
        offsetX = (Math.random() - 0.5) * 12; // ±6%
        offsetY = (Math.random() - 0.5) * 12; // ±6%
      }
      
      return {
        id: i,
        x: `${baseX + offsetX}%`,
        y: `${baseY + offsetY}%`,
        rotation: 0,
        scale: 0.75 + Math.random() * 0.35,
        zIndex: Math.floor(Math.random() * 5) + 1,
        blur: Math.random() * 0.4,
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

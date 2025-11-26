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
    // Real IELTS achievement images
    const achievementImages = [
      ielts801,
      ielts751,
      ielts802,
      ielts801,
      ielts751,
      ielts802,
      ielts801,
      ielts751,
    ];

    // Generate scattered positions across the entire screen
    const generatedImages: FloatingImage[] = achievementImages.map((url, i) => ({
      id: i,
      x: `${15 + Math.random() * 70}%`, // 15% to 85% across width
      y: `${15 + Math.random() * 70}%`, // 15% to 85% across height
      rotation: 0, // No rotation - keep it clean
      scale: 0.8 + Math.random() * 0.3, // 0.8 to 1.1
      zIndex: Math.floor(Math.random() * 5) + 1,
      blur: Math.random() * 0.5, // 0 to 0.5px blur - very subtle
      imageUrl: url,
    }));

    setImages(generatedImages);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
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
              className="w-40 h-48 md:w-52 md:h-64 rounded-xl overflow-hidden border-2 border-gold/40 shadow-2xl bg-black/10"
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

      {/* Central title overlay - properly centered */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center px-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
      >
        <div className="bg-black/60 backdrop-blur-md rounded-3xl px-12 py-8 border-2 border-gold/50">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent mb-3">
            Our Achievements
          </h2>
          <p className="text-xl md:text-2xl lg:text-3xl text-white font-light">
            Excellence in IELTS
          </p>
        </div>
      </motion.div>
    </div>
  );
}

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
      x: `${10 + Math.random() * 80}%`, // 10% to 90% across width
      y: `${10 + Math.random() * 80}%`, // 10% to 90% across height
      rotation: Math.random() * 40 - 20, // -20deg to 20deg
      scale: 0.7 + Math.random() * 0.5, // 0.7 to 1.2
      zIndex: Math.floor(Math.random() * 5) + 1,
      blur: Math.random() * 3, // 0 to 3px blur for depth
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
          initial={{ opacity: 0, scale: 0, rotate: 0 }}
          animate={{
            opacity: 1,
            scale: image.scale,
            rotate: image.rotation,
          }}
          transition={{
            duration: 1.2,
            delay: image.id * 0.15,
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
              y: [0, -10, 0],
              rotate: [image.rotation, image.rotation + 2, image.rotation],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative"
          >
            <div
              className="w-32 h-40 md:w-48 md:h-60 rounded-lg overflow-hidden border-4 border-gold/50 shadow-2xl bg-black/20 backdrop-blur-sm"
              style={{
                boxShadow: `0 ${10 + image.zIndex * 5}px ${20 + image.zIndex * 10}px rgba(0, 0, 0, 0.5)`,
              }}
            >
              <img
                src={image.imageUrl}
                alt={`IELTS Achievement ${image.id + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Glow effect for depth */}
            <div
              className="absolute inset-0 rounded-lg bg-gradient-to-br from-gold/30 via-transparent to-transparent pointer-events-none"
              style={{ opacity: 1 - image.blur / 3 }}
            />
          </motion.div>
        </motion.div>
      ))}

      {/* Central title overlay */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
      >
        <h2 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent mb-4">
          Our Achievements
        </h2>
        <p className="text-2xl md:text-3xl text-white font-light">
          Excellence in IELTS
        </p>
      </motion.div>
    </div>
  );
}

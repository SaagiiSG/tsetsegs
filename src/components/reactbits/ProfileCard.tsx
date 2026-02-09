"use client";
import { motion } from "framer-motion";
import React from "react";

interface ProfileCardProps {
  name: string;
  role: string;
  image?: string;
  className?: string;
  delay?: number;
  icon?: React.ReactNode;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  role,
  image,
  className = "",
  delay = 0,
  icon,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -10 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ 
        duration: 0.6, 
        delay,
        type: "spring",
        stiffness: 100,
      }}
      viewport={{ once: true }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.2 },
      }}
      className={`group relative ${className}`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(45_30%_12%)] to-[hsl(45_30%_8%)] border border-[hsl(43_88%_50%_/_0.2)] p-1">
        {/* Glow effect on hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{
            background: "radial-gradient(circle at 50% 0%, hsl(43 88% 50% / 0.15), transparent 70%)",
          }}
        />
        
        {/* Icon/Image container */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[hsl(45_30%_15%)] flex items-center justify-center">
          {icon ? (
            <div className="w-20 h-20 rounded-full bg-[hsl(43_88%_50%_/_0.15)] flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              {icon}
            </div>
          ) : image ? (
            <img
              src={image}
              alt={name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[hsl(43_88%_50%_/_0.2)] flex items-center justify-center">
              <span className="text-3xl font-bold text-[hsl(43_88%_70%)]">
                {name.charAt(0)}
              </span>
            </div>
          )}
          
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(45_30%_6%)] via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Text content */}
        <div className="relative p-4 text-center">
          <motion.h3 
            className="text-lg font-bold text-[hsl(43_88%_85%)] mb-1"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: delay + 0.2 }}
          >
            {name}
          </motion.h3>
          <motion.p 
            className="text-sm text-[hsl(43_88%_60%)]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: delay + 0.3 }}
          >
            {role}
          </motion.p>
          
          {/* Bottom accent line */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-transparent via-[hsl(43_88%_50%)] to-transparent"
            initial={{ width: 0 }}
            whileInView={{ width: "60%" }}
            transition={{ delay: delay + 0.4, duration: 0.5 }}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileCard;

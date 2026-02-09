"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface ScrollStackProps {
  children: React.ReactNode[];
  className?: string;
  cardClassName?: string;
  offset?: number;
}

const ScrollStack: React.FC<ScrollStackProps> = ({
  children,
  className = "",
  cardClassName = "",
  offset = 40,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <div 
      ref={containerRef} 
      className={`relative ${className}`}
      style={{ height: `${100 + (children.length - 1) * 50}vh` }}
    >
      <div className="sticky top-20 h-[70vh] flex items-center justify-center">
        <div className="relative w-full max-w-4xl mx-auto">
          {children.map((child, index) => {
            const start = index / children.length;
            const end = (index + 1) / children.length;
            
            return (
              <ScrollStackCard
                key={index}
                index={index}
                total={children.length}
                scrollYProgress={scrollYProgress}
                start={start}
                end={end}
                offset={offset}
                className={cardClassName}
              >
                {child}
              </ScrollStackCard>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ScrollStackCardProps {
  children: React.ReactNode;
  index: number;
  total: number;
  scrollYProgress: any;
  start: number;
  end: number;
  offset: number;
  className?: string;
}

const ScrollStackCard: React.FC<ScrollStackCardProps> = ({
  children,
  index,
  total,
  scrollYProgress,
  start,
  end,
  offset,
  className,
}) => {
  const y = useTransform(
    scrollYProgress,
    [start, end],
    [100 + index * offset, index * offset]
  );
  
  const scale = useTransform(
    scrollYProgress,
    [start, end, end + 0.1],
    [0.9, 1, 1 - (total - index - 1) * 0.02]
  );

  const opacity = useTransform(
    scrollYProgress,
    [start - 0.1, start, end],
    [0.5, 1, 1]
  );

  return (
    <motion.div
      style={{
        y,
        scale,
        opacity,
        zIndex: index,
      }}
      className={`absolute inset-0 ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default ScrollStack;

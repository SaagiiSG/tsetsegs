"use client";
import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  threshold?: number;
  rootMargin?: string;
  animateBy?: "chars" | "words";
  direction?: "top" | "bottom";
  onAnimationComplete?: () => void;
}

const BlurText: React.FC<BlurTextProps> = ({
  text,
  className = "",
  delay = 50,
  duration = 0.8,
  ease = "power3.out",
  threshold = 0.1,
  rootMargin = "-50px",
  animateBy = "words",
  direction = "bottom",
  onAnimationComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<HTMLSpanElement[]>([]);
  const hasAnimated = useRef(false);

  const yOffset = direction === "top" ? -20 : 20;

  const splitContent = useCallback(() => {
    if (!text) return [];

    if (animateBy === "words") {
      return text.split(" ").map((word, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) elementsRef.current[i] = el;
          }}
          style={{
            display: "inline-block",
            opacity: 0,
            filter: "blur(10px)",
            marginRight: "0.3em",
          }}
        >
          {word}
        </span>
      ));
    }

    return text.split("").map((char, i) => (
      <span
        key={i}
        ref={(el) => {
          if (el) elementsRef.current[i] = el;
        }}
        style={{
          display: char === " " ? "inline" : "inline-block",
          opacity: 0,
          filter: "blur(10px)",
        }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }, [text, animateBy]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            gsap.fromTo(
              elementsRef.current,
              { opacity: 0, filter: "blur(10px)", y: yOffset },
              {
                opacity: 1,
                filter: "blur(0px)",
                y: 0,
                duration,
                ease,
                stagger: delay / 1000,
                onComplete: onAnimationComplete,
              }
            );
          }
        });
      },
      { threshold, rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [duration, ease, delay, threshold, rootMargin, yOffset, onAnimationComplete]);

  return (
    <div ref={containerRef} className={className}>
      {splitContent()}
    </div>
  );
};

export default BlurText;

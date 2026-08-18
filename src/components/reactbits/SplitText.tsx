"use client";
import { useRef, useEffect, useCallback } from "react";
import { gsap } from "gsap";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: "chars" | "words" | "lines" | "words,chars";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: "left" | "center" | "right";
  onAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 50,
  duration = 0.6,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onAnimationComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<HTMLSpanElement[]>([]);
  const hasAnimated = useRef(false);

  const splitContent = useCallback(() => {
    if (!text) return [];

    if (splitType === "chars") {
      return text.split("").map((char, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) elementsRef.current[i] = el;
          }}
          style={{ display: char === " " ? "inline" : "inline-block", opacity: 0 }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ));
    }

    if (splitType === "words") {
      return text.split(" ").map((word, i) => (
        <span
          key={i}
          ref={(el) => {
            if (el) elementsRef.current[i] = el;
          }}
          style={{ display: "inline-block", opacity: 0, marginRight: "0.3em" }}
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
        style={{ display: "inline-block", opacity: 0 }}
      >
        {char === " " ? "\u00A0" : char}
      </span>
    ));
  }, [text, splitType]);

  // Reset the animation whenever the text changes (e.g. language toggle),
  // so newly created spans don't stay stuck at opacity: 0.
  useEffect(() => {
    hasAnimated.current = false;
    elementsRef.current = elementsRef.current.slice(0, text.length);
  }, [text, splitType]);

  useEffect(() => {
    const runAnimation = () => {
      const els = elementsRef.current.filter(Boolean);
      if (!els.length) return;
      hasAnimated.current = true;
      gsap.fromTo(els, from, {
        ...to,
        duration,
        ease,
        stagger: delay / 1000,
        onComplete: onAnimationComplete,
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            runAnimation();
          }
        });
      },
      { threshold, rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
      // Already-visible case: no new intersection event will fire on text change.
      const rect = containerRef.current.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;
      if (inView && !hasAnimated.current) runAnimation();
    }

    return () => observer.disconnect();
  }, [text, splitType, from, to, duration, ease, delay, threshold, rootMargin, onAnimationComplete]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ textAlign, display: "block" }}
    >
      {splitContent()}
    </div>
  );
};

export default SplitText;

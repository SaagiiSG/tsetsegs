"use client";
import { useRef, useEffect, useState } from "react";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: "chars" | "words" | "lines" | "words,chars";
  from?: Record<string, unknown>;
  to?: Record<string, unknown>;
  threshold?: number;
  rootMargin?: string;
  textAlign?: "left" | "center" | "right";
  onAnimationComplete?: () => void;
}

/**
 * CSS-driven split text reveal. Every part animates with `forwards` fill, so the
 * final state is always fully visible — even when `text` changes (language
 * toggle) and React reuses the existing spans.
 */
const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 50,
  duration = 0.6,
  splitType = "chars",
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  onAnimationComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  // Restart the reveal whenever the text (or split mode) changes.
  useEffect(() => {
    setStarted(false);
  }, [text, splitType]);

  useEffect(() => {
    if (started) return;
    const el = containerRef.current;
    if (!el) return;

    const isInView = () => {
      const rect = el.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };

    if (isInView()) {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setStarted(true);
      },
      { threshold, rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started, text, threshold, rootMargin]);

  useEffect(() => {
    if (!started || !onAnimationComplete) return;
    const parts = splitType === "words" ? text.split(" ").length : text.length;
    const total = duration * 1000 + parts * delay + 50;
    const timer = setTimeout(onAnimationComplete, total);
    return () => clearTimeout(timer);
  }, [started, text, splitType, duration, delay, onAnimationComplete]);

  const parts = splitType === "words" ? text.split(" ") : text.split("");
  const isWords = splitType === "words";

  return (
    <div ref={containerRef} className={className} style={{ textAlign, display: "block" }}>
      {parts.map((part, i) => {
        const isSpace = !isWords && part === " ";
        return (
          <span
            key={`${text}-${i}`}
            style={{
              display: isSpace ? "inline" : "inline-block",
              marginRight: isWords ? "0.3em" : undefined,
              opacity: started ? undefined : 0,
              animation: started
                ? `split-text-in ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${i * (delay / 1000)}s both`
                : undefined,
            }}
          >
            {isSpace ? "\u00A0" : part}
          </span>
        );
      })}
    </div>
  );
};

export default SplitText;

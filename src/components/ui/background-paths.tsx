import { motion } from "framer-motion";

/**
 * Ambient flowing line background (adapted from BackgroundPaths).
 * Tinted with the current section glow via CSS var so it stays unified
 * with the page atmosphere instead of a hardcoded ink color.
 * Hidden entirely for reduced-motion / reduced-transparency users (see .admin-bg-lines).
 */
function FloatingPaths({ position, pathCount = 24 }: { position: number; pathCount?: number }) {
  const paths = Array.from({ length: pathCount }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg
        className="h-full w-full"
        viewBox="0 0 696 316"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        aria-hidden
      >
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.12 + path.id * 0.012}
            initial={{ pathLength: 0.3, opacity: 0.6 }}
            animate={{
              pathLength: 1,
              opacity: [0.3, 0.6, 0.3],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: 26 + (path.id % 7) * 3,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function AdminBackgroundPaths({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`admin-bg-lines ${className ?? ""}`}
      style={{ color: "hsl(var(--section-glow, var(--admin-atmosphere)))" }}
    >
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  );
}

"use client";

interface ShinyTextProps {
  children: React.ReactNode;
  className?: string;
  shimmerWidth?: number;
  speed?: number;
}

const ShinyText: React.FC<ShinyTextProps> = ({
  children,
  className = "",
  shimmerWidth = 100,
  speed = 3,
}) => {
  return (
    <>
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -${shimmerWidth}% 0; }
            100% { background-position: ${shimmerWidth}% 0; }
          }
        `}
      </style>
      <span
        className={className}
        style={{
          backgroundImage: `linear-gradient(
            120deg,
            rgba(255, 255, 255, 0) 40%,
            rgba(255, 255, 255, 0.8) 50%,
            rgba(255, 255, 255, 0) 60%
          )`,
          backgroundSize: `${shimmerWidth}% 100%`,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          animation: `shimmer ${speed}s linear infinite`,
        }}
      >
        {children}
      </span>
    </>
  );
};

export default ShinyText;

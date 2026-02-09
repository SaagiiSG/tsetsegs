"use client";
import { useEffect, useRef, useState } from "react";
import "./LaserFlow.css";

interface LaserFlowProps {
  children: React.ReactNode;
  className?: string;
  beamColor?: string;
  beamWidth?: number;
  speed?: number;
  glowIntensity?: number;
  fogOpacity?: number;
}

const LaserFlow: React.FC<LaserFlowProps> = ({
  children,
  className = "",
  beamColor = "#D4A853",
  beamWidth = 3,
  speed = 4,
  glowIntensity = 1.5,
  fogOpacity = 0.15,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const animationRef = useRef<number>();
  const progressRef = useRef(0);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const perimeter = 2 * (dimensions.width + dimensions.height);
    const beamLength = perimeter * 0.25;

    const getPointOnPerimeter = (progress: number) => {
      const p = progress * perimeter;
      
      // Top edge (left to right)
      if (p < dimensions.width) {
        return { x: p, y: 0 };
      }
      // Right edge (top to bottom)
      if (p < dimensions.width + dimensions.height) {
        return { x: dimensions.width, y: p - dimensions.width };
      }
      // Bottom edge (right to left)
      if (p < 2 * dimensions.width + dimensions.height) {
        return { x: dimensions.width - (p - dimensions.width - dimensions.height), y: dimensions.height };
      }
      // Left edge (bottom to top)
      return { x: 0, y: dimensions.height - (p - 2 * dimensions.width - dimensions.height) };
    };

    const animate = () => {
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw the laser beam trail
      const segments = 60;
      for (let i = 0; i < segments; i++) {
        const segmentProgress = (progressRef.current - (i / segments) * (beamLength / perimeter) + 1) % 1;
        const point = getPointOnPerimeter(segmentProgress);
        
        const opacity = 1 - (i / segments);
        const gradient = ctx.createRadialGradient(
          point.x, point.y, 0,
          point.x, point.y, beamWidth * glowIntensity * (1 - i / segments / 2)
        );
        
        gradient.addColorStop(0, `${beamColor}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${beamColor}${Math.floor(opacity * 128).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${beamColor}00`);

        ctx.beginPath();
        ctx.arc(point.x, point.y, beamWidth * glowIntensity * (1 - i / segments / 2), 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw the bright head of the beam
      const headPoint = getPointOnPerimeter(progressRef.current);
      const headGradient = ctx.createRadialGradient(
        headPoint.x, headPoint.y, 0,
        headPoint.x, headPoint.y, beamWidth * glowIntensity * 2
      );
      headGradient.addColorStop(0, "#FFFFFF");
      headGradient.addColorStop(0.3, beamColor);
      headGradient.addColorStop(1, `${beamColor}00`);

      ctx.beginPath();
      ctx.arc(headPoint.x, headPoint.y, beamWidth * glowIntensity * 2, 0, Math.PI * 2);
      ctx.fillStyle = headGradient;
      ctx.fill();

      progressRef.current = (progressRef.current + 0.002 * speed) % 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, beamColor, beamWidth, speed, glowIntensity]);

  return (
    <div ref={containerRef} className={`laser-flow-container ${className}`}>
      <canvas
        ref={canvasRef}
        className="laser-flow-canvas"
        style={{ width: dimensions.width, height: dimensions.height }}
      />
      
      {/* Fog/Glow overlay */}
      <div 
        className="laser-flow-fog"
        style={{
          background: `radial-gradient(ellipse 50% 30% at 50% 0%, ${beamColor}${Math.floor(fogOpacity * 255).toString(16).padStart(2, '0')}, transparent),
                       radial-gradient(ellipse 50% 30% at 50% 100%, ${beamColor}${Math.floor(fogOpacity * 255).toString(16).padStart(2, '0')}, transparent),
                       radial-gradient(ellipse 30% 50% at 0% 50%, ${beamColor}${Math.floor(fogOpacity * 255).toString(16).padStart(2, '0')}, transparent),
                       radial-gradient(ellipse 30% 50% at 100% 50%, ${beamColor}${Math.floor(fogOpacity * 255).toString(16).padStart(2, '0')}, transparent)`,
        }}
      />
      
      {/* Border overlay */}
      <div 
        className="laser-flow-border"
        style={{
          boxShadow: `inset 0 0 0 1px ${beamColor}33`,
        }}
      />
      
      <div className="laser-flow-content">
        {children}
      </div>
    </div>
  );
};

export default LaserFlow;

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import studySky from "@/assets/landing-sky-study.jpg";

type ShaderLibrary = typeof import("shaders/react");

/** Decorative and landing-only: never blocks the page if WebGPU is unavailable. */
export function LandingShaderBackground() {
  const root = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const [library, setLibrary] = useState<ShaderLibrary | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [visible, setVisible] = useState(!document.hidden);

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (reducedMotion || !("gpu" in navigator) || !root.current) return;
    let active = true;
    const styles = getComputedStyle(root.current);
    setColors(["sky", "blue", "lilac", "rose"].map(color =>
      styles.getPropertyValue(`--landing-shader-${color}`).trim(),
    ));
    import("shaders/react").then(module => {
      if (active) setLibrary(module);
    }).catch(() => {
      if (active) setUnavailable(true);
    });
    return () => { active = false; };
  }, [reducedMotion]);

  const Shader = library?.Shader;
  const FlowingGradient = library?.FlowingGradient;

  return (
    <div ref={root} className="landing-shader-background" aria-hidden="true">
      <img src={studySky} alt="" width={1920} height={1024} className="landing-shader-fallback" />
      {Shader && FlowingGradient && colors.length === 4 && !reducedMotion && !unavailable && visible && (
        <Shader
          className={`landing-shader-canvas ${ready ? "is-ready" : ""}`}
          disableTelemetry
          colorSpace="srgb"
          onReady={() => setReady(true)}
          onUnavailable={() => { setUnavailable(true); setReady(false); }}
        >
          <FlowingGradient
            colorA={colors[0]}
            colorB={colors[1]}
            colorC={colors[2]}
            colorD={colors[3]}
            speed={0.15}
            distortion={0.35}
            seed={8}
          />
        </Shader>
      )}
    </div>
  );
}
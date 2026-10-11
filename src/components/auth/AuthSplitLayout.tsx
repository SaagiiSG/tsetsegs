import { ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { AdminBackgroundPaths } from "@/components/ui/background-paths";
import { cn } from "@/lib/utils";

interface AuthSplitLayoutProps {
  children: ReactNode;
  /** Eyebrow label shown above the graphics-panel headline */
  eyebrow?: string;
  headline: string;
  subline?: string;
  /** Small feature bullets rendered on the graphics panel */
  features?: { icon?: ReactNode; label: string }[];
  className?: string;
}

/**
 * 50/50 auth layout matching the landing page: obsidian/silver monochrome.
 * Left — Linear-style graphics panel (collapses on mobile); right — dark form column.
 */
export function AuthSplitLayout({
  children,
  eyebrow = "FLOWERSOS",
  headline,
  subline,
  features,
  className,
}: AuthSplitLayoutProps) {
  return (
    <div className={cn("min-h-screen grid lg:grid-cols-2 bg-[#0B0C0F] text-white", className)}>
      {/* Left — Linear-style graphics panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#07080A] text-white border-r border-white/[0.06]">
        {/* atmosphere: grid + glow + flowing lines */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 90% 80% at 40% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 40% 40%, black 30%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(148,163,184,0.55), transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(244,114,182,0.35), transparent 65%)" }}
        />
        <div aria-hidden className="absolute inset-0 opacity-60 motion-reduce:hidden">
          <AdminBackgroundPaths className="absolute inset-0 text-white/25" />
        </div>
        {/* vignette */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse 120% 100% at 50% 0%, transparent 55%, rgba(0,0,0,0.55) 100%)" }}
        />

        {/* brand mark top */}
        <div className="relative z-10 px-12 pt-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 backdrop-blur-md">
            <BrandMark className="h-4 w-4 text-white" />
            <span className="text-[11px] font-medium tracking-[0.22em] text-white/80">{eyebrow}</span>
          </div>
        </div>

        {/* headline bottom */}
        <div className="relative z-10 px-12 pb-14 space-y-6">
          <h2 className="text-4xl xl:text-5xl font-semibold leading-[1.08] tracking-[-0.02em] whitespace-pre-line">
            {headline}
          </h2>
          {subline && <p className="text-white/60 text-base max-w-md">{subline}</p>}
          {features && features.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pt-2">
              {features.map((f) => (
                <span
                  key={f.label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-xs text-white/75 backdrop-blur-md"
                >
                  {f.icon}
                  {f.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right — form column (dark, landing-matched) */}
      <div className="relative flex flex-col min-h-screen lg:min-h-0 overflow-hidden">
        {/* subtle atmosphere so the two halves feel like one surface */}
        <div
          aria-hidden
          className="absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(148,163,184,0.4), transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 80% 70% at 60% 30%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 60% 30%, black 20%, transparent 70%)",
          }}
        />

        <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 pt-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <BrandMark className="h-7 w-7 text-white transition-transform duration-300 group-hover:scale-105" />
            <span className="font-semibold tracking-tight text-lg text-white">flowersos</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            ← Back to site
          </Link>
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="relative z-10 px-6 sm:px-10 pb-6 text-xs text-white/35">
          © {new Date().getFullYear()} flowersos — Tsetsegs Talent Agency
        </footer>
      </div>
    </div>
  );
}

/**
 * Shared dark field styling for auth forms, matching the landing page.
 * Inputs are minimal: bottom-border only, no boxed card.
 */
export const authInputClasses =
  "bg-transparent border-0 border-b border-white/15 rounded-none px-0 h-12 text-base text-white placeholder:text-white/25 focus-visible:ring-0 focus-visible:border-white/60 transition-colors";

export const authLabelClasses =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-white/40";

export const authPrimaryButtonClasses =
  "w-full h-12 rounded-full bg-white text-black font-semibold text-base hover:bg-white/85 transition-colors";

export const authGhostButtonClasses =
  "w-full h-11 rounded-full text-sm text-white/50 hover:text-white hover:bg-white/[0.05]";

export function AuthGlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("w-full", className)}>{children}</div>;
}

export default AuthSplitLayout;

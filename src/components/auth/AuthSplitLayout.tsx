import { ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { AdminBackgroundPaths } from "@/components/ui/background-paths";
import { cn } from "@/lib/utils";

interface AuthSplitLayoutProps {
  children: ReactNode;
  /** Eyebrow label shown above the right-panel headline */
  eyebrow?: string;
  headline: string;
  subline?: string;
  /** Small feature bullets rendered on the graphics panel */
  features?: { icon?: ReactNode; label: string }[];
  className?: string;
}

/**
 * 50/50 auth layout: form on the left, Linear-style dark graphics panel on the right.
 * The graphics panel collapses on mobile, leaving the form full-width.
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
    <div className={cn("min-h-screen grid lg:grid-cols-2 bg-background", className)}>
      {/* Left — form column */}
      <div className="relative flex flex-col min-h-screen lg:min-h-0">
        <header className="flex items-center justify-between px-6 sm:px-10 pt-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <BrandMark className="h-7 w-7 text-foreground transition-transform duration-300 group-hover:scale-105" />
            <span className="font-semibold tracking-tight text-lg">flowersos</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to site
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 sm:px-10 py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="px-6 sm:px-10 pb-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} flowersos — Tsetsegs Talent Agency
        </footer>
      </div>

      {/* Right — Linear-style graphics panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#07080A] text-white">
        {/* atmosphere: grid + glow + flowing lines */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 90% 80% at 60% 40%, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 60% 40%, black 30%, transparent 75%)",
          }}
        />
        <div
          aria-hidden
          className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(148,163,184,0.55), transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-48 -left-32 h-[480px] w-[480px] rounded-full opacity-20 blur-3xl"
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
    </div>
  );
}

export default AuthSplitLayout;

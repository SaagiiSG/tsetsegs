import { ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { usePublicLanguage } from "@/hooks/usePublicLanguage";
import { cn } from "@/lib/utils";
import clouds from "@/assets/landing/07-clouds-near.svg";
import "@/components/landing/landing.css";
interface AuthSplitLayoutProps { children: ReactNode; eyebrow?: string; headline: string; subline?: string; features?: { icon?: ReactNode; label: string }[]; accent?: string; className?: string; }
export function AuthSplitLayout({ children, className }: AuthSplitLayoutProps) {
  const { lang, setLang, text } = usePublicLanguage();
  return <div className={cn("landing-v2 auth-public min-h-screen relative isolate overflow-x-clip bg-background text-foreground", className)} lang={lang === 'mon' ? 'mn' : 'en'}>
    <div aria-hidden className="auth-sky absolute inset-x-0 top-0 -z-10 h-96"><img src={clouds} alt="" className="absolute bottom-0 w-full" /></div>
    <header className="lv-container flex min-h-20 items-center justify-between gap-3 py-4">
      <Link to="/" className="flex items-center gap-2"><BrandMark className="h-7 w-7"/><span className="font-chillax text-xl font-semibold">flowersos</span></Link>
      <div className="flex gap-1 rounded-full bg-muted p-1">{(['mon','eng'] as const).map(l => <Button key={l} variant="ghost" size="sm" aria-pressed={lang === l} onClick={() => setLang(l)} className={cn('rounded-full px-3', lang === l && 'bg-card shadow-sm')}>{l === 'mon' ? 'МОН' : 'ENG'}</Button>)}</div>
    </header>
    <main className="relative mx-auto w-full max-w-lg px-6 py-12 sm:py-16">{children}<div className="mt-8 text-center"><Link to="/" className="text-sm text-muted-foreground hover:text-foreground">{text('← Нүүр хуудас', '← Back to site')}</Link></div></main>
    <footer className="px-6 py-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} flowersos — Tsetsegs SAT Prep</footer>
  </div>;
}
export const authInputClasses = "bg-card border border-input rounded-xl px-3 h-12 text-base text-foreground placeholder:text-muted-foreground focus-visible:ring-ring";
export const authLabelClasses = "text-sm font-medium text-foreground";
export const authPrimaryButtonClasses = "w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90";
export const authGhostButtonClasses = "w-full h-11 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-muted";
export function AuthGlassCard({ children, className }: { children: ReactNode; className?: string }) { return <div className={cn("w-full", className)}>{children}</div>; }
export default AuthSplitLayout;

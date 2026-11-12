import { useEffect } from "react";
import { BrandMark } from "@/components/BrandMark";
import "@/components/landing/landing.css";

// Shell for /privacy and /terms. English only for now; plain <a>s so /solo can link here without a router.
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  useEffect(() => { document.title = `${title} · flowersos`; }, [title]);
  return (
    <div className="landing-v2 min-h-screen bg-background text-foreground">
      <header className="border-b border-border"><div className="lv-container flex min-h-20 items-center justify-between gap-4">
        <a href="/" className="flex items-center gap-2 font-chillax text-xl font-semibold"><BrandMark className="h-7 w-7" />flowersos</a>
        <nav className="flex gap-5 text-sm text-muted-foreground"><a href="/privacy" className="hover:text-foreground">Privacy</a><a href="/terms" className="hover:text-foreground">Terms</a></nav>
      </div></header>
      <main className="lv-container">
        <article className="max-w-2xl py-12 text-[15px] sm:py-16 leading-relaxed text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_p]:mt-3 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
          <h1 className="lv-h2 text-foreground">{title}</h1>
          <p className="!mt-4 text-sm">Last updated {updated}</p>
          {children}
        </article>
      </main>
    </div>
  );
}

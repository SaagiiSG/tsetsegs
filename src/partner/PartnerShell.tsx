import type { ReactNode } from 'react';
import BrandMark from '@/components/BrandMark';
import clouds from '@/assets/landing/07-clouds-near.svg';
import '@/components/landing/landing.css';

// The single-column cloud sky of the solo pages; wide is for the dashboard on a laptop.
export default function PartnerShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="landing-v2 auth-public min-h-screen relative isolate overflow-x-clip bg-background text-foreground">
      <div aria-hidden className="auth-sky absolute inset-x-0 top-0 -z-10 h-96"><img src={clouds} alt="" className="absolute bottom-0 w-full" /></div>
      <header className="lv-container flex min-h-20 items-center py-4">
        <a href="/" className="flex items-center gap-2"><BrandMark className="h-7 w-7" /><span className="font-chillax text-xl font-semibold">flowersos</span></a>
      </header>
      <main className={`relative mx-auto w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} space-y-8 px-6 py-12 sm:py-16`}>
        {children}
        <div className="text-center"><a href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to site</a></div>
      </main>
    </div>
  );
}

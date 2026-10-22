import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { Clouds } from "@/components/landing/Clouds";
import { EducatorRequestForm } from "@/components/educators/EducatorRequestForm";
import { usePublicLanguage } from "@/hooks/usePublicLanguage";
import { useEducatorStats } from "@/hooks/useEducatorStats";
import { explanationsLine, problemsSolvedLabel, sourceFromSearch } from "@/lib/educatorLanding";
import "@/components/landing/landing.css";

export default function Educators() {
  const reduce = useReducedMotion();
  const { lang, setLang, text } = usePublicLanguage("eng");
  const stats = useEducatorStats();
  const reveal = reduce ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: .4 } };
  const solved = problemsSolvedLabel(stats.answers);
  const explanations = explanationsLine(stats.explanations, lang);

  const results = [
    { v: "2", l: text("төгс 800", "perfect 800s"), c: "lv-green" },
    { v: "8", l: text("750+ авсан", "scored 750+"), c: "lv-blue" },
    { v: "14", l: text("700+ авсан", "scored 700+"), c: "lv-violet" },
    ...(solved ? [{ v: solved, l: text("бодлого платформ дээр бодогдсон, 2025 оны 12-р сараас хойш", "problems solved on the platform since December 2025"), c: "lv-orange" }] : []),
  ];

  return (
    <div className="landing-v2 min-h-screen" lang={lang === "mon" ? "mn" : "en"}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="lv-container flex h-16 items-center justify-between gap-3">
          <a href="/" className="flex items-center gap-2"><BrandMark className="h-7 w-7" /><span className="font-chillax text-xl font-semibold">flowersos</span></a>
          <nav className="hidden gap-7 text-sm text-muted-foreground md:flex"><a href="#results">{text("Үр дүн", "Results")}</a><a href="#desmos">Desmos</a><a href="#center">{text("Таны төв", "Your center")}</a><a href="#faq">FAQ</a></nav>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-muted p-1">{(["mon", "eng"] as const).map(l => <Button variant="ghost" size="sm" key={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={`h-10 min-w-11 rounded-full px-3 text-xs font-medium ${lang === l ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{l === "mon" ? "МОН" : "ENG"}</Button>)}</div>
            <a href="#signin" className="hidden px-2 text-sm text-muted-foreground hover:text-foreground sm:inline">{text("Нэвтрэх", "Sign in")}</a>
            <Button asChild className="h-11 rounded-full px-4"><a href="#book">{text("Уулзалт товлох", "Book a call")}</a></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="lv-sky relative overflow-hidden pb-28 pt-16 md:pt-24">
          <Clouds />
          <motion.div {...reveal} className="lv-container relative"><div className="max-w-4xl">
            <span className="lv-blue rounded-full px-3 py-1 text-sm font-medium">{text("SAT төв, сургуулиудад", "For SAT centers and schools")}</span>
            <h1 className="lv-h1 mt-6">{text("Хоёр төгс 800-ын ард байгаа платформ дээр SAT төвөө ажиллуул.", "Run your SAT center on the platform behind two perfect 800s.")}</h1>
            <p className="lv-lead mt-6 max-w-2xl">{text(
              `Цэцэгс SAT төвийн багш нар бүтээсэн. Тэнд SAT бүрт 80+ сурагч шалгалт өгдөг. ${explanations}, мөн адил багш нарын видео хичээл, сурагчдыг тасралтгүй дасгал хийлгэх тоглоомын систем.`,
              `Built by the teachers at Tsetsegs, an SAT center where 80+ students sit every SAT. ${explanations}, video lessons from the same teachers, and a student side built to keep them practicing.`,
            )}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-7"><a href="#book">{text("Уулзалт товлох", "Book a call")}<ArrowRight /></a></Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-2 px-7"><a href="#platform">{text("Платформыг үзэх", "See the platform")}</a></Button>
            </div>
          </div></motion.div>
        </section>

        <section id="results" className="scroll-mt-20 py-10"><div className="lv-container">
          <p className="text-sm font-medium text-muted-foreground">{text("2026 оны 8-р сарын SAT, математик", "August 2026 SAT, math section")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">{results.map((r, i) => (
            <motion.div key={i} {...reveal} transition={{ duration: .4, delay: i * .06 }} className="lv-card p-5"><p className={`inline-block rounded-full px-3 py-1 font-mono text-2xl font-semibold md:text-3xl ${r.c}`}>{r.v}</p><p className="mt-3 text-sm text-muted-foreground">{r.l}</p></motion.div>
          ))}</div>
          <p className="mt-4 text-xs text-muted-foreground">{text("2026 оны 8-р сарын SAT-ын дараа манай багш нарын бүртгэсэн оноо.", "Scores our teachers recorded after the August 2026 SAT.")}</p>
        </div></section>

        <section id="book" className="lv-sky relative scroll-mt-20 overflow-hidden pb-40 pt-20">
          <Clouds />
          {/* lv-container's own max-width wins over Tailwind's, so the narrow column is an inner div. */}
          <motion.div {...reveal} className="lv-container relative"><div className="mx-auto max-w-xl">
            <h2 className="lv-h2">{text("Уулзалт товлох", "Book a call")}</h2>
            <p className="lv-lead mt-4">{text("Төвийнхөө талаар бидэнд хэлээрэй. Бид тантай холбогдож цаг тохирно.", "Tell us about your center and we’ll get in touch to set up a time.")}</p>
            <div className="lv-card mt-8 p-5 sm:p-6"><EducatorRequestForm text={text} source={sourceFromSearch(window.location.search)} /></div>
          </div></motion.div>
        </section>
      </main>

      <footer id="signin" className="scroll-mt-20 border-t border-border py-10"><div className="lv-container flex flex-col justify-between gap-6 text-sm text-muted-foreground sm:flex-row">
        <div><a href="/" className="flex items-center gap-2 font-chillax text-xl font-semibold text-foreground"><BrandMark className="h-7 w-7" />flowersos</a><p className="mt-2">Tsetsegs SAT Prep</p></div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">{text("Аль хэдийн хэрэглэгч үү?", "Already a customer?")}</p>
          <div className="flex gap-6"><a href={`/login?role=admin&lang=${lang}`} className="py-2">{text("Админ нэвтрэх", "Admin sign in")}</a><a href={`/login?role=teacher&lang=${lang}`} className="py-2">{text("Багш нэвтрэх", "Teacher sign in")}</a></div>
          <p className="text-xs">{text("Төвийн бүртгэлтэй хэрэглэгчид өөрийн төвийн хаягаар нэвтэрнэ.", "Existing centers sign in at their own center’s address.")}</p>
        </div>
      </div></footer>
    </div>
  );
}

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BarChart3, BookOpen, CalendarCheck, GraduationCap, LayoutDashboard, MonitorPlay, PlayCircle, Radio, RotateCcw, Target, Trophy, Users, Zap } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { Clouds } from "@/components/landing/Clouds";
import { TIER_ASSETS } from "@/components/student/leaderboard/tierAssets";
import { EducatorRequestForm } from "@/components/educators/EducatorRequestForm";
import { usePublicLanguage } from "@/hooks/usePublicLanguage";
import { useEducatorStats } from "@/hooks/useEducatorStats";
import { explanationsLine, mathExplanationsLabel, problemsSolvedLabel, sourceFromSearch, videoCountLabel } from "@/lib/educatorLanding";
import "@/components/landing/landing.css";

export default function Educators() {
  const reduce = useReducedMotion();
  const { lang, setLang, text } = usePublicLanguage("eng");
  const stats = useEducatorStats();
  const reveal = reduce ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: .4 } };
  const solved = problemsSolvedLabel(stats.answers);
  const explanations = explanationsLine(stats.explanations, lang);
  const videos = videoCountLabel(stats.videos, lang);

  const mathExplanations = mathExplanationsLabel(stats.mathExplanations, lang);

  // Hard-coded 30-day numbers carry their date so they stay true; the all-time count is live.
  // student_attempts counts every answer, wrong ones and retries included, so the wording is "questions answered".
  const practice = [
    { v: "271,000", l: text("асуултад хариулсан", "questions answered"), c: "lv-orange" },
    { v: "510", l: text("сурагч дасгал хийсэн", "students practiced"), c: "lv-pink" },
    ...(solved ? [{ v: solved, l: text("2025 оны 12-р сараас хойш хариулсан асуулт", "questions answered since December 2025"), c: "lv-blue", wide: true }] : []),
  ];
  const scores = [
    { v: "2", l: text("төгс 800", "perfect 800s"), c: "lv-green" },
    { v: "8", l: text("750+ авсан", "scored 750+"), c: "lv-blue" },
    { v: "14", l: text("700+ авсан", "scored 700+"), c: "lv-violet" },
  ];
  const statCard = (r: { v: string; l: string; c: string; wide?: boolean }, i: number) => (
    <motion.div key={i} {...reveal} transition={{ duration: .4, delay: i * .06 }} className={`lv-card p-4 sm:p-5 ${r.wide ? "col-span-2 md:col-span-1" : ""}`}><p className={`inline-block rounded-full px-3 py-1 font-mono text-xl font-semibold sm:text-2xl md:text-3xl ${r.c}`}>{r.v}</p><p className="mt-3 text-sm text-muted-foreground">{r.l}</p></motion.div>
  );

  // Each item exists in src/portal today; homework and parent links don't, so they're left out.
  const included = [
    { icon: Users, l: text("Анги, багш, ирц", "Classes, teachers and attendance") },
    { icon: BookOpen, l: text("Алхам алхмаар тайлбартай асуултын сан", "Question bank with step-by-step explanations") },
    { icon: MonitorPlay, l: text("Бүтэн SAT симуляци", "Full SAT simulation") },
    { icon: Target, l: text("Оноо таамаглал", "Score prediction") },
    { icon: Zap, l: text("Хурдны тойрог", "Speed rounds") },
    { icon: Trophy, l: text("Чансаа, streak, тэмдэг", "Rankings, streaks and badges") },
    { icon: CalendarCheck, l: text("Өдрийн зорилго", "Daily goals") },
    { icon: Radio, l: text("Ангид шууд тест", "Live class quizzes") },
    { icon: PlayCircle, l: text("Видео хичээлийн замын зураг", "Video lesson roadmap") },
    { icon: RotateCcw, l: text("Алдааны давталт", "Mistake review") },
    { icon: BarChart3, l: text("Сурагчийн ахицын анализ", "Student progress analytics") },
  ];

  const steps = [
    { t: text("Уулзалт товлох", "Book a call"), d: text("Төвийнхөө талаар хэлээрэй. Бид платформыг танилцуулж, үнийн талаар ярилцана.", "Tell us about your center. We’ll walk you through the platform and talk about price.") },
    { t: text("Бид таны төвийг тохируулна", "We set up your center"), d: text("Таны орчин, лого, өнгө, анги, сурагчид.", "Your workspace, logo and colors, classes and students.") },
    { t: text("Сурагчид дасгал хийж эхэлнэ", "Your students start practicing"), d: text("Тэд таны төвийн өөрийн хаягаар нэвтэрнэ.", "They sign in at your center’s own address.") },
  ];

  const demos = [
    { role: "admin", icon: LayoutDashboard, l: text("Админ", "Admin"), sub: text("Анги, баг, сурагчид", "Classes, team & students") },
    { role: "teacher", icon: Users, l: text("Багш", "Teacher"), sub: text("Ирц, ангийн ахиц", "Attendance & class progress") },
    { role: "student", icon: GraduationCap, l: text("Сурагч", "Student"), sub: text("Дасгал, SAT таамаглал, лиг", "Practice, SAT prediction & ranks") },
  ] as const;

  const faq = [
    { q: text("Үнэ хэд вэ?", "How much does it cost?"), a: text("Төвийн хэмжээнээс хамаарна. Үнийн талаар уулзалтаар ярилцана.", "It depends on the size of your center. We go through pricing on the call.") },
    { q: text("ACT-д бэлддэг үү?", "Does it cover the ACT?"), a: text("Үгүй. Платформ зөвхөн дижитал SAT-д зориулагдсан.", "No. The platform is built for the digital SAT.") },
    { q: text("Ямар хэл дээр вэ?", "What language is it in?"), a: text("Англи. Асуулт, тайлбар, видео хичээл бүгд англи хэл дээр.", "English. Questions, explanations and video lessons are all in English.") },
  ];

  return (
    <div className="landing-v2 min-h-screen" lang={lang === "mon" ? "mn" : "en"}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="lv-container flex h-16 items-center justify-between gap-3">
          <a href="/" aria-label="flowersos" className="flex h-11 items-center gap-2"><BrandMark className="h-7 w-7" /><span className="hidden font-chillax text-xl font-semibold sm:inline">flowersos</span></a>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">{[["#results", text("Үр дүн", "Results")], ["#practice", text("Дасгал", "Practice")], ["#desmos", "Desmos"], ["#center", text("Таны төв", "Your center")], ["#faq", "FAQ"]].map(([h, l]) => <a key={h} href={h} className="inline-flex h-11 items-center hover:text-foreground">{l}</a>)}</nav>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-muted p-1">{(["mon", "eng"] as const).map(l => <Button variant="ghost" size="sm" key={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={`h-11 min-w-11 rounded-full px-3 text-xs font-medium ${lang === l ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{l === "mon" ? "МОН" : "ENG"}</Button>)}</div>
            <a href="#signin" className="hidden h-11 items-center px-2 text-sm text-muted-foreground hover:text-foreground sm:inline-flex">{text("Нэвтрэх", "Sign in")}</a>
            <Button asChild className="h-11 rounded-full px-4"><a href="#book">{text("Уулзалт товлох", "Book a call")}</a></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="lv-sky relative overflow-hidden pb-28 pt-16 md:pt-24">
          <Clouds />
          <motion.div {...reveal} className="lv-container relative"><div className="max-w-4xl">
            <span className="lv-blue rounded-full px-3 py-1 text-sm font-medium">{text("SAT төв, сургуулиудад", "For SAT centers and schools")}</span>
            <h1 className="lv-h1 mt-6">{text("Сурагчид тань салж чадахгүй SAT дасгал.", "SAT practice your students won’t put down.")}</h1>
            <p className="lv-lead mt-6 max-w-2xl">{text(
              "Streak, чансаа, өдрийн зорилго SAT дасгалыг зуршил болгодог. Цэцэгс төвийн багш нар бүтээсэн бөгөөд тэнд хамгийн их дасгал хийсэн сурагчид хамгийн өндөр оноо авсан, үүнд 2026 оны 8-р сарын SAT-ын хоёр төгс 800 багтана.",
              "Streaks, ranks and daily goals turn SAT practice into a habit. Built by the teachers at Tsetsegs, where the students who practiced most scored highest, including two perfect 800s on the August 2026 SAT.",
            )}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-full px-7"><a href="#book">{text("Уулзалт товлох", "Book a call")}<ArrowRight /></a></Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-2 px-7"><a href="#platform">{text("Платформыг үзэх", "See the platform")}</a></Button>
            </div>
          </div></motion.div>
        </section>

        <section id="results" className="scroll-mt-20 py-10"><div className="lv-container">
          <p className="text-sm font-medium text-muted-foreground">{text("Цэцэгс дэх дасгал, 2026 оны 10-р сарын 21 хүртэлх 30 хоногт", "Practice at Tsetsegs in the 30 days to October 21, 2026")}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{practice.map(statCard)}</div>
          <p className="mt-8 text-sm font-medium text-muted-foreground">{text("2026 оны 8-р сарын SAT, математик", "August 2026 SAT, math section")}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">{scores.map(statCard)}</div>
          <p className="mt-4 text-xs text-muted-foreground">{text("2026 оны 8-р сарын SAT-ын дараа манай багш нарын бүртгэсэн оноо.", "Scores our teachers recorded after the August 2026 SAT.")}</p>
        </div></section>

        <section id="practice" className="lv-sky scroll-mt-20 py-20"><div className="lv-container grid items-center gap-10 lg:grid-cols-2">
          <motion.div {...reveal}>
            <h2 className="lv-h2">{text("Их дасгал хийсэн сурагч өндөр оноо авдаг", "Students who practice more score higher")}</h2>
            <p className="lv-lead mt-4">{text("8-р сарын SAT-д 700+ авсан бүртгэгдсэн сурагч бүр платформ дээр дор хаяж 500 асуултад хариулсан бөгөөд ихэнх нь 1,500-аас илүүд хариулсан. Streak, чансаа, өдрийн зорилго, хурдны тойрог тэднийг эргэн ирүүлдэг.", "Every student we recorded at 700+ on the August SAT had answered at least 500 questions on the platform, and most had answered more than 1,500. Streaks, ranks, daily goals and speed rounds keep them coming back.")}</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="lv-card p-5"><p className="lv-orange inline-block rounded-full px-3 py-1 font-mono text-2xl font-semibold">271</p><p className="mt-3 text-sm text-muted-foreground">{text("сурагч 7 хоногийн streak барьсан", "students kept a 7‑day streak")}</p></div>
              <div className="lv-card p-5"><p className="lv-pink inline-block rounded-full px-3 py-1 font-mono text-2xl font-semibold">25</p><p className="mt-3 text-sm text-muted-foreground">{text("нь 30+ хоног тасралтгүй барьсан", "kept one going for 30+ days")}</p></div>
            </div>
          </motion.div>
          <motion.div {...reveal} className="lv-card flex flex-wrap items-end justify-center gap-3 p-6">{(["bronze", "silver", "gold", "platinum", "diamond", "ruby"] as const).map((t, i) => (
            <motion.img key={t} src={TIER_ASSETS[t].image} alt={t} className="h-14 w-14 object-contain md:h-20 md:w-20" animate={reduce ? {} : { y: [0, -6, 0] }} transition={{ duration: 4 + i * .4, repeat: Infinity, ease: "easeInOut", delay: i * .3 }} />
          ))}</motion.div>
        </div></section>

        <section id="desmos" className="scroll-mt-20 py-20"><motion.div {...reveal} className="lv-container"><div className="max-w-3xl">
          <h2 className="lv-h2">{text("Desmos-оор SAT математикийг секундэд", "SAT math in seconds, with Desmos")}</h2>
          <p className="lv-lead mt-4">{text("Desmos дижитал SAT-д суулгагдсан. Манай багш нар SAT математикийг түүгээр секундэд бодож, сурагчдадаа ч мөн адил заадаг. Тэдний бичсэн математикийн тайлбар Desmos-ын товчлолыг боломжтой бүх газарт харуулдаг.", "Desmos is built into the digital SAT. Our teachers use it to solve SAT math in seconds and teach their students to do the same. Their math explanations show the Desmos shortcut wherever there is one.")}</p>
          {(mathExplanations || videos) && <div className="mt-6 flex flex-wrap gap-2">
            {mathExplanations && <span className="lv-violet rounded-full px-4 py-2 text-sm font-medium">{mathExplanations}</span>}
            {videos && <span className="lv-blue rounded-full px-4 py-2 text-sm font-medium">{videos}</span>}
          </div>}
        </div></motion.div></section>

        <section id="center" className="scroll-mt-20 py-20"><div className="lv-container">
          <motion.h2 {...reveal} className="lv-h2 max-w-2xl">{text("Төвөө бүхэлд нь нэг дороос удирд", "Run your whole center in one place")}</motion.h2>
          <p className="lv-lead mt-4 max-w-2xl">{text("Таны лого, өнгөтэй өөрийн орчин.", "Your own workspace, with your logo and colors.")}</p>
          <p className="mt-6"><span className="lv-violet inline-block rounded-full px-4 py-2 text-sm font-medium">{explanations}</span></p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{included.map((m, i) => (
            <motion.div key={i} {...reveal} transition={{ duration: .4, delay: i * .03 }} className="lv-card flex items-center gap-3 p-4"><m.icon className="h-5 w-5 shrink-0 text-accent" /><span className="text-sm font-medium">{m.l}</span></motion.div>
          ))}</div>
        </div></section>

        <section id="story" className="scroll-mt-20 py-10"><motion.div {...reveal} className="lv-container"><div className="lv-card max-w-3xl p-6 md:p-10">
          <h2 className="lv-h2">{text("Жинхэнэ SAT төв дотор бүтээгдсэн", "Built inside a real SAT center")}</h2>
          <p className="lv-lead mt-4">{text("Цэцэгс бол SAT бүрт 80+ сурагч шалгалт өгдөг SAT төв. Бид энэ платформыг өөрсдийн ангиудад зориулж бүтээсэн бөгөөд 2025 оны 12-р сараас хойш төвөө түүн дээр ажиллуулж байна. Математикийн тайлбаруудыг бичиж, хичээлүүдийг бичлэг хийсэн багш нар өдөр бүр Desmos ашиглан SAT математик заадаг.", "Tsetsegs is an SAT center where 80+ students sit every SAT. We built this platform for our own classes and have run the center on it since December 2025. The teachers who wrote the math explanations and recorded the lessons teach SAT math with Desmos every day.")}</p>
        </div></motion.div></section>

        <section id="how" className="scroll-mt-20 py-20"><div className="lv-container">
          <motion.h2 {...reveal} className="lv-h2">{text("Хэрхэн ажилладаг вэ", "How it works")}</motion.h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{steps.map((x, i) => (
            <motion.div key={i} {...reveal} transition={{ duration: .4, delay: i * .06 }} className="lv-card overflow-hidden"><div className="lv-sky h-16" /><div className="p-5"><p className="font-mono text-xs text-muted-foreground">0{i + 1}</p><h3 className="mt-1 font-chillax text-2xl font-medium">{x.t}</h3><p className="mt-2 text-muted-foreground">{x.d}</p></div></motion.div>
          ))}</div>
        </div></section>

        <section id="platform" className="scroll-mt-20 py-10"><div className="lv-container">
          <motion.h2 {...reveal} className="lv-h2">{text("Эхлээд өөрөө үзээрэй", "Look around first")}</motion.h2>
          <p className="lv-lead mt-4">{text("Зохиомол сурагчидтай жишээ орчин.", "Sample workspaces with made-up students.")}</p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">{demos.map(r => (
            <a key={r.role} href={`/demo?role=${r.role}&preview=educator&lang=${lang}`} className="lv-card flex min-h-16 items-center gap-3 p-4 hover:bg-muted"><r.icon className="h-5 w-5 text-muted-foreground" /><div className="flex-1"><p className="font-medium">{r.l}</p><p className="text-xs text-muted-foreground">{r.sub}</p></div>{r.role === "student" && <img src={TIER_ASSETS.diamond.image} alt="" className="h-9 w-9 object-contain" />}<ArrowRight className="h-4 w-4" /></a>
          ))}</div>
        </div></section>

        <section id="faq" className="scroll-mt-20 py-20"><div className="lv-container"><div className="mx-auto max-w-3xl">
          <h2 className="lv-h2 text-center">FAQ</h2>
          <Accordion type="single" collapsible className="mt-8">{faq.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}><AccordionTrigger className="text-left text-lg">{f.q}</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">{f.a}</AccordionContent></AccordionItem>
          ))}</Accordion>
        </div></div></section>

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
        <div><a href="/" className="flex h-11 items-center gap-2 font-chillax text-xl font-semibold text-foreground"><BrandMark className="h-7 w-7" />flowersos</a><p className="mt-2">Tsetsegs SAT Prep</p></div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">{text("Аль хэдийн хэрэглэгч үү?", "Already a customer?")}</p>
          <div className="flex gap-6"><a href={`/login?role=admin&lang=${lang}`} className="inline-flex h-11 items-center">{text("Админ нэвтрэх", "Admin sign in")}</a><a href={`/login?role=teacher&lang=${lang}`} className="inline-flex h-11 items-center">{text("Багш нэвтрэх", "Teacher sign in")}</a></div>
          <p className="text-xs">{text("Төвийн бүртгэлтэй хэрэглэгчид өөрийн төвийн хаягаар нэвтэрнэ.", "Existing centers sign in at their own center’s address.")}</p>
        </div>
      </div></footer>
    </div>
  );
}

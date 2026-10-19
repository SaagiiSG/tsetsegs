import { usePublicLanguage } from "@/hooks/usePublicLanguage";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BookOpen, Calculator, Zap, RotateCcw, BarChart3, Trophy, Flame, PlayCircle, PenLine, Radio, Users, CalendarCheck, MonitorPlay, Target, Map, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import { HeroDemo } from "@/components/landing/HeroDemo";
import { TIER_ASSETS } from "@/components/student/leaderboard/tierAssets";
import "@/components/landing/landing.css";
import cloudsFar from "@/assets/landing/05-clouds-far.svg";
import cloudsMid from "@/assets/landing/06-clouds-mid.svg";
import cloudsNear from "@/assets/landing/07-clouds-near.svg";

type Stats = { students: number; avg_gain: number; best_gain: number; gained100_pct: number; club700: number; club800: number; answers: number; bluebook: number };
const FB = "https://www.facebook.com/tsetsegs.agency";
const fmt = (n?: number) => (n ?? 0).toLocaleString("en-US");

const Clouds = () => (
  <div className="lv-clouds" aria-hidden>
    <img src={cloudsFar} alt="" className="bottom-10 opacity-70" />
    <img src={cloudsMid} alt="" className="bottom-0 opacity-90" />
    <img src={cloudsNear} alt="" className="-bottom-6" />
  </div>
);

const Index = () => {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { lang, setLang, text } = usePublicLanguage();
  const reveal = reduce ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: .4 } };

  const { data: s } = useQuery({
    queryKey: ["landing-public-stats"], staleTime: 10 * 60_000,
    queryFn: async () => { const { data, error } = await supabase.rpc("landing_public_stats" as never); if (error) throw error; return data as unknown as Stats; },
  });

  const CTA = ({ center }: { center?: boolean }) => (
    <div className={`flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>
      <Button size="lg" onClick={() => window.location.assign(`/demo?signup=practice&lang=${lang}`)} className="h-12 rounded-full px-7">{text("Үнэгүй эхлэх", "Start free")}<ArrowRight /></Button>
      <Button size="lg" variant="outline" onClick={() => navigate(`/educators?lang=${lang}`)} className="h-12 rounded-full border-2 px-7">{text("Би багш", "I am an educator")}</Button>
      <Button size="lg" variant="ghost" onClick={() => navigate("/practice")} className="h-12 rounded-full px-7">{text("Нэвтрэх", "Sign in")}</Button>
    </div>
  );

  const proof = [
    { v: s ? fmt(s.students) : "—", l: text("бодит тест өгсөн сурагч", "students with real practice tests"), c: "lv-blue" },
    { v: s ? `+${s.best_gain}` : "—", l: text("дундаж хамгийн өндөр өсөлт (Math)", "average best Math gain"), c: "lv-green" },
    { v: s ? `${s.gained100_pct}%` : "—", l: text("нь 100+ оноо ахисан", "gained 100+ points"), c: "lv-violet" },
    { v: s ? fmt(s.club700) : "—", l: text("сурагч 700+ Math авсан", "students reached 700+ Math"), c: "lv-orange" },
  ];

  const features = [
    { icon: BookOpen, c: "lv-blue", pain: text("Гацаад үлдэхээ боль", "Never stay stuck"), body: text("Мянга мянган SAT бодлого, алхам алхмаар тайлбар, видео.", "Thousands of SAT questions with step-by-step explanations and videos."), demo: "question" },
    { icon: Calculator, c: "lv-violet", pain: text("Desmos-ыг шалгалт шиг ашигла", "Use Desmos like on test day"), body: text("Шалгалтын өдөр байдаг тооны машин бодлого бүрийн хажууд.", "The same calculator you get on test day, right next to every question."), demo: "desmos" },
    { icon: Zap, c: "lv-orange", pain: text("Хурдаа нэмэгдүүл", "Get faster under time"), body: text("Хурдны горим: цагтай уралдаж, од цуглуул.", "Speed mode: race the clock and earn stars."), demo: "speed" },
    { icon: RotateCcw, c: "lv-pink", pain: text("Нэг алдааг хоёр удаа бүү гарга", "Never repeat a mistake"), body: text("Алдаанууд давталтын системээр зөв цагт буцаж ирнэ.", "Mistakes come back at the right time with spaced repetition."), demo: "review" },
    { icon: BarChart3, c: "lv-green", pain: text("Юу сурахаа таамаглахаа боль", "Stop guessing what to study"), body: text("Сэдэв бүрийн чадвар, SAT оноо таамаглал, өсөлтийн чиглэл.", "Skill by topic, a predicted SAT score and your trend over time."), demo: "analytics" },
  ];

  const more = [
    { icon: PlayCircle, l: text("Ойлголтын видео", "Concept videos") }, { icon: PenLine, l: text("Тэмдэглэл", "Notes on questions") },
    { icon: Radio, l: text("Шууд ангийн тест", "Live class quizzes") }, { icon: Users, l: text("Эцэг эхэд тайлан", "Parent progress link") },
    { icon: CalendarCheck, l: text("Ирц", "Attendance") }, { icon: MonitorPlay, l: text("Bluebook симулятор", "Bluebook simulator") },
    { icon: Flame, l: text("Streak", "Study streaks") }, { icon: Trophy, l: text("Тэмдэг", "Badges") },
  ];

  const faq = [
    { q: text("Хэрхэн элсэх вэ?", "How do I join?"), a: text("Манай ангид бүртгүүлэхэд админ таны утасны дугаарыг системд оруулж, нэвтрэх эрх нээнэ.", "Enroll in a class and an admin adds your phone number, which opens your access.") },
    { q: text("Үнэ хэд вэ?", "How much does it cost?"), a: text("Үнэ ангиас хамаарна. Facebook хуудсаар холбогдож лавлана уу.", "Pricing depends on the class. Message us on Facebook for details.") },
    { q: text("Онлайн уу, танхимаар уу?", "Online or in person?"), a: text("Хоёулаа. Танхимын ангиуд 1105, 905 тоотод, онлайн хичээл ч бий.", "Both. In-person classes are in rooms 1105 and 905, and online classes are available.") },
    { q: text("Оноо таамаглал хэр үнэн бэ?", "How accurate is the score prediction?"), a: text("Бодит SAT-тай харьцуулахад ихэвчлэн ±30 орчим оноогоор зөрдөг бөгөөд шинэ оноо бүрээр шалгагддаг.", "Compared with real SAT results it usually lands within about 30 points, and it's rechecked with every new real score.") },
  ];

  return (
    <div className="landing-v2 min-h-screen" lang={lang === "mon" ? "mn" : "en"}>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="lv-container flex h-16 items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2"><BrandMark className="h-7 w-7" /><span className="font-chillax text-xl font-semibold">flowersos</span></a>
          <nav className="hidden gap-7 text-sm text-muted-foreground md:flex"><a href="#how">{text("Хэрхэн", "How it works")}</a><a href="#features">{text("Боломжууд", "Features")}</a><a href="#results">{text("Үр дүн", "Results")}</a><a href="#faq">FAQ</a></nav>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-muted p-1">{(["mon", "eng"] as const).map(l => <Button variant="ghost" size="sm" key={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 text-xs font-medium ${lang === l ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{l === "mon" ? "МОН" : "ENG"}</Button>)}</div>
            <Button onClick={() => navigate("/practice")} className="hidden rounded-full sm:inline-flex">{text("Нэвтрэх", "Sign in")}</Button>
          </div>
        </div>
      </header>

      <main>
        <section className="lv-sky relative overflow-hidden pb-28 pt-16 md:pt-24">
          <Clouds />
          <div className="lv-container relative grid items-center gap-12 lg:grid-cols-2">
            <motion.div {...reveal}>
              <span className="lv-blue rounded-full px-3 py-1 text-sm font-medium">SAT · Math & English</span>
              <h1 className="lv-h1 mt-6">{text("SAT-аа ", "Ace the ")}<span className="relative inline-block">{text("давж гар", "SAT")}<motion.svg viewBox="0 0 200 12" className="absolute -bottom-2 left-0 w-full" aria-hidden><motion.path d="M2 8 Q50 2 100 7 T198 5" fill="none" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: .6, delay: .3 }} /></motion.svg></span></h1>
              <p className="lv-lead mt-6 max-w-lg">{text(`Манай сурагчид Math-д дунджаар +${s?.best_gain ?? 142} оноо ахисан. Дасгал, таамаглал, лиг — бүгд нэг дор.`, `Our students raise their Math score by +${s?.best_gain ?? 142} on average at their best. Practice, prediction and a league, all in one place.`)}</p>
              <div className="mt-8"><CTA /></div>
            </motion.div>
            <HeroDemo text={text} />
          </div>
        </section>

        <section className="py-10"><div className="lv-container grid grid-cols-2 gap-3 md:grid-cols-4">{proof.map((p, i) => (
          <motion.div key={i} {...reveal} transition={{ duration: .4, delay: i * .06 }} className="lv-card p-5"><p className={`inline-block rounded-full px-3 py-1 font-mono text-2xl font-semibold md:text-3xl ${p.c}`}>{p.v}</p><p className="mt-3 text-sm text-muted-foreground">{p.l}</p></motion.div>
        ))}</div></section>

        <section id="how" className="py-20"><div className="lv-container">
          <motion.h2 {...reveal} className="lv-h2 max-w-xl">{text("Гурван алхам. Нэг зорилго.", "Three steps. One goal.")}</motion.h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">{[
            { icon: Stethoscope, c: "lv-blue", t: text("Оношил", "Diagnose"), d: text("Практик тест таны түвшин, сул сэдвийг олно.", "Practice tests find your level and weak topics.") },
            { icon: Map, c: "lv-violet", t: text("Төлөвлө", "Plan"), d: text("Систем дараа нь юу сурахыг санал болгоно.", "The app tells you what to study next.") },
            { icon: Target, c: "lv-pink", t: text("Дасгалла", "Practice"), d: text("Бодлого бүр оноо, streak, лигийн байр авчирна.", "Every question earns points, streaks and league rank.") },
          ].map((x, i) => (
            <motion.div key={i} {...reveal} transition={{ duration: .4, delay: i * .06 }} className="lv-card overflow-hidden"><div className="lv-sky h-24 p-5"><span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${x.c}`}><x.icon className="h-5 w-5" /></span></div><div className="p-5"><p className="font-mono text-xs text-muted-foreground">0{i + 1}</p><h3 className="mt-1 font-chillax text-2xl font-medium">{x.t}</h3><p className="mt-2 text-muted-foreground">{x.d}</p></div></motion.div>
          ))}</div>
        </div></section>

        <section id="features" className="py-10">{features.map((f, i) => (
          <div key={i} className="py-14"><div className={`lv-container grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <motion.div {...reveal}><span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${f.c}`}><f.icon className="h-5 w-5" /></span><h2 className="lv-h2 mt-5">{f.pain}</h2><p className="lv-lead mt-4 max-w-md">{f.body}</p></motion.div>
            <motion.div {...reveal}><div className="lv-tray"><div className="lv-screen p-5"><FeatureDemo kind={f.demo} text={text} /></div></div><p className="mt-3 text-center text-sm text-muted-foreground">{text("Жишээ өгөгдөл", "Sample data")}</p></motion.div>
          </div></div>
        ))}</section>

        <section className="lv-sky py-20"><div className="lv-container grid items-center gap-10 lg:grid-cols-2">
          <motion.div {...reveal}><h2 className="lv-h2">{text("Сурах нь тоглоом шиг", "Studying that feels like a game")}</h2><p className="lv-lead mt-4 max-w-md">{text("7 хоногийн лиг, Bronze-оос Ruby хүртэлх зэрэг, streak ба тэмдэг. Ruby-д зөвхөн #1 үлдэнэ.", "Weekly leagues, ranks from Bronze to Ruby, streaks and badges. Only #1 keeps Ruby.")}</p></motion.div>
          <motion.div {...reveal} className="lv-card flex flex-wrap items-end justify-center gap-3 p-6">{(["bronze", "silver", "gold", "platinum", "diamond", "ruby"] as const).map((t, i) => (
            <motion.img key={t} src={TIER_ASSETS[t].image} alt={t} className="h-16 w-16 object-contain md:h-20 md:w-20" animate={reduce ? {} : { y: [0, -6, 0] }} transition={{ duration: 4 + i * .4, repeat: Infinity, ease: "easeInOut", delay: i * .3 }} />
          ))}</motion.div>
        </div></section>

        <section className="py-20"><div className="lv-container">
          <motion.h2 {...reveal} className="lv-h2">{text("Бас бусад", "And more")}</motion.h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">{more.map((m, i) => (
            <motion.div key={i} {...reveal} transition={{ duration: .4, delay: i * .04 }} className="lv-card flex items-center gap-3 p-4"><m.icon className="h-5 w-5 shrink-0 text-accent" /><span className="text-sm font-medium">{m.l}</span></motion.div>
          ))}</div>
        </div></section>

        <section id="results" className="py-20"><div className="lv-container">
          <motion.h2 {...reveal} className="lv-h2 max-w-2xl">{text("Бодит сурагчид, бодит тоо", "Real students, real numbers")}</motion.h2>
          <p className="lv-lead mt-4 max-w-2xl">{text("Нэрийг нь зөвшөөрөл авсны дараа нэмнэ. Доорх тоо бүх сурагчийн нийлбэр.", "Names appear only with consent. The numbers below are totals across all students.")}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="lv-card p-6 md:col-span-2"><p className="text-sm text-muted-foreground">{text("Дундаж Math оноо", "Average Math score")}</p>
              <div className="mt-6 flex items-end gap-6">{[{ l: text("Эхний", "First"), v: 482 }, { l: text("Сүүлийн", "Latest"), v: 482 + (s?.avg_gain ?? 88) }, { l: text("Шилдэг", "Best"), v: 482 + (s?.best_gain ?? 142) }].map((b, i) => (
                <div key={i} className="flex-1 text-center"><motion.div className={`mx-auto w-full max-w-[90px] rounded-t-xl ${["lv-blue", "lv-violet", "lv-green"][i]}`} initial={{ height: 0 }} whileInView={{ height: (b.v - 300) / 2 }} viewport={{ once: true }} transition={{ duration: .6, delay: i * .1 }} /><p className="mt-2 font-mono text-xl font-semibold">{b.v}</p><p className="text-xs text-muted-foreground">{b.l}</p></div>
              ))}</div></div>
            <div className="grid gap-4">
              <div className="lv-card p-6"><p className="font-mono text-3xl font-semibold">{s ? fmt(s.club800) : "—"}</p><p className="text-sm text-muted-foreground">{text("сурагч Math 800 авсан", "students hit a perfect 800 Math")}</p></div>
              <div className="lv-card p-6"><p className="font-mono text-3xl font-semibold">{s ? fmt(s.answers) : "—"}</p><p className="text-sm text-muted-foreground">{text("бодлого бодогдсон", "questions answered")}</p></div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">{[0, 1, 2].map(i => (
            <div key={i} className="lv-card border-dashed p-6"><p className="text-sm text-muted-foreground">{text("Сурагчийн түүх — зөвшөөрөл хүлээж байна", "Student story — awaiting consent")}</p><div className="mt-4 h-3 w-2/3 rounded-full bg-muted" /><div className="mt-2 h-3 w-1/2 rounded-full bg-muted" /></div>
          ))}</div>
        </div></section>

        <section id="faq" className="py-20"><div className="lv-container max-w-3xl">
          <h2 className="lv-h2 text-center">FAQ</h2>
          <Accordion type="single" collapsible className="mt-8">{faq.map((f, i) => (
            <AccordionItem key={i} value={`f${i}`}><AccordionTrigger className="text-left text-lg">{f.q}</AccordionTrigger><AccordionContent className="text-base text-muted-foreground">{f.a}</AccordionContent></AccordionItem>
          ))}</Accordion>
        </div></section>

        <section className="lv-sky relative overflow-hidden pb-40 pt-24 text-center">
          <Clouds />
          <motion.div {...reveal} className="lv-container relative"><h2 className="lv-h2 mx-auto max-w-2xl">{text("Дараагийн оноо чинь эндээс эхэлнэ", "Your next score starts here")}</h2><p className="lv-lead mx-auto mt-4 max-w-xl">{text("Ангид элсэж, утасны дугаараа бүртгүүлээд нэвтэрнэ үү.", "Join a class, get your phone number added, and sign in.")}</p><div className="mt-8"><CTA center /></div></motion.div>
        </section>
      </main>

      <footer className="border-t border-border py-10"><div className="lv-container flex flex-col justify-between gap-6 text-sm text-muted-foreground sm:flex-row">
        <div><a href="/" className="flex items-center gap-2 font-chillax text-xl font-semibold text-foreground"><BrandMark className="h-7 w-7" />flowersos</a><p className="mt-2">Tsetsegs SAT Prep · 1105 & 905</p></div>
        <div className="flex gap-6"><a href={FB} target="_blank" rel="noopener noreferrer">Facebook</a><a href="/practice">{text("Нэвтрэх", "Sign in")}</a></div>
      </div></footer>
    </div>
  );
};

function FeatureDemo({ kind, text }: { kind: string; text: (a: string, b: string) => string }) {
  if (kind === "question") return (<div><span className="lv-violet rounded-full px-3 py-1 text-xs">{text("Тайлбар", "Explanation")}</span><p className="mt-3 font-medium">{text("Шулууны налалт 2, (1, 5) цэгээр гарна. y-тэнхлэгийг хаана огтлох вэ?", "A line with slope 2 passes through (1, 5). Where does it cross the y-axis?")}</p><ol className="mt-3 space-y-1.5 font-mono text-sm text-muted-foreground"><li>1. y = 2x + b</li><li>2. 5 = 2(1) + b</li><li className="lv-green inline-block rounded-full px-2">3. b = 3</li></ol></div>);
  if (kind === "desmos") return (<svg viewBox="0 0 300 160" className="w-full"><g stroke="hsl(var(--border))">{[...Array(11)].map((_, i) => <line key={i} x1={i * 30} y1="0" x2={i * 30} y2="160" />)}{[...Array(6)].map((_, i) => <line key={i} x1="0" y1={i * 32} x2="300" y2={i * 32} />)}</g><path d="M0 150 Q150 -60 300 150" fill="none" stroke="hsl(var(--lv-violet-ink))" strokeWidth="3" /><path d="M0 120 L300 40" stroke="hsl(var(--lv-blue-ink))" strokeWidth="3" /></svg>);
  if (kind === "speed") return (<div className="text-center"><p className="font-mono text-5xl font-semibold">0:42</p><div className="mt-3 flex justify-center gap-1 text-3xl">★★<span className="text-muted-foreground">★</span></div><div className="mx-auto mt-4 h-2 w-3/4 overflow-hidden rounded-full bg-muted"><div className="lv-orange h-full w-2/3" /></div><p className="mt-2 text-sm text-muted-foreground">{text("12 / 15 зөв · +15 хурдны оноо", "12 / 15 correct · +15 speed points")}</p></div>);
  if (kind === "review") return (<div className="space-y-2">{[[text("Квадрат тэгшитгэл", "Quadratics"), text("Маргааш", "Tomorrow"), "lv-pink"], [text("Хувь", "Percentages"), text("3 хоногийн дараа", "In 3 days"), "lv-orange"], [text("Шугаман функц", "Linear functions"), text("Цээжилсэн", "Mastered"), "lv-green"]].map(([a, b, c], i) => <div key={i} className="flex items-center justify-between rounded-full border-2 border-border px-4 py-2 text-sm"><span>{a}</span><span className={`rounded-full px-2 py-0.5 text-xs ${c}`}>{b}</span></div>)}</div>);
  return (<div><div className="flex items-baseline justify-between"><p className="text-sm text-muted-foreground">{text("Таамаглал", "Prediction")}</p><span className="lv-green rounded-full px-2 py-0.5 text-xs">▲ +25</span></div><p className="font-mono text-4xl font-semibold">640 <span className="text-base text-muted-foreground">±35</span></p><div className="mt-4 space-y-2">{[[text("Алгебр", "Algebra"), 82], [text("Геометр", "Geometry"), 61], [text("Өгөгдөл", "Data"), 74]].map(([l, v]) => <div key={l as string} className="text-sm"><div className="flex justify-between"><span>{l}</span><span className="font-mono">{v}%</span></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="lv-blue h-full rounded-full" style={{ width: `${v}%` }} /></div></div>)}</div></div>);
}

export default Index;

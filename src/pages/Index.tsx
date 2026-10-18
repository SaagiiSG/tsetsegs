import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, BookOpen, Target, Trophy, BarChart3, Sparkles, GraduationCap, Users, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandMark } from "@/components/BrandMark";
import { supabase } from "@/integrations/supabase/client";
import studySky from "@/assets/landing-sky-study.jpg";
import "./landing-sky.css";
// IELTS achievement images
import ielts801 from "@/assets/ielts-8-0-1.jpg";
import ielts802 from "@/assets/ielts-8-0-2.jpg";
import ielts751 from "@/assets/ielts-7-5-1.jpg";
import ielts80new1 from "@/assets/ielts-8-0-new1.jpg";
import ielts80new2 from "@/assets/ielts-8-0-new2.jpg";
import ielts80new3 from "@/assets/ielts-8-0-new3.jpg";
import ielts80new4 from "@/assets/ielts-8-0-new4.jpg";
import ielts80new5 from "@/assets/ielts-8-0-new5.jpg";
import ielts75new1 from "@/assets/ielts-7-5-new1.jpg";
import ielts75new2 from "@/assets/ielts-7-5-new2.jpg";
import ielts70new1 from "@/assets/ielts-7-0-new1.jpg";
import ielts70new2 from "@/assets/ielts-7-0-new2.jpg";
import ielts70new3 from "@/assets/ielts-7-0-new3.jpg";
import ieltsA1 from "@/assets/ielts-achievement-1.jpg";
import ieltsA2 from "@/assets/ielts-achievement-2.jpg";
import ieltsA3 from "@/assets/ielts-achievement-3.jpg";
import ieltsA4 from "@/assets/ielts-achievement-4.jpg";
import ieltsA5 from "@/assets/ielts-achievement-5.jpg";
import ieltsA6 from "@/assets/ielts-achievement-6.jpg";
import ieltsA7 from "@/assets/ielts-achievement-7.jpg";
import ieltsA8 from "@/assets/ielts-achievement-8.jpg";
import ieltsA9 from "@/assets/ielts-achievement-9.jpg";
import ieltsA10 from "@/assets/ielts-achievement-10.jpg";
import ieltsA11 from "@/assets/ielts-achievement-11.jpg";
import ieltsA12 from "@/assets/ielts-achievement-12.jpg";
import ieltsA13 from "@/assets/ielts-achievement-13.jpg";
import ieltsA14 from "@/assets/ielts-achievement-14.jpg";
import ieltsA15 from "@/assets/ielts-achievement-15.jpg";

// SAT score achievement images
import sat1470 from "@/assets/sat-1470.jpg";
import sat1500 from "@/assets/sat-1500.jpg";
import sat1500_1 from "@/assets/sat-1500-1.jpg";
import sat1480 from "@/assets/sat-1480.jpg";
import sat1500_2 from "@/assets/sat-1500-2.jpg";
import sat1480_2 from "@/assets/sat-1480-2.jpg";
import sat1430 from "@/assets/sat-1430.jpg";

// Translation dictionary
const translations: Record<string, Record<string, string>> = {
  mon: {
    badge: "Монголын шилдэг SAT математикийн төв",
    heroTitle: "SAT-ыг эзэмш",
    heroGradient: "Өндөр оноо ав",
    heroSubtitle: "Цэцэгсийн гэр бүлд нэгдэж, хувийн сургалт, тоглоомжуулсан дасгал, мэргэжилтнүүдийн удирдлагаар чадавхиа нээгээрэй.",
    studentPortal: "Сурагчийн портал",
    staffLogin: "Ажилтны нэвтрэх",
    statAvgScore: "1500+ сурагч SAT математикт авсан",
    statAvgScoreSub: "Дэлхийд дээд 10%-д",
    statStudents: "Актив хэрэглэгчид",
    statExperience: "Жилийн туршлага",
    whyChooseUs: "Яагаад биднийг сонгох вэ",
    everythingYouNeed: "Амжилтанд хүрэхэд хэрэгтэй бүх зүйл",
    succeed: "Амжилт",
    featureSmartTitle: "Ухаалаг дасгал",
    featureSmartDesc: "AI-д суурилсан 2,600+ өвөрмөц бодлого, 300 видео хичээл болон CollegeBoard импорт",
    featureScoreTitle: "Оноо хянах",
    featureScoreDesc: "Зорилтот оноогоо тавьж, хувийн ахицаа хянаарай",
    featureGameTitle: "Тоглоомжуулсан сургалт",
    featureGameDesc: "Badge цуглуулж, түвшин ахиж, найзуудтайгаа өрсөлдөөрэй",
    featureAnalyticsTitle: "Гүнзгий аналитик",
    featureAnalyticsDesc: "Давуу болон сул талуудаа дэлгэрэнгүй гүйцэтгэлийн тайлангаар ойлгоорой",
    studentAchievements: "Сурагчдын амжилт",
    ourStudents: "Манай сурагчид",
    excel: "Тэргүүлдэг",
    totalScore: "Нийт оноо",
    meetTheTeam: "Багтай танилцах",
    our: "Манай",
    teachers: "Багш нар",
    roleCEO: "Захирал",
    roleManager: "Менежер | Англи хэл",
    roleIELTS: "IELTS",
    roleSATMath: "SAT Математик",
    ieltsAchievements: "IELTS-ийн амжилтууд",
    ourIELTS: "Манай IELTS",
    results: "Үр дүн",
    readyToStart: "SAT-ын аялалаа эхлэхэд бэлэн үү?",
    ctaDescription: "Манай туршлагатай багш нар болон батлагдсан аргачлалаар олон зуун сурагчид оноогоо ахиулсан.",
    getStarted: "Эхлэх",
    followFacebook: "Facebook-ээр дагах",
    footerTagline: "Монголын SAT & IELTS бэлтгэлийн шилдэг төв",
    footerCopyright: "Цэцэгс Талент Агентлаг. Бүх эрх хуулиар хамгаалагдсан.",
  },
  eng: {
    badge: "Mongolia's Best SAT Math Center",
    heroTitle: "Master the SAT",
    heroGradient: "Score Higher",
    heroSubtitle: "Join the family of Tsetsegs and unlock your potential with personalized learning, gamified practice, and expert guidance.",
    studentPortal: "Student Portal",
    staffLogin: "Staff Login",
    statAvgScore: "SAT Math scored by 1500+ students",
    statAvgScoreSub: "Top 10% worldwide",
    statStudents: "Active Users",
    statExperience: "Years Experience",
    whyChooseUs: "Why Choose Us",
    everythingYouNeed: "Everything You Need to",
    succeed: "Succeed",
    featureSmartTitle: "Smart Practice",
    featureSmartDesc: "AI-powered question bank with 2,600+ unique problems, 300 video lessons, and CollegeBoard imports",
    featureScoreTitle: "Score Tracking",
    featureScoreDesc: "Set your target score and track your progress with personalized milestones",
    featureGameTitle: "Gamified Learning",
    featureGameDesc: "Earn badges, climb tiers, and compete on leaderboards with your peers",
    featureAnalyticsTitle: "Deep Analytics",
    featureAnalyticsDesc: "Understand your strengths and weaknesses with detailed performance insights",
    studentAchievements: "Student Achievements",
    ourStudents: "Our Students",
    excel: "Excel",
    totalScore: "Total Score",
    meetTheTeam: "Meet the Team",
    our: "Our",
    teachers: "Teachers",
    roleCEO: "CEO",
    roleManager: "Manager | English",
    roleIELTS: "IELTS",
    roleSATMath: "SAT Math",
    ieltsAchievements: "IELTS Achievements",
    ourIELTS: "Our IELTS",
    results: "Results",
    readyToStart: "Ready to Start Your SAT Journey?",
    ctaDescription: "Join hundreds of students who have already improved their scores with our proven methodology and expert teachers.",
    getStarted: "Get Started",
    followFacebook: "Follow Us on Facebook",
    footerTagline: "SAT & IELTS Prep Excellence in Mongolia",
    footerCopyright: "Tsetsegs Talent Agency. All rights reserved.",
  },
};

// Gallery images for student achievements - SAT scores
const galleryImages = [
  { src: sat1500_1, alt: "SAT 1500 - Б. Оюу-Ундрам" },
  { src: sat1500, alt: "SAT 1500 - Г. Тэмүүлэн" },
  { src: sat1500_2, alt: "SAT 1500 - Е. Ескендир" },
  { src: sat1480, alt: "SAT 1480 - Б. Булгамаа" },
  { src: sat1480_2, alt: "SAT 1480 - Г. Тэнгис" },
  { src: sat1470, alt: "SAT 1470 - Билэгбаяр" },
  { src: sat1430, alt: "SAT 1430 - Б. Аманда" },
];


const ieltsImages = [ielts80new1, ielts801, ielts80new2, ieltsA1, ieltsA2, ieltsA3, ielts802, ieltsA4, ieltsA5, ielts80new3, ielts80new4, ielts80new5, ieltsA6, ielts75new1, ieltsA7, ieltsA8, ielts751, ieltsA9, ielts75new2, ieltsA10, ielts70new1, ieltsA11, ielts70new2, ieltsA12, ielts70new3, ieltsA13, ieltsA14, ieltsA15];

const Index = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<"mon" | "eng">("mon");
  const [selected, setSelected] = useState<{src: string; alt: string} | null>(null);
  const [satPage, setSatPage] = useState(0);
  const reduceMotion = useReducedMotion();
  const t = (key: string) => translations[lang][key] || key;
  const text = (mon: string, eng: string) => lang === "mon" ? mon : eng;
  const reveal = { initial: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: .45 } };
  const { data: successScores, isLoading, isError, refetch } = useQuery({
    queryKey: ["landing-success-scores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bluebook_attempts").select("total_score, math_scaled_score, completed_at").not("total_score", "is", null).gte("total_score", 1400).order("total_score", { ascending: false }).limit(12);
      if (error) throw error;
      return data || [];
    },
  });
  const features = [
    { icon: BookOpen, family: "blue", title: "featureSmartTitle", desc: "featureSmartDesc", number: "01" },
    { icon: Target, family: "violet", title: "featureScoreTitle", desc: "featureScoreDesc", number: "02" },
    { icon: Trophy, family: "pink", title: "featureGameTitle", desc: "featureGameDesc", number: "03" },
    { icon: BarChart3, family: "orange", title: "featureAnalyticsTitle", desc: "featureAnalyticsDesc", number: "04" },
  ];
  return (
    <div className="landing-sky min-h-screen bg-background text-foreground" lang={lang === "mon" ? "mn" : "en"}>
      <header className="absolute inset-x-0 top-4 z-20 px-4 md:top-6 md:px-8">
        <nav aria-label={text("Үндсэн цэс", "Main navigation")} className="landing-nav mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-4 py-2 md:px-5">
          <a href="/" aria-label="FlowersOS home" className="flex shrink-0 items-center gap-2 text-primary"><BrandMark className="h-7 w-7" /><span className="font-chillax text-xl font-semibold text-foreground">flowersos</span></a>
          <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features">{text("Сургалт", "Learning")}</a><a href="#achievements">{text("Амжилт", "Results")}</a><a href="#team">IELTS</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-muted p-1" aria-label="Language">
              {(["mon", "eng"] as const).map(l => <Button key={l} variant="ghost" size="sm" aria-pressed={lang === l} onClick={() => setLang(l)} className={`h-8 rounded-full px-2 text-[11px] ${lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>{l === "mon" ? "МОН" : "ENG"}</Button>)}
            </div>
            <Button onClick={() => navigate("/login")} className="landing-primary hidden rounded-full sm:inline-flex">{t("getStarted")}<ArrowUpRight /></Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="landing-hero relative isolate overflow-hidden">
          <img src={studySky} alt="" aria-hidden="true" width={1920} height={1024} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="landing-hero-veil absolute inset-0 -z-10" />
          <div className="landing-container flex h-full flex-col justify-center pb-14 pt-28">
            <motion.div {...reveal} className="max-w-2xl">
              <p className="mb-5 flex items-center gap-2 text-sm font-medium text-primary"><GraduationCap className="h-5 w-5" />{text("SAT & IELTS · Чиний дараагийн алхам", "SAT & IELTS · Your next chapter")}</p>
              <h1 className="font-chillax text-5xl font-semibold leading-[1.1] sm:text-6xl lg:text-7xl">FlowersOS<span className="mt-3 block text-3xl leading-tight sm:text-4xl lg:text-5xl">{text("Өдөр бүр нэг алхам урагш.", "A little further, every day.")}</span></h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">{t("heroSubtitle")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={() => navigate("/practice")} className="landing-primary h-12 rounded-full px-6">{t("studentPortal")}<ArrowRight /></Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/login")} className="h-12 rounded-full border-border bg-card/80 px-6">{t("staffLogin")}<ArrowUpRight /></Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 border-t border-border/70 pt-6">
                {[{value: "2,600+", label: text("Бодлого", "Practice questions"), icon: BookOpen}, {value: "1,000+", label: text("Сурагчид", "Learners"), icon: Users}, {value: "6+", label: text("Жилийн туршлага", "Years of teaching"), icon: GraduationCap}].map(s => <div key={s.value}><div className="font-mono text-2xl font-semibold">{s.value}</div><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><s.icon className="h-3.5 w-3.5" />{s.label}</p></div>)}
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-container">
            <motion.div {...reveal} className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div><p className="landing-eyebrow">{t("whyChooseUs")}</p><h2 className="landing-heading mt-3">{text("Бэлтгэл чинь нэг дор.", "Your preparation, connected.")}</h2></div>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{text("Дасгал хий. Ахицaa хар. Маргааш илүү итгэлтэй бай.", "Build your skills. See your progress. Show up more confident tomorrow.")}</p>
            </motion.div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map(f => <motion.article {...reveal} key={f.title} className={`landing-feature landing-family-${f.family} relative overflow-hidden rounded-2xl bg-card p-6`}>
                <div className="mb-8 flex items-center justify-between"><div className="landing-feature-tile grid h-12 w-12 place-items-center rounded-2xl"><f.icon className="h-6 w-6" /></div><span className="font-mono text-xs text-muted-foreground">{f.number}</span></div>
                <h3 className="font-chillax text-lg font-semibold">{t(f.title)}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(f.desc)}</p>
              </motion.article>)}
            </div>
          </div>
        </section>

        <section id="achievements" className="landing-section landing-results-band">
          <div className="landing-container">
            <motion.div {...reveal} className="mb-9 flex flex-wrap items-end justify-between gap-4">
              <div><p className="landing-eyebrow">{t("studentAchievements")}</p><h2 className="landing-heading mt-3">{text("Хөдөлмөр. Ахиц. Амжилт.", "The work. The growth. The results.")}</h2></div>
              <div className="flex gap-2"><Button variant="outline" size="icon" className="rounded-full bg-card" aria-label="Previous SAT results" onClick={() => setSatPage(p => (p - 1 + galleryImages.length) % galleryImages.length)}><ChevronLeft /></Button><Button variant="outline" size="icon" className="rounded-full bg-card" aria-label="Next SAT results" onClick={() => setSatPage(p => (p + 1) % galleryImages.length)}><ChevronRight /></Button></div>
            </motion.div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {[0, 1, 2].map(offset => { const item = galleryImages[(satPage + offset) % galleryImages.length]; return <Button key={offset} variant="ghost" onClick={() => setSelected(item)} aria-label={item.alt} className="landing-result-photo block h-auto overflow-hidden rounded-2xl p-0"><img src={item.src} alt={item.alt} width={500} height={620} loading="lazy" className="aspect-[4/5] w-full object-contain" /></Button>; })}
            </div>
            <div className="mt-8">
              {isLoading ? <div className="grid grid-cols-3 gap-3 md:grid-cols-6">{Array.from({length: 6}, (_,i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div> : isError ? <div className="flex items-center gap-3 text-sm text-muted-foreground"><span>{text("Оноонуудыг ачаалж чадсангүй.", "Practice results are unavailable.")}</span><Button variant="link" onClick={() => refetch()}>{text("Дахин оролдох", "Retry")}</Button></div> : successScores && successScores.length > 0 ? <><p className="mb-4 text-xs text-muted-foreground">{text("Платформ дээрх SAT дасгалын үр дүн", "SAT practice results on the platform")}</p><div className="grid grid-cols-3 gap-3 md:grid-cols-6">{successScores.slice(0,6).map((s,i) => <div key={i} className="rounded-2xl bg-card p-4 text-center"><div className="font-mono text-2xl font-semibold">{s.total_score}</div><div className="mt-1 text-xs text-muted-foreground">{t("totalScore")}</div></div>)}</div></> : null}
            </div>
          </div>
        </section>

        <section id="team" className="landing-section">
          <div className="landing-container"><motion.div {...reveal} className="mb-9"><p className="landing-eyebrow">{t("ieltsAchievements")}</p><h2 className="landing-heading mt-3">{text("Дэлхийд хүрэх дараагийн алхам.", "A world of possibilities.")}</h2></motion.div></div>
          <div className="landing-ielts-strip flex gap-4 overflow-x-auto px-6 pb-5 md:px-12">
            {ieltsImages.map((src,i) => <Button key={src} variant="ghost" aria-label={`IELTS achievement ${i+1}`} onClick={() => setSelected({src, alt: `IELTS achievement ${i+1}`})} className="landing-result-photo h-auto w-48 shrink-0 overflow-hidden rounded-2xl p-0 md:w-60"><img src={src} alt={`IELTS achievement ${i+1}`} width={300} height={400} loading="lazy" className="aspect-[3/4] w-full object-contain" /></Button>)}
          </div>
        </section>

        <section className="landing-cta py-16 md:py-20">
          <motion.div {...reveal} className="landing-container text-center"><Sparkles className="mx-auto mb-5 h-7 w-7 text-primary" /><h2 className="landing-heading mx-auto max-w-2xl">{t("readyToStart")}</h2><p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">{t("ctaDescription")}</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Button size="lg" onClick={() => navigate("/practice")} className="landing-primary h-12 rounded-full px-7">{t("getStarted")}<ArrowRight /></Button><Button asChild variant="outline" size="lg" className="h-12 rounded-full bg-card"><a href="https://www.facebook.com/tsetsegs.agency" target="_blank" rel="noopener noreferrer">{t("followFacebook")}<ArrowUpRight /></a></Button></div></motion.div>
        </section>
      </main>
      <footer className="landing-container py-10">
        <div className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row"><div><a href="/" className="flex items-center gap-2 font-chillax text-2xl font-semibold"><BrandMark className="h-8 w-8 text-primary" />flowersos</a><p className="mt-3 text-sm text-muted-foreground">{t("footerTagline")}</p></div><div className="text-sm text-muted-foreground"><p>11th floor (1105) & 9th floor (905)</p><Button variant="link" onClick={() => navigate("/login")} className="mt-2 h-auto px-0">{t("staffLogin")}<ArrowUpRight /></Button></div></div>
        <p className="mt-6 text-xs text-muted-foreground">© {new Date().getFullYear()} {t("footerCopyright")}</p>
      </footer>
      <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open) setSelected(null); }}>
        <DialogContent className="landing-sky max-h-[90vh] max-w-2xl overflow-y-auto bg-card p-5">
          <DialogTitle>{selected?.alt}</DialogTitle><DialogDescription className="sr-only">{text("Сурагчийн амжилтын зураг", "Student achievement photograph")}</DialogDescription>
          {selected && <img src={selected.src} alt={selected.alt} className="max-h-[72vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default Index;

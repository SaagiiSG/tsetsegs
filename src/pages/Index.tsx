import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  Target, 
  Trophy, 
  Users, 
  ChevronRight, 
  Sparkles,
  BookOpen,
  BarChart3,
  Zap,
  Star,
  Crown,
  Briefcase,
  Book,
  Calculator
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  SplitText, 
  BlurText, 
  GradientText, 
  Spotlight,
  Magnet, 
  ClickSpark,
  DomeGallery,
  Counter,
  FloatingLines,
  GradualBlur,
  PixelCard,
} from "@/components/reactbits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

// Golden color palette - independent of app themes
const GOLD = {
  primary: "43 88% 50%",
  light: "45 90% 65%",
  dark: "40 85% 40%",
  glow: "43 95% 70%",
  bg: "45 30% 6%",
  cardBg: "42 25% 10%",
  text: "45 20% 95%",
  muted: "43 15% 60%",
};

// Translation dictionary
const translations: Record<string, Record<string, string>> = {
  mon: {
    badge: "Монголын шилдэг SAT математикийн төв",
    heroTitle: "SAT-ыг эзэмш",
    heroGradient: "Өндөр оноо ав",
    heroSubtitle: "Цэцэгсийн гэр бүлд нэгдэж, хувийн сургалт, тоглоомжуулсан дасгал, мэргэжилтнүүдийн удирдлагаар чадавхиа нээгээрэй.",
    studentPortal: "Сурагчийн портал",
    staffLogin: "Ажилтны нэвтрэх",
    statAvgScore: "Дундаж математикийн оноо",
    statStudents: "Бэлтгэгдсэн сурагчид",
    statExperience: "Жилийн туршлага",
    whyChooseUs: "Яагаад биднийг сонгох вэ",
    everythingYouNeed: "Амжилтанд хүрэхэд хэрэгтэй бүх зүйл",
    succeed: "Амжилт",
    featureSmartTitle: "Ухаалаг дасгал",
    featureSmartDesc: "AI-д суурилсан 68+ өвөрмөц бодлого бүхий асуултын сан болон CollegeBoard импорт",
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
    statAvgScore: "Avg Math Score",
    statStudents: "Students Trained",
    statExperience: "Years Experience",
    whyChooseUs: "Why Choose Us",
    everythingYouNeed: "Everything You Need to",
    succeed: "Succeed",
    featureSmartTitle: "Smart Practice",
    featureSmartDesc: "AI-powered question bank with 68+ unique problems and CollegeBoard imports",
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

const Index = () => {
  const navigate = useNavigate();
  const [lang, setLang] = useState<'mon' | 'eng'>('mon');
  const t = (key: string) => translations[lang][key] || key;

  // Role translation helper
  const translateRole = (role: string) => {
    const roleMap: Record<string, string> = {
      "CEO": t('roleCEO'),
      "Manager | English": t('roleManager'),
      "IELTS": t('roleIELTS'),
      "SAT Math": t('roleSATMath'),
    };
    return roleMap[role] || role;
  };

  // Stats with translated labels
  const stats = [
    { value: 700, suffix: "+", labelKey: "statAvgScore", icon: Target },
    { value: 1000, suffix: "+", labelKey: "statStudents", icon: Users },
    { value: 3, suffix: "+", labelKey: "statExperience", icon: Star },
  ];

  // Features with translated content
  const features = [
    { icon: BookOpen, titleKey: "featureSmartTitle", descKey: "featureSmartDesc" },
    { icon: Target, titleKey: "featureScoreTitle", descKey: "featureScoreDesc" },
    { icon: Trophy, titleKey: "featureGameTitle", descKey: "featureGameDesc" },
    { icon: BarChart3, titleKey: "featureAnalyticsTitle", descKey: "featureAnalyticsDesc" },
  ];

  // Team members
  const teamMembers = [
    { name: "Misheel", role: "CEO", iconType: "crown" as const },
    { name: "Brody", role: "Manager | English", iconType: "briefcase" as const },
    { name: "Dulguun", role: "IELTS", iconType: "book" as const },
    { name: "Udval", role: "IELTS", iconType: "book" as const },
    { name: "Saran-Ochir", role: "SAT Math", iconType: "calculator" as const },
    { name: "Manlai", role: "SAT Math", iconType: "calculator" as const },
    { name: "Tuguldur", role: "SAT Math", iconType: "calculator" as const },
    { name: "Enguun", role: "SAT Math", iconType: "calculator" as const },
    { name: "Khulan", role: "SAT Math", iconType: "calculator" as const },
  ];

  // Fetch student success scores from bluebook_attempts
  const { data: successScores } = useQuery({
    queryKey: ["landing-success-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_attempts")
        .select("total_score, math_scaled_score, completed_at")
        .not("total_score", "is", null)
        .gte("total_score", 1400)
        .order("total_score", { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: `hsl(${GOLD.bg})`,
        color: `hsl(${GOLD.text})`,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Language Toggle - Fixed top-right */}
      <div className="fixed top-4 right-4 z-50">
        <div 
          className="flex rounded-full p-1 backdrop-blur-md"
          style={{
            background: `hsl(${GOLD.cardBg} / 0.9)`,
            border: `1px solid hsl(${GOLD.primary} / 0.3)`,
          }}
        >
          <button
            onClick={() => setLang('mon')}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
            style={{
              background: lang === 'mon' ? `linear-gradient(135deg, hsl(${GOLD.primary}), hsl(${GOLD.dark}))` : 'transparent',
              color: lang === 'mon' ? 'hsl(0 0% 5%)' : `hsl(${GOLD.muted})`,
            }}
          >
            МОН
          </button>
          <button
            onClick={() => setLang('eng')}
            className="px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200"
            style={{
              background: lang === 'eng' ? `linear-gradient(135deg, hsl(${GOLD.primary}), hsl(${GOLD.dark}))` : 'transparent',
              color: lang === 'eng' ? 'hsl(0 0% 5%)' : `hsl(${GOLD.muted})`,
            }}
          >
            ENG
          </button>
        </div>
      </div>

      {/* Floating Lines Background - Fixed across all sections */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <FloatingLines 
          linesGradient={["#D4A853", "#B8902D", "#E6C570"]}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[8, 10, 6]}
          lineDistance={[4, 5, 3]}
          animationSpeed={0.8}
          interactive={true}
          parallax={true}
          parallaxStrength={0.15}
          mixBlendMode="screen"
        />
        {/* Golden gradient overlays for top and bottom */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ 
            background: `linear-gradient(to bottom, hsl(${GOLD.primary} / 0.3), transparent)` 
          }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ 
            background: `linear-gradient(to top, hsl(${GOLD.primary} / 0.3), transparent)` 
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen">

        {/* Animated grid background with golden tint */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, hsl(${GOLD.primary} / 0.3) 1px, transparent 1px), linear-gradient(to bottom, hsl(${GOLD.primary} / 0.3) 1px, transparent 1px)`,
            backgroundSize: "4rem 4rem",
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%)",
          }}
        />
        
        {/* Golden gradient orbs - hidden on mobile to avoid overflow */}
        <div 
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl animate-pulse pointer-events-none hidden md:block"
          style={{ background: `hsl(${GOLD.primary} / 0.2)` }}
        />
        <div 
          className="absolute top-[40%] -right-32 w-96 h-96 rounded-full blur-3xl animate-pulse pointer-events-none hidden md:block"
          style={{ background: `hsl(${GOLD.light} / 0.15)`, animationDelay: "1s" }}
        />

        {/* Hero Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16 md:py-20">
          <div className="w-full max-w-6xl mx-auto text-center space-y-6 md:space-y-8">
            {/* Top Badge - Outside frosted glass */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, hsl(${GOLD.primary} / 0.2), hsl(${GOLD.dark} / 0.3))`,
                border: `1px solid hsl(${GOLD.primary} / 0.4)`,
                color: `hsl(${GOLD.light})`,
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('badge')}</span>
            </motion.div>

            {/* Frosted Glass Container - Only wraps headline and subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="backdrop-blur-xl rounded-2xl md:rounded-3xl px-4 py-8 md:px-12 md:py-14 w-full"
              style={{
                background: `linear-gradient(135deg, hsl(${GOLD.bg} / 0.7), hsl(${GOLD.cardBg} / 0.5))`,
                border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                boxShadow: `0 8px 32px hsl(${GOLD.bg} / 0.5), inset 0 1px 0 hsl(${GOLD.light} / 0.1)`,
              }}
            >
              {/* Main headline with animated text */}
              <div className="space-y-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <h1 
                  className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight"
                  style={{ color: `hsl(${GOLD.text})` }}
                >
                  <SplitText
                    text={t('heroTitle')}
                    className="block"
                    delay={30}
                    duration={0.5}
                    splitType="chars"
                  />
                </h1>
                <div className="text-5xl md:text-7xl lg:text-8xl font-bold">
                  <GradientText
                    colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`, `hsl(${GOLD.glow})`, `hsl(${GOLD.light})`]}
                    animationSpeed={6}
                    className="font-bold"
                  >
                    {t('heroGradient')}
                  </GradientText>
                </div>
              </div>

              {/* Subtitle */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-6"
                style={{ color: `hsl(${GOLD.muted})` }}
              >
                <BlurText
                  text={t('heroSubtitle')}
                  className="text-lg md:text-xl max-w-3xl mx-auto"
                  delay={20}
                  animateBy="words"
                />
              </motion.div>
            </motion.div>

            {/* CTA Buttons - Outside frosted glass */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            >
              <ClickSpark sparkColor={`hsl(${GOLD.glow})`}>
                <Magnet strength={0.3}>
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 rounded-full transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, hsl(${GOLD.primary}), hsl(${GOLD.dark}))`,
                      color: "hsl(0 0% 5%)",
                      boxShadow: `0 0 40px hsl(${GOLD.primary} / 0.4)`,
                    }}
                    onClick={() => navigate("/practice")}
                  >
                    <GraduationCap className="mr-2 h-5 w-5" />
                    {t('studentPortal')}
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Magnet>
              </ClickSpark>
              
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 rounded-full border-2"
                style={{
                  borderColor: `hsl(${GOLD.primary} / 0.5)`,
                  color: `hsl(${GOLD.light})`,
                  background: "transparent",
                }}
                onClick={() => navigate("/login")}
              >
                <Users className="mr-2 h-5 w-5" />
                {t('staffLogin')}
              </Button>
            </motion.div>

            {/* Stats with Counter animation - Outside frosted glass */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="grid grid-cols-3 gap-8 pt-8 max-w-3xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.labelKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 + index * 0.1, duration: 0.4 }}
                  className="text-center"
                >
                  <div 
                    className="text-3xl md:text-5xl font-bold"
                    style={{ color: `hsl(${GOLD.light})` }}
                  >
                    <Counter 
                      value={stat.value} 
                      suffix={stat.suffix}
                      duration={2.5}
                    />
                  </div>
                  <div 
                    className="text-sm mt-1 flex items-center justify-center gap-1"
                    style={{ color: `hsl(${GOLD.muted})` }}
                  >
                    <stat.icon className="w-3 h-3" />
                    {t(stat.labelKey)}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {/* Text header */}
          <div className="text-center space-y-4 mb-12">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="font-medium inline-block"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              {t('whyChooseUs')}
            </motion.span>
            
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {t('everythingYouNeed')}{" "}
              <GradientText
                colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`]}
                animationSpeed={4}
              >
                {t('succeed')}
              </GradientText>
            </motion.h2>
          </div>

          {/* Feature cards */}
          <div className="flex flex-col items-center gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.titleKey}
                variants={{
                  hidden: { opacity: 0, x: index % 2 === 0 ? -60 : 60, y: 20 },
                  visible: { 
                    opacity: 1, 
                    x: 0, 
                    y: 0, 
                    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } 
                  }
                }}
                className="w-[80%]"
              >
                <Card 
                  className="relative p-8 backdrop-blur-md transition-all hover:-translate-y-2 hover:shadow-xl group"
                  style={{
                    background: `hsl(${GOLD.cardBg} / 0.95)`,
                    border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                  }}
                >
                  <div className="flex items-start gap-6">
                    <motion.div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                      style={{ background: `hsl(${GOLD.primary} / 0.15)` }}
                    >
                      <feature.icon 
                        className="w-7 h-7"
                        style={{ color: `hsl(${GOLD.light})` }}
                      />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 
                        className="text-2xl font-semibold"
                        style={{ color: `hsl(${GOLD.text})` }}
                      >
                        {t(feature.titleKey)}
                      </h3>
                      <p 
                        className="text-base leading-relaxed"
                        style={{ color: `hsl(${GOLD.muted})` }}
                      >
                        {t(feature.descKey)}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Student Success Section with DomeGallery */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${GOLD.primary} / 0.05), transparent)` }}
        />
        
        <motion.div 
          className="relative max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
        >
          <div className="text-center space-y-4 mb-16">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="font-medium inline-block"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              {t('studentAchievements')}
            </motion.span>
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {t('ourStudents')}{" "}
              <GradientText
                colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`]}
                animationSpeed={4}
              >
                {t('excel')}
              </GradientText>
            </motion.h2>
          </div>

          {/* Dome Gallery */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 60, scale: 0.9 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } }
            }}
            className="backdrop-blur-xl rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, hsl(${GOLD.bg} / 0.6), hsl(${GOLD.cardBg} / 0.4))`,
              border: `1px solid hsl(${GOLD.primary} / 0.2)`,
              boxShadow: `0 8px 32px hsl(${GOLD.bg} / 0.5)`,
            }}
          >
            <div className="w-full h-[550px]">
              <DomeGallery 
                images={galleryImages}
                overlayBlurColor="transparent"
                imageBorderRadius="16px"
                openedImageBorderRadius="20px"
                grayscale={false}
                segments={25}
              />
            </div>
          </motion.div>

          {/* Real scores */}
          {successScores && successScores.length > 0 && (
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } }
              }}
            >
              {successScores.map((score, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.85, rotateX: -15 },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1, 
                      rotateX: 0,
                      transition: { duration: 0.5, ease: "easeOut" } 
                    }
                  }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-4 rounded-2xl text-center cursor-default"
                  style={{
                    background: `linear-gradient(135deg, hsl(${GOLD.cardBg}), hsl(${GOLD.bg}))`,
                    border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                  }}
                >
                  <div 
                    className="text-2xl md:text-3xl font-bold"
                    style={{ color: `hsl(${GOLD.light})` }}
                  >
                    {score.total_score}
                  </div>
                  <div 
                    className="text-xs mt-1"
                    style={{ color: `hsl(${GOLD.muted})` }}
                  >
                    {t('totalScore')}
                  </div>
                  {score.math_scaled_score && (
                    <div 
                      className="text-sm mt-2 font-medium"
                      style={{ color: `hsl(${GOLD.primary})` }}
                    >
                      Math: {score.math_scaled_score}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* IELTS Achievements Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${GOLD.primary} / 0.08), transparent)` }}
        />
        
        <motion.div 
          className="relative max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <div className="text-center space-y-4 mb-16">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="font-medium inline-block"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              {t('ieltsAchievements')}
            </motion.span>
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {t('ourIELTS')}{" "}
              <GradientText
                colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`]}
                animationSpeed={4}
              >
                {t('results')}
              </GradientText>
            </motion.h2>
          </div>
        </motion.div>

        {/* Scrolling rows - full screen width */}
        <div className="space-y-6 w-screen relative left-1/2 -translate-x-1/2 overflow-hidden">
          {/* Row 1 - scrolls left */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex gap-4 animate-[scroll-left_40s_linear_infinite]">
              {[ielts80new1, ielts801, ielts80new2, ieltsA1, ieltsA2, ieltsA3, ielts802, ieltsA4, ieltsA5, ielts80new3, ielts80new4, ielts80new5,
                ielts80new1, ielts801, ielts80new2, ieltsA1, ieltsA2, ieltsA3, ielts802, ieltsA4, ieltsA5, ielts80new3, ielts80new4, ielts80new5].map((img, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-48 h-60 md:w-56 md:h-72 rounded-xl overflow-hidden"
                  style={{
                    border: `2px solid hsl(${GOLD.primary} / 0.3)`,
                    boxShadow: `0 8px 24px hsl(${GOLD.bg} / 0.6)`,
                  }}
                >
                  <img src={img} alt={`IELTS Achievement ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </motion.div>

          {/* Row 2 - scrolls right */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="flex gap-4 animate-[scroll-right_45s_linear_infinite]">
              {[ieltsA6, ielts75new1, ieltsA7, ieltsA8, ielts751, ieltsA9, ielts75new2, ieltsA10, ielts70new1, ieltsA11, ielts70new2, ieltsA12, ielts70new3, ieltsA13, ieltsA14, ieltsA15,
                ieltsA6, ielts75new1, ieltsA7, ieltsA8, ielts751, ieltsA9, ielts75new2, ieltsA10, ielts70new1, ieltsA11, ielts70new2, ieltsA12, ielts70new3, ieltsA13, ieltsA14, ieltsA15].map((img, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-48 h-60 md:w-56 md:h-72 rounded-xl overflow-hidden"
                  style={{
                    border: `2px solid hsl(${GOLD.primary} / 0.3)`,
                    boxShadow: `0 8px 24px hsl(${GOLD.bg} / 0.6)`,
                  }}
                >
                  <img src={img} alt={`IELTS Achievement ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Team Section - hidden for now */}
      {/* <section className="relative py-24 px-4 overflow-hidden">
        ... team content hidden ...
      </section> */}

      {/* CTA Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 60, scale: 0.9 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } }
            }}
          >
            <Spotlight 
              spotlightColor={`hsl(${GOLD.primary} / 0.2)`}
              className="rounded-3xl"
            >
              <Card 
                className="relative overflow-hidden p-8 md:p-12"
                style={{
                  background: `linear-gradient(135deg, hsl(${GOLD.cardBg}), hsl(${GOLD.bg}))`,
                  border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                }}
              >
                {/* Background decoration */}
                <div 
                  className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
                  style={{ background: `hsl(${GOLD.primary} / 0.1)` }}
                />
                
                <motion.div 
                  className="relative z-10 text-center space-y-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } }
                  }}
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, scale: 0.5, rotate: -20 },
                      visible: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.6, ease: "backOut" } }
                    }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
                    style={{ background: `hsl(${GOLD.primary} / 0.15)` }}
                  >
                    <Zap 
                      className="w-8 h-8"
                      style={{ color: `hsl(${GOLD.light})` }}
                    />
                  </motion.div>
                  
                  <motion.h2
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                    }}
                    className="text-3xl md:text-4xl font-bold"
                    style={{ color: `hsl(${GOLD.text})`, fontFamily: "'Outfit', sans-serif" }}
                  >
                    {t('readyToStart')}
                  </motion.h2>
                  
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                    }}
                    className="max-w-xl mx-auto"
                    style={{ color: `hsl(${GOLD.muted})` }}
                  >
                    {t('ctaDescription')}
                  </motion.p>
                  
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                    }}
                    className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
                  >
                    <ClickSpark sparkColor={`hsl(${GOLD.glow})`}>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          size="lg"
                          className="rounded-full px-8"
                          style={{
                            background: `linear-gradient(135deg, hsl(${GOLD.primary}), hsl(${GOLD.dark}))`,
                            color: "hsl(0 0% 5%)",
                          }}
                          onClick={() => navigate("/practice")}
                        >
                          {t('getStarted')}
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    </ClickSpark>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="lg"
                        variant="ghost"
                        className="rounded-full px-8"
                        style={{ color: `hsl(${GOLD.light})` }}
                        onClick={() => window.open("https://www.facebook.com/tsetsegs.agency", "_blank")}
                      >
                        {t('followFacebook')}
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </Card>
            </Spotlight>
          </motion.div>
        </motion.div>
      </section>

      {/* TsetsegsOS Footer */}
      <footer 
        className="relative py-16 px-4 pb-40 overflow-hidden"
        style={{ borderTop: `1px solid hsl(${GOLD.primary} / 0.1)` }}
      >
        <motion.div 
          className="max-w-[95vw] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
        >
          {/* Giant TsetsegsOS text */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 80, scale: 0.8 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] } }
            }}
            className="mb-12"
          >
            <h2 
              className="font-bold uppercase tracking-tight leading-none"
              style={{
                fontSize: "clamp(4rem, 18vw, 20rem)",
                fontFamily: "'Outfit', sans-serif",
                background: `linear-gradient(135deg, hsl(${GOLD.light}), hsl(${GOLD.primary}), hsl(${GOLD.dark}))`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              TSETSEGS<span style={{ opacity: 0.7 }}>OS</span>
            </h2>
          </motion.div>

          {/* Footer info */}
          <motion.div 
            className="flex flex-col md:flex-row justify-between items-center gap-6"
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
          >
            <div className="text-center md:text-left">
              <p 
                className="text-sm"
                style={{ color: `hsl(${GOLD.muted})` }}
              >
                {t('footerTagline')}
              </p>
            </div>
            
            <div 
              className="flex flex-col md:flex-row items-center gap-4 text-sm"
              style={{ color: `hsl(${GOLD.muted})` }}
            >
              <span>11th floor (1105) & 9th floor (905)</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="mt-8 pt-8 text-center text-sm"
            style={{ 
              borderTop: `1px solid hsl(${GOLD.primary} / 0.1)`,
              color: `hsl(${GOLD.muted})`,
            }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.6, delay: 0.2 } }
            }}
          >
            © {new Date().getFullYear()} {t('footerCopyright')}
          </motion.div>
        </motion.div>
      </footer>

      {/* GradualBlur at bottom */}
      <GradualBlur 
        position="bottom"
        height="10rem"
        strength={3}
        divCount={6}
        curve="ease-out"
        target="page"
        zIndex={50}
      />
    </div>
  );
};

export default Index;

import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import CountUp from "react-countup";
import {
  User,
  Calendar,
  MapPin,
  Facebook,
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw,
  Target,
  Calculator,
  Instagram,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import flowersLogo from "@/assets/flowers-logo.png";
import bgMusicFile from "@/assets/bg-music.mp3";

type Language = "en" | "mn";

const translations = {
  en: {
    loading: "Loading your celebration...",
    chooseLanguage: "Choose Your Language",
    grandEntrance: { welcome: "Welcome to", family: "Family of Tsetsegs" },
    legacy: {
      title: "A Legacy of Excellence",
      message:
        "You are now part of a tradition that transforms dreams into reality. Together, we will unlock your potential and pave your path to success.",
      quote: '"Exams passed dreams unlocked"',
    },
    stats: {
      title: "Our Achievements",
      score1400: "1400+ SAT Score",
      students1400: "30+ students",
      score1300: "1300+ SAT Score",
      students1300: "100+ students",
      scoreMath: "700+ SAT Math",
      studentsMath: "400+ students",
    },
    numberOne: {
      title: "Mongolia's #1",
      subtitle: "SAT MATH Prep Center",
      message: "Leading the nation in SAT preparation and student success. Join the best and become the best.",
    },
    classDetails: {
      title: "Your Class Details",
      teacher: "Teacher",
      schedule: "Schedule",
      room: "Room",
      startDate: "Start Date",
      location: "Location",
      address: "Их Наяд Зүүн Өндөр",
      joinGroup: "Join Facebook Group",
      joinGroupDesc: "Connect with your classmates",
      latestNews: "Latest News from Tsetsegs",
    },
  },
  mn: {
    loading: "Баярын мэндчилгээ уншиж байна...",
    chooseLanguage: "Хэл сонгох",
    grandEntrance: { welcome: "Цэцэгсийн гэр бүлд ", family: "Тавтай морил" },
    legacy: {
      title: "Амжилтын уламжлал",
      message:
        "Та мөрөөдлөө бодит болгодог уламжлалын нэг хэсэг боллоо. Бид хамтдаа таны боломжийг нээж, амжилтын замыг тавих болно.",
      quote: '"Бүх агуу амжилт туршиж үзэх шийдвэрээс эхэлдэг."',
    },
    stats: {
      title: "Бидний амжилтууд",
      score1400: "1400+ SAT оноо",
      students1400: "30+ сурагч",
      score1300: "1300+ SAT оноо",
      students1300: "100+ сурагч",
      scoreMath: "700+ SAT Математик",
      studentsMath: "400+ сурагч",
    },
    numberOne: {
      title: "Монголын #1",
      subtitle: "SAT MAТH бэлтгэлийн төв",
      message: "Сурагчдын амжилтын хувиар улсдаа тэргүүлэгч, Шилдэгтэй нэгдэж, шилдэг бол.",
    },
    classDetails: {
      title: "Таны ангийн мэдээлэл",
      teacher: "Багш",
      schedule: "Хуваарь",
      room: "Тоот",
      startDate: "Эхлэх огноо",
      location: "Байршил",
      address: "Их Наяд Зүүн Өндөр",
      joinGroup: "Facebook бүлэгт нэгдэх",
      joinGroupDesc: "Ангийнхантайгаа холбогдох",
      latestNews: "Цэцэгсээс сошиал хаягууд",
    },
  },
};

const StudentReveal = () => {
  const { id } = useParams();
  const [batch, setBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language | null>(null);
  const [currentPanel, setCurrentPanel] = useState(-1);
  const [isMuted, setIsMuted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { width, height } = useWindowSize();
  const t = language ? translations[language] : translations.en;

  useEffect(() => {
    const audio = new Audio(bgMusicFile);
    audio.loop = true;
    audio.volume = 0.25;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted;
  }, [isMuted]);
  useEffect(() => {
    if (language && audioRef.current && currentPanel >= 0)
      audioRef.current.play().catch((e) => console.log("Audio:", e));
  }, [language, currentPanel]);

  useEffect(() => {
    const fetchBatch = async () => {
      const { data, error } = await supabase.from("batches").select("*").eq("unique_link_id", id).maybeSingle();
      if (error) {
        console.error(error);
        setIsLoading(false);
        return;
      }
      setBatch(data);
      setIsLoading(false);
    };
    fetchBatch();
  }, [id]);

  useEffect(() => {
    if (currentPanel === 0 && batch && language) {
      setShowConfetti(true);
      const t = setTimeout(() => {
        setCurrentPanel(1);
        setShowConfetti(false);
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [currentPanel, batch, language]);

  useEffect(() => {
    if (currentPanel === 1) {
      const t = setTimeout(() => setCurrentPanel(2), 6000);
      return () => clearTimeout(t);
    }
    if (currentPanel === 2) {
      const t = setTimeout(() => setCurrentPanel(3), 6000);
      return () => clearTimeout(t);
    }
    if (currentPanel === 3) {
      const t = setTimeout(() => setCurrentPanel(4), 6000);
      return () => clearTimeout(t);
    }
  }, [currentPanel]);

  const restart = () => setCurrentPanel(0);
  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    setCurrentPanel(0);
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-reveal-bg flex items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 relative z-10"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img src={flowersLogo} alt="Flowers" className="w-48 mx-auto" />
          </motion.div>
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-bold text-gold"
          >
            {t.loading}
          </motion.p>
        </motion.div>
      </div>
    );

  if (!batch)
    return (
      <div className="min-h-screen bg-reveal-bg flex items-center justify-center">
        <p className="text-xl text-gold">Batch not found</p>
      </div>
    );

  return (
    <div className="h-full bg-reveal-bg relative overflow-hidden">
      <div
        className="fixed inset-0 opacity-10 bottom-0"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      {showConfetti && <Confetti width={width} height={height} />}

      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-3"
        style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 50 }}
      >
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="bg-black/40 border-gold/30 hover:bg-black/60 backdrop-blur-sm"
        >
          {isMuted ? <VolumeX className="h-5 w-5 text-gold" /> : <Volume2 className="h-5 w-5 text-gold" />}
        </Button>
        {currentPanel > -1 && (
          <Button
            variant="outline"
            size="icon"
            onClick={restart}
            className="bg-black/40 border-gold/30 hover:bg-black/60 backdrop-blur-sm"
          >
            <RotateCcw className="h-5 w-5 text-gold" />
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {currentPanel === -1 && (
          <motion.div
            key="lang"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex items-center justify-center relative z-10 px-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="text-center space-y-12 max-w-2xl w-full"
            >
              <motion.img
                src={flowersLogo}
                alt="Flowers"
                className="w-64 mx-auto"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="space-y-6">
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gold">
                  {translations.en.chooseLanguage}
                </h1>
                <p className="text-lg md:text-xl text-gold/80">{translations.mn.chooseLanguage}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 md:gap-6 justify-center">
                <Button
                  size="lg"
                  onClick={() => handleLanguageSelect("en")}
                  className="bg-gold/20 hover:bg-gold/30 text-gold border-2 border-gold text-lg md:text-2xl py-6 md:py-8 px-8 md:px-12 rounded-xl backdrop-blur-sm transition-all hover:scale-105"
                >
                  English
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleLanguageSelect("mn")}
                  className="bg-gold/20 hover:bg-gold/30 text-gold border-2 border-gold text-lg md:text-2xl py-6 md:py-8 px-8 md:px-12 rounded-xl backdrop-blur-sm transition-all hover:scale-105"
                >
                  Монгол
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {currentPanel === 0 && language && (
          <motion.div
            key="p0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen flex flex-col items-center justify-center relative z-10 px-6"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gold rounded-full"
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{
                  x: (Math.random() - 0.5) * 800,
                  y: (Math.random() - 0.5) * 800,
                  scale: [0, 1, 0],
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 2, delay: i * 0.02, ease: "easeOut" }}
                style={{ left: "50%", top: "50%" }}
              />
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <img src={flowersLogo} alt="Flowers" className="w-48" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
              className="text-center"
            >
              <h1 className="text-3xl md:text-4xl font-light text-white mb-3">{t.grandEntrance.welcome}</h1>
              <motion.h2
                className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{ backgroundSize: "200% auto" }}
              >
                {t.grandEntrance.family}
              </motion.h2>
            </motion.div>
          </motion.div>
        )}
        {currentPanel === 1 && language && (
          <motion.div
            key="p1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen flex items-center justify-center relative z-10 px-4 md:px-6"
          >
            <motion.div
              className="max-w-4xl space-y-8 md:space-y-12 text-center px-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.h2
                className="text-3xl md:text-5xl lg:text-6xl font-bold text-gold mb-6 md:mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {t.legacy.title}
              </motion.h2>
              <motion.p
                className="text-2xl md:text-3xl text-white leading-relaxed mb-12"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                {t.legacy.message}
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="border-l-4 border-gold pl-8 py-4"
              >
                <p className="text-xl md:text-2xl italic text-white">{t.legacy.quote}</p>
              </motion.div>
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-gold/30 rounded-full"
                  animate={{ y: [0, -100, 0], x: Math.random() * 100 - 50, opacity: [0, 1, 0] }}
                  transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                  style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
        {currentPanel === 2 && language && (
          <motion.div
            key="p2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen flex items-center justify-center relative z-10 px-6 py-20"
          >
            <div className="max-w-4xl w-full space-y-6">
              <motion.h2
                className="text-5xl md:text-6xl font-bold text-center text-gold mb-12"
                initial={{ y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                {t.stats.title}
              </motion.h2>
              <motion.div
                className="flex items-center gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-2xl p-8"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Target className="w-12 h-12 text-gold flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="text-4xl font-bold text-gold">
                    <CountUp start={0} end={30} duration={2.5} delay={0.5} suffix="+" />
                  </div>
                  <p className="text-xl text-white font-medium">{t.stats.score1400}</p>
                  <p className="text-sm text-white/90">{t.stats.students1400}</p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-center gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-2xl p-8"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Target className="w-12 h-12 text-gold flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="text-4xl font-bold text-gold">
                    <CountUp start={0} end={100} duration={2.5} delay={0.7} suffix="+" />
                  </div>
                  <p className="text-xl text-white font-medium">{t.stats.score1300}</p>
                  <p className="text-sm text-white/90">{t.stats.students1300}</p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-center gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-2xl p-8"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <Calculator className="w-12 h-12 text-gold flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="text-4xl font-bold text-gold">
                    <CountUp start={0} end={400} duration={2.5} delay={0.9} suffix="+" />
                  </div>
                  <p className="text-xl text-white font-medium">{t.stats.scoreMath}</p>
                  <p className="text-sm text-white/90">{t.stats.studentsMath}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
        {currentPanel === 3 && language && (
          <motion.div
            key="p3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen flex items-center justify-center relative z-10 px-4 md:px-6"
          >
            <motion.div
              className="text-center space-y-12 max-w-4xl"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative"
              >
                <motion.div
                  className="absolute inset-0 blur-3xl bg-gold/30 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <Trophy className="w-40 h-40 text-gold mx-auto relative z-10" />
              </motion.div>
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="space-y-6"
              >
                <h1 className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-gold via-yellow-300 to-gold bg-clip-text text-transparent">
                  {t.numberOne.title}
                </h1>
                <p className="text-3xl md:text-4xl text-white font-light">{t.numberOne.subtitle}</p>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="text-2xl text-white leading-relaxed max-w-2xl mx-auto"
              >
                {t.numberOne.message}
              </motion.p>
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-gold/20 rounded-full"
                  initial={{ width: 0, height: 0, opacity: 0.5 }}
                  animate={{ width: 300 + i * 200, height: 300 + i * 200, opacity: 0 }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
        {currentPanel === 4 && language && (
          <motion.div
            key="p4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen flex items-center justify-center relative z-10 px-4 md:px-6 pt-24 md:pt-28 pb-32 md:pb-20"
          >
            <motion.div
              className="max-w-3xl md:max-w-4xl w-full space-y-6 mx-auto"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <motion.h2
                className="text-3xl md:text-5xl lg:text-6xl font-bold text-center text-gold mb-6 md:mb-12"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                {t.classDetails.title}
              </motion.h2>
              <motion.div
                className="flex items-center gap-3 md:gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-xl md:rounded-2xl p-4 md:p-8 max-w-md md:max-w-full mx-auto"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <User className="w-8 h-8 md:w-12 md:h-12 text-gold flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-white text-sm md:text-base">{t.classDetails.teacher}</p>
                  <p className="text-lg md:text-2xl font-bold text-gold">{batch.teacher || "TBA"}</p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 md:gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-xl md:rounded-2xl p-4 md:p-8 max-w-md md:max-w-full mx-auto"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Calendar className="w-8 h-8 md:w-12 md:h-12 text-gold flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-white text-sm md:text-base">{t.classDetails.schedule}</p>
                  <p className="text-base md:text-xl font-semibold text-gold">{batch.schedule}</p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 md:gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-xl md:rounded-2xl p-4 md:p-8 max-w-md md:max-w-full mx-auto"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <MapPin className="w-8 h-8 md:w-12 md:h-12 text-gold flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-white text-sm md:text-base">{t.classDetails.room}</p>
                  <p className="text-lg md:text-2xl font-bold text-gold">{batch.room || "TBA"}</p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-center gap-3 md:gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-xl md:rounded-2xl p-4 md:p-8 max-w-md md:max-w-full mx-auto"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                <Calendar className="w-8 h-8 md:w-12 md:h-12 text-gold flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-white text-sm md:text-base">{t.classDetails.startDate}</p>
                  <p className="text-base md:text-xl font-semibold text-gold">
                    {new Date(batch.start_date).toLocaleDateString(language === "mn" ? "mn-MN" : "en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </motion.div>
              <motion.div
                className="flex items-start gap-3 md:gap-6 bg-black/40 backdrop-blur-lg border-2 border-gold/30 rounded-xl md:rounded-2xl p-4 md:p-8 max-w-md md:max-w-full mx-auto"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                <MapPin className="w-8 h-8 md:w-12 md:h-12 text-gold flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-1">
                  <p className="text-white text-sm md:text-base">{t.classDetails.location}</p>
                  <p className="text-sm md:text-lg text-white">{t.classDetails.address}</p>
                </div>
              </motion.div>
              {batch.fb_group_link && (
                <motion.div
                  className="max-w-md mx-auto"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                >
                  <Button
                    onClick={() => window.open(batch.fb_group_link, "_blank")}
                    className="w-full bg-gold/20 hover:bg-gold/30 text-gold border-2 border-gold py-8 text-xl rounded-xl backdrop-blur-sm transition-all hover:scale-105"
                  >
                    <Facebook className="w-6 h-6 mr-3" />
                    <div className="text-left">
                      <div className="font-bold">{t.classDetails.joinGroup}</div>
                      <div className="text-sm opacity-80">{t.classDetails.joinGroupDesc}</div>
                    </div>
                  </Button>
                </motion.div>
              )}

              <motion.div
                className="space-y-4 mt-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
              >
                <p className="text-white text-center text-lg font-medium">{t.classDetails.latestNews}</p>
                <div className="flex items-center justify-center gap-6">
                  <a
                    href="https://www.instagram.com/tsetsegs.talent.agency/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 rounded-full bg-gold/20 hover:bg-gold/30 border-2 border-gold flex items-center justify-center transition-all hover:scale-110"
                  >
                    <Instagram className="w-8 h-8 text-gold" />
                  </a>
                  <a
                    href="https://www.facebook.com/tsetsegs.agency"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-16 h-16 rounded-full bg-gold/20 hover:bg-gold/30 border-2 border-gold flex items-center justify-center transition-all hover:scale-110"
                  >
                    <Facebook className="w-8 h-8 text-gold" />
                  </a>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {currentPanel >= 0 && language && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 flex gap-2 z-50 w-full max-w-md px-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 h-1 bg-gold/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gold"
                initial={{ width: "0%" }}
                animate={{ width: currentPanel > i ? "100%" : currentPanel === i ? "100%" : "0%" }}
                transition={{ duration: currentPanel === i ? 6 : 0.3 }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentReveal;

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronLeft, ChevronRight, Flower2, Trophy, TrendingUp, Users, BookOpen, Target } from "lucide-react";
import { Counter } from "@/components/reactbits";
import ReactConfetti from "react-confetti";

interface WrappedData {
  batchName: string;
  teacherName: string;
  courseType: string;
  totalStudents: number;
  totalSessionsHeld: number;
  classAttendanceRate: number;
  totalQuestionsAttempted: number;
  homeworkCompletionRate: number;
  avgFirstMock: number;
  avgHighestMock: number;
  topImprovers: { name: string; improvement: number }[];
  topAttender: { name: string; rate: number } | null;
  mostImproved: { name: string; from: number; to: number } | null;
}

const TOTAL_SLIDES = 7;

export default function TeacherClassWrapped() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);
  const [data, setData] = useState<WrappedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (batchId) fetchWrappedData();
  }, [batchId]);

  // Confetti on slide 6 (Most Improved)
  useEffect(() => {
    if (currentSlide === 5 && data?.mostImproved) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(t);
    }
  }, [currentSlide, data]);

  const fetchWrappedData = async () => {
    if (!batchId) return;
    try {
      // Fetch batch info
      const { data: batch } = await supabase
        .from("batches")
        .select("batch_name, teacher, course_type")
        .eq("id", batchId)
        .single();

      // Fetch students
      const { data: students } = await supabase
        .from("students")
        .select("id, name")
        .eq("batch_id", batchId);

      const studentIds = students?.map(s => s.id) || [];
      const totalStudents = studentIds.length;

      // Fetch attendance
      const { data: attendance } = await supabase
        .from("attendance")
        .select("*")
        .eq("batch_id", batchId);

      const maxSession = batch?.course_type === "IELTS" ? 24 : 15;
      let totalSessionsHeld = 0;
      // Find the highest session number that has any data
      for (let i = maxSession; i >= 1; i--) {
        const key = `session_${i}` as keyof typeof attendance[0];
        if (attendance?.some(a => a[key] !== null)) {
          totalSessionsHeld = i;
          break;
        }
      }

      // Calculate attendance rate
      let totalPresent = 0;
      let totalPossible = 0;
      attendance?.forEach(a => {
        for (let i = 1; i <= totalSessionsHeld; i++) {
          const key = `session_${i}` as keyof typeof a;
          const val = a[key];
          if (val !== null) {
            totalPossible++;
            if (val === "present" || val === "late") totalPresent++;
          }
        }
      });
      const classAttendanceRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

      // Per-student attendance rate for top attender
      const perStudentAttendance: { name: string; rate: number }[] = [];
      attendance?.forEach(a => {
        let present = 0, possible = 0;
        for (let i = 1; i <= totalSessionsHeld; i++) {
          const key = `session_${i}` as keyof typeof a;
          const val = a[key];
          if (val !== null) {
            possible++;
            if (val === "present" || val === "late") present++;
          }
        }
        const student = students?.find(s => s.id === a.student_id);
        if (student && possible > 0) {
          perStudentAttendance.push({ name: student.name.split(" ")[0], rate: Math.round((present / possible) * 100) });
        }
      });
      const topAttender = perStudentAttendance.sort((a, b) => b.rate - a.rate)[0] || null;

      // Fetch homework
      const { data: homework } = await supabase
        .from("homework")
        .select("completed")
        .eq("batch_id", batchId);

      const homeworkTotal = homework?.length || 0;
      const homeworkDone = homework?.filter(h => h.completed).length || 0;
      const homeworkCompletionRate = homeworkTotal > 0 ? Math.round((homeworkDone / homeworkTotal) * 100) : 0;

      // Fetch student accounts linked to these students
      let totalQuestionsAttempted = 0;
      if (studentIds.length > 0) {
        const { data: accounts } = await supabase
          .from("student_accounts")
          .select("id, linked_student_id")
          .in("linked_student_id", studentIds);

        const accountIds = accounts?.map(a => a.id) || [];
        if (accountIds.length > 0) {
          const { count } = await supabase
            .from("student_attempts")
            .select("id", { count: "exact", head: true })
            .in("student_account_id", accountIds);
          totalQuestionsAttempted = count || 0;
        }
      }

      // Fetch practice tests
      const { data: practiceTests } = await supabase
        .from("practice_tests")
        .select("student_id, test_number, score")
        .eq("batch_id", batchId)
        .not("score", "is", null)
        .order("test_number", { ascending: true });

      // Calculate per-student first and highest mock
      const studentMocks: Record<string, { first: number; highest: number; name: string }> = {};
      practiceTests?.forEach(pt => {
        const student = students?.find(s => s.id === pt.student_id);
        if (!student || pt.score === null) return;
        if (!studentMocks[pt.student_id]) {
          studentMocks[pt.student_id] = { first: pt.score!, highest: pt.score!, name: student.name.split(" ")[0] };
        } else {
          studentMocks[pt.student_id].highest = Math.max(studentMocks[pt.student_id].highest, pt.score!);
        }
      });

      const mockValues = Object.values(studentMocks);
      const avgFirstMock = mockValues.length > 0
        ? Math.round(mockValues.reduce((s, m) => s + m.first, 0) / mockValues.length)
        : 0;
      const avgHighestMock = mockValues.length > 0
        ? Math.round(mockValues.reduce((s, m) => s + m.highest, 0) / mockValues.length)
        : 0;

      // Top improvers
      const improvers = mockValues
        .map(m => ({ name: m.name, improvement: m.highest - m.first }))
        .filter(m => m.improvement > 0)
        .sort((a, b) => b.improvement - a.improvement)
        .slice(0, 3);

      const mostImproved = mockValues.length > 0
        ? mockValues
            .map(m => ({ name: m.name, from: m.first, to: m.highest }))
            .sort((a, b) => (b.to - b.from) - (a.to - a.from))[0] || null
        : null;

      setData({
        batchName: batch?.batch_name || "Class",
        teacherName: batch?.teacher || "",
        courseType: batch?.course_type || "SAT",
        totalStudents,
        totalSessionsHeld,
        classAttendanceRate,
        totalQuestionsAttempted,
        homeworkCompletionRate,
        avgFirstMock,
        avgHighestMock,
        topImprovers: improvers,
        topAttender,
        mostImproved: mostImproved && mostImproved.to > mostImproved.from ? mostImproved : null,
      });
    } catch (err) {
      console.error("Error fetching wrapped data:", err);
    } finally {
      setLoading(false);
    }
  };

  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= TOTAL_SLIDES) return;
    setDirection(index > currentSlide ? 1 : -1);
    setCurrentSlide(index);
  }, [currentSlide]);

  const next = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const prev = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      if (e.key === "Escape") navigate(-1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [next, prev, navigate]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? "100%" : "-100%", opacity: 0 }),
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[hsl(230,40%,8%)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-[hsl(230,40%,8%)] flex items-center justify-center text-white">
        <p>No data available</p>
      </div>
    );
  }

  const slides = [
    // Slide 1: Intro
    <SlideIntro key="intro" batchName={data.batchName} />,
    // Slide 2: The Class
    <SlideTheClass key="class" data={data} />,
    // Slide 3: By The Numbers
    <SlideNumbers key="numbers" data={data} />,
    // Slide 4: Mock Test Journey
    <SlideMockJourney key="mock" data={data} />,
    // Slide 5: Class MVPs
    <SlideMVPs key="mvps" data={data} />,
    // Slide 6: Most Improved
    <SlideMostImproved key="improved" data={data} />,
    // Slide 7: Thank You
    <SlideThankYou key="thanks" data={data} />,
  ];

  return (
    <div className="fixed inset-0 bg-[hsl(230,40%,8%)] overflow-hidden select-none cursor-default">
      {showConfetti && <ReactConfetti recycle={false} numberOfPieces={300} />}
      
      {/* Close button */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={currentSlide}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {slides[currentSlide]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation arrows */}
      {currentSlide > 0 && (
        <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentSlide < TOTAL_SLIDES - 1 && (
        <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 z-40 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Progress dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-2">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentSlide ? "w-8 bg-cyan-400" : "w-2 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Click zones for navigation */}
      <div className="absolute inset-0 z-30 flex">
        <div className="w-1/3 h-full" onClick={prev} />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" onClick={next} />
      </div>
    </div>
  );
}

// ─── Slide Components ───

function SlideIntro({ batchName }: { batchName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 gap-6">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
      >
        <Flower2 className="h-20 w-20 md:h-28 md:w-28 text-cyan-400" strokeWidth={1.5} />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight"
      >
        That's a wrap!
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="text-xl md:text-2xl text-cyan-300 font-medium"
      >
        {batchName}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-sm text-white/40 mt-8"
      >
        Tap to continue →
      </motion.p>
    </div>
  );
}

function SlideTheClass({ data }: { data: WrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 gap-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Users className="h-12 w-12 text-cyan-400 mx-auto mb-2" />
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400/70 font-medium">The Class</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16">
        <StatBlock label="Students" value={data.totalStudents} delay={0.4} />
        <StatBlock label="Sessions Held" value={data.totalSessionsHeld} delay={0.6} />
        <StatBlock label="Attendance Rate" value={data.classAttendanceRate} suffix="%" delay={0.8} />
      </div>
    </div>
  );
}

function SlideNumbers({ data }: { data: WrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 gap-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <BookOpen className="h-12 w-12 text-cyan-400 mx-auto mb-2" />
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400/70 font-medium">By The Numbers</p>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <StatBlock label="Questions Attempted" value={data.totalQuestionsAttempted} delay={0.4} />
        <StatBlock label="Homework Completed" value={data.homeworkCompletionRate} suffix="%" delay={0.6} />
      </div>
    </div>
  );
}

function SlideMockJourney({ data }: { data: WrappedData }) {
  const improvement = data.avgHighestMock - data.avgFirstMock;
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 gap-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <TrendingUp className="h-12 w-12 text-cyan-400 mx-auto mb-2" />
        <p className="text-sm uppercase tracking-[0.3em] text-cyan-400/70 font-medium">Mock Test Journey</p>
      </motion.div>
      {data.avgFirstMock > 0 ? (
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="text-center">
              <p className="text-white/50 text-sm mb-1">Class Average Start</p>
              <Counter value={data.avgFirstMock} className="text-5xl md:text-7xl font-black text-white/60" duration={1.5} />
            </div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="origin-left"
            >
              <div className="flex items-center gap-2">
                <div className="h-[2px] w-12 md:w-24 bg-gradient-to-r from-white/20 to-cyan-400" />
                <TrendingUp className="h-5 w-5 text-cyan-400" />
              </div>
            </motion.div>
            <div className="text-center">
              <p className="text-cyan-400/70 text-sm mb-1">Class Average Best</p>
              <Counter value={data.avgHighestMock} className="text-5xl md:text-7xl font-black text-cyan-400" duration={1.5} />
            </div>
          </div>
          {improvement > 0 && (
            <motion.p
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 }}
              className="text-lg text-emerald-400 font-semibold"
            >
              +{improvement} point class improvement!
            </motion.p>
          )}
        </div>
      ) : (
        <p className="text-white/40 text-lg">No mock test data available</p>
      )}
    </div>
  );
}

function SlideMVPs({ data }: { data: WrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 gap-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Trophy className="h-12 w-12 text-amber-400 mx-auto mb-2" />
        <p className="text-sm uppercase tracking-[0.3em] text-amber-400/70 font-medium">Class MVPs</p>
      </motion.div>
      <div className="space-y-6">
        {data.topImprovers.length > 0 ? (
          <>
            <p className="text-white/50 text-sm">Top Improvers by Score</p>
            <div className="flex flex-col gap-3">
              {data.topImprovers.map((imp, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.2 }}
                  className="flex items-center gap-4 bg-white/5 rounded-xl px-6 py-3"
                >
                  <span className="text-2xl font-black text-amber-400 w-8">{i + 1}</span>
                  <span className="text-white text-lg font-semibold flex-1 text-left">{imp.name}</span>
                  <span className="text-emerald-400 font-bold">+{imp.improvement}</span>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-white/40">No score improvement data</p>
        )}
        {data.topAttender && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="mt-4"
          >
            <p className="text-white/50 text-sm mb-2">🏅 Best Attendance</p>
            <p className="text-white text-xl font-bold">{data.topAttender.name} — {data.topAttender.rate}%</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function SlideMostImproved({ data }: { data: WrappedData }) {
  if (!data.mostImproved) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-8 gap-6">
        <Target className="h-12 w-12 text-cyan-400" />
        <p className="text-white/40 text-xl">No improvement data yet</p>
      </div>
    );
  }
  const { name, from, to } = data.mostImproved;
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 gap-6">
      <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
        <Target className="h-16 w-16 text-cyan-400 mx-auto" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm uppercase tracking-[0.3em] text-cyan-400/70 font-medium"
      >
        Most Improved
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-4xl md:text-6xl font-black text-white"
      >
        {name}
      </motion.h2>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex items-center gap-4"
      >
        <span className="text-3xl font-bold text-white/50">{from}</span>
        <TrendingUp className="h-6 w-6 text-emerald-400" />
        <span className="text-3xl font-bold text-emerald-400">{to}</span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-emerald-400 text-xl font-semibold"
      >
        +{to - from} points! 🎉
      </motion.p>
    </div>
  );
}

function SlideThankYou({ data }: { data: WrappedData }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 gap-6">
      <motion.div
        initial={{ scale: 0, rotate: 180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
      >
        <Flower2 className="h-16 w-16 text-cyan-400" strokeWidth={1.5} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-4xl md:text-6xl font-black text-white"
      >
        Thank You!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-lg text-white/60 max-w-md"
      >
        It's been an amazing journey with {data.batchName}. Keep pushing toward your goals!
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-6"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/50">
          FlowersOS
        </p>
      </motion.div>
    </div>
  );
}

// ─── Shared Stat Block ───

function StatBlock({ label, value, suffix = "", delay = 0 }: { label: string; value: number; suffix?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="text-center"
    >
      <Counter value={value} suffix={suffix} className="text-5xl md:text-7xl font-black text-white" duration={2} />
      <p className="text-white/50 text-sm mt-2 tracking-wide">{label}</p>
    </motion.div>
  );
}

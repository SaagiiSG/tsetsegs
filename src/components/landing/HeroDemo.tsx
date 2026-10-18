import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { MousePointer2, TrendingUp } from "lucide-react";
import { TIER_ASSETS } from "@/components/student/leaderboard/tierAssets";

type L = (mn: string, en: string) => string;
const SCENES = ["question", "score", "rank"] as const;
const WIPE = ["lv-blue", "lv-violet", "lv-pink"];

/** Looping product demo built as real HTML with sample data. */
export function HeroDemo({ text }: { text: L }) {
  const reduce = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [tapped, setTapped] = useState(false);
  useEffect(() => {
    if (reduce) return;
    setTapped(false);
    const a = setTimeout(() => setTapped(true), 1300);
    const b = setTimeout(() => setScene(s => (s + 1) % SCENES.length), 3800);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [scene, reduce]);

  const choices = ["x = 2", "x = 4", "x = 6", "x = 8"];
  return (
    <div className="lv-tray lv-float relative mx-auto w-full max-w-md">
      <div className="lv-screen relative h-[340px] overflow-hidden p-5">
        <AnimatePresence mode="wait">
          <motion.div key={scene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .3 }} className="h-full">
            {SCENES[scene] === "question" && (
              <div className="relative h-full">
                <span className="lv-blue rounded-full px-3 py-1 text-xs font-medium">{text("Алгебр · Дунд", "Algebra · Medium")}</span>
                <p className="mt-4 font-medium">{text("Хэрэв 3x − 4 = 8 бол x хэд вэ?", "If 3x − 4 = 8, what is x?")}</p>
                <div className="mt-4 grid gap-2">
                  {choices.map((c, i) => (
                    <motion.div key={c} animate={i === 1 && tapped ? { scale: [0.96, 1] } : {}} className={`rounded-full border-2 px-4 py-2 font-mono text-sm transition-colors duration-200 ${i === 1 && tapped ? "lv-green border-transparent" : "border-border"}`}>
                      {String.fromCharCode(65 + i)}. {c}
                    </motion.div>
                  ))}
                </div>
                {!reduce && <motion.div className="absolute" initial={{ left: "85%", top: "95%" }} animate={{ left: "40%", top: "52%" }} transition={{ duration: .6, ease: "easeOut", delay: .5 }}><MousePointer2 className="h-6 w-6 fill-foreground" /></motion.div>}
                {tapped && <motion.span className="lv-green absolute right-2 top-[45%] rounded-full px-3 py-1 font-mono text-sm font-semibold" initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 1, 0], y: -40 }} transition={{ duration: .8 }}>+10</motion.span>}
              </div>
            )}
            {SCENES[scene] === "score" && (
              <div className="flex h-full flex-col justify-center text-center">
                <p className="text-sm text-muted-foreground">{text("Таамагласан SAT Math", "Predicted SAT Math")}</p>
                <motion.p className="mt-2 font-mono text-7xl font-semibold tracking-tight" initial={{ opacity: .4 }} animate={{ opacity: 1 }}>{tapped ? 690 : 620}</motion.p>
                <span className="lv-green mx-auto mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium"><TrendingUp className="h-4 w-4" />{text("өсөж байна +70", "rising +70")}</span>
                <div className="mx-auto mt-6 flex h-16 items-end gap-1.5">{[30, 38, 35, 46, 50, 58, 62, 70].map((h, i) => <motion.div key={i} className="lv-blue w-5 rounded-t-md" initial={{ height: 0 }} animate={{ height: h }} transition={{ delay: i * .06 }} />)}</div>
              </div>
            )}
            {SCENES[scene] === "rank" && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <motion.img src={TIER_ASSETS.diamond.image} alt="" className="h-32 w-32 object-contain" initial={{ scale: .6, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", damping: 14 }} />
                <p className="mt-3 text-sm uppercase tracking-widest text-muted-foreground">{text("Зэрэг ахилаа", "Rank up")}</p>
                <p className="lv-h2 !text-4xl">Diamond</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        {!reduce && (
          <motion.div key={`w${scene}`} className={`${WIPE[scene]} pointer-events-none absolute inset-y-0 -left-1/4 w-[150%] -skew-x-12`} initial={{ x: "-110%" }} animate={{ x: "110%" }} transition={{ duration: .7, ease: "easeInOut" }} />
        )}
      </div>
    </div>
  );
}

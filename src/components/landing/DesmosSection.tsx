import { motion, useReducedMotion } from "framer-motion";

type T = (mon: string, eng: string) => string;

/** On both landing pages; each page passes its own chips. */
export function DesmosSection({ text, chips }: { text: T; chips: { l: string | null; c: string }[] }) {
  const reduce = useReducedMotion();
  const reveal = reduce ? {} : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: .4 } };
  const shown = chips.filter(x => x.l);
  return (
    <section id="desmos" className="scroll-mt-20 py-20"><motion.div {...reveal} className="lv-container"><div className="max-w-3xl">
      <h2 className="lv-h2">{text("Desmos-оор SAT математикийг секундэд", "SAT math in seconds, with Desmos")}</h2>
      <p className="lv-lead mt-4">{text("Desmos дижитал SAT-д суулгагдсан. Манай багш нар SAT математикийг түүгээр секундэд бодож, сурагчдадаа ч мөн адил заадаг. Тэдний бичсэн математикийн тайлбар Desmos-ын товчлолыг боломжтой бүх газарт харуулдаг.", "Desmos is built into the digital SAT. Our teachers use it to solve SAT math in seconds and teach their students to do the same. Their math explanations show the Desmos shortcut wherever there is one.")}</p>
      {shown.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{shown.map(x => <span key={x.l} className={`${x.c} rounded-full px-4 py-2 text-sm font-medium`}>{x.l}</span>)}</div>}
    </div></motion.div></section>
  );
}

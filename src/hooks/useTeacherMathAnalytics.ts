import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WindowKey = "7d" | "30d" | "all";

export interface StudentTopicStat {
  studentId: string;
  name: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface TopicStat {
  topic: string;
  domain: DomainKey;
  attempts: number;
  correct: number;
  accuracy: number;
  studentsTried: number;
  studentsTotal: number;
  priorAccuracy: number | null;
  priorAttempts: number;
  delta: number | null;
  students: StudentTopicStat[];
}

export type DomainKey = "algebra" | "advanced" | "data" | "geometry" | "other";

export interface DomainStat {
  key: DomainKey;
  label: string;
  attempts: number;
  correct: number;
  accuracy: number;
  topics: TopicStat[];
}

export interface AnalyticsResult {
  domains: DomainStat[];
  weakest: TopicStat[];
  drops: TopicStat[];
  strongest: TopicStat[];
  totalAttempts: number;
  totalStudents: number;
}

export const DOMAIN_LABEL: Record<DomainKey, string> = {
  algebra: "Algebra",
  advanced: "Advanced Math",
  data: "Problem-Solving & Data",
  geometry: "Geometry & Trig",
  other: "Other",
};

const SUBTOPIC_TO_DOMAIN: Record<string, DomainKey> = {
  "Linear equations in one variable": "algebra",
  "Linear equations in two variables": "algebra",
  "Linear functions": "algebra",
  "Linear inequalities in one or two variables": "algebra",
  "Systems of two linear equations in two variables": "algebra",
  "Equivalent expressions": "advanced",
  "Nonlinear equations in one variable and systems of equations in two variables": "advanced",
  "Nonlinear functions": "advanced",
  "Functions": "advanced",
  "Quadratic equations": "advanced",
  "Solving quadratic equations": "advanced",
  "Parabolas and Vertex Form": "advanced",
  "Ratios, rates, proportional relationships, and units": "data",
  "Percentages": "data",
  "One-variable data: Distributions and measures of center and spread": "data",
  "Two-variable data: Models and scatterplots": "data",
  "Probability and conditional probability": "data",
  "Inference from sample statistics and margin of error": "data",
  "Evaluating statistical claims: Observational studies and experiments": "data",
  "Interpreting data": "data",
  "Interpreting relationships shown by data": "data",
  "Area and volume": "geometry",
  "Circles": "geometry",
  "Lines, angles, and triangles": "geometry",
  "Right triangles and trigonometry": "geometry",
};

function classifyDomain(topic: string): DomainKey {
  if (SUBTOPIC_TO_DOMAIN[topic]) return SUBTOPIC_TO_DOMAIN[topic];
  const t = topic.toLowerCase();
  if (/(linear|inequal|system)/.test(t)) return "algebra";
  if (/(quadratic|function|nonlinear|expression|parabola|polynomial|exponent|radical)/.test(t)) return "advanced";
  if (/(ratio|percent|probab|data|statistic|inference|scatter|sample)/.test(t)) return "data";
  if (/(triangle|circle|angle|area|volume|geometry|trigon)/.test(t)) return "geometry";
  return "other";
}

const MIN_ATTEMPTS = 10;

function windowDays(w: WindowKey): number | null {
  if (w === "7d") return 7;
  if (w === "30d") return 30;
  return null;
}

export function useTeacherMathAnalytics(params: {
  batchIds: string[];
  window: WindowKey;
  enabled: boolean;
}) {
  const { batchIds, window: w, enabled } = params;
  return useQuery({
    queryKey: ["teacher-math-analytics", batchIds.slice().sort().join(","), w],
    enabled: enabled && batchIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<AnalyticsResult> => {
      // 1. Students in these batches
      const { data: students } = await supabase
        .from("students")
        .select("id, name, batch_id")
        .in("batch_id", batchIds);
      const studentList = students || [];
      if (!studentList.length) {
        return { weakest: [], drops: [], strongest: [], totalAttempts: 0, totalStudents: 0 };
      }
      const studentIds = studentList.map((s) => s.id);
      const nameById: Record<string, string> = {};
      studentList.forEach((s) => (nameById[s.id] = s.name));

      // 2. Their accounts
      const { data: accounts } = await supabase
        .from("student_accounts")
        .select("id, linked_student_id")
        .in("linked_student_id", studentIds);
      const accountList = accounts || [];
      if (!accountList.length) {
        return { weakest: [], drops: [], strongest: [], totalAttempts: 0, totalStudents: studentList.length };
      }
      const studentByAccount: Record<string, string> = {};
      accountList.forEach((a) => {
        if (a.linked_student_id) studentByAccount[a.id] = a.linked_student_id;
      });
      const accountIds = accountList.map((a) => a.id);

      // 3. Attempts (fetch generously; page if needed later)
      const days = windowDays(w);
      const currentStart = days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
      const priorStart = days ? new Date(Date.now() - 2 * days * 86_400_000).toISOString() : null;

      // Fetch attempts across full window (including prior for drops)
      let attemptsQ = supabase
        .from("student_attempts")
        .select("student_account_id, question_id, is_correct, attempt_number, attempted_at")
        .in("student_account_id", accountIds)
        .eq("attempt_number", 1);
      if (priorStart) attemptsQ = attemptsQ.gte("attempted_at", priorStart);

      const { data: attempts, error: aErr } = await attemptsQ.limit(20000);
      if (aErr) throw aErr;
      const attemptList = attempts || [];
      if (!attemptList.length) {
        return { weakest: [], drops: [], strongest: [], totalAttempts: 0, totalStudents: studentList.length };
      }

      // 4. Questions for topic + subject filter
      const qIds = Array.from(new Set(attemptList.map((a) => a.question_id)));
      const questionTopic: Record<string, string> = {};
      // Chunk in 400s to stay under URL limits
      for (let i = 0; i < qIds.length; i += 400) {
        const chunk = qIds.slice(i, i + 400);
        const { data: qs } = await supabase
          .from("questions")
          .select("id, subject, subtopic, skill")
          .in("id", chunk);
        (qs || []).forEach((q: any) => {
          const isMath = !q.subject || q.subject === "math";
          if (!isMath) return;
          const t = (q.subtopic && q.subtopic !== "null" ? q.subtopic : null) || q.skill;
          if (t) questionTopic[q.id] = t;
        });
      }

      // 5. Aggregate
      type Bucket = {
        attempts: number;
        correct: number;
        priorAttempts: number;
        priorCorrect: number;
        perStudent: Record<string, { attempts: number; correct: number }>;
      };
      const buckets: Record<string, Bucket> = {};
      const bucket = (topic: string): Bucket =>
        (buckets[topic] ||= {
          attempts: 0,
          correct: 0,
          priorAttempts: 0,
          priorCorrect: 0,
          perStudent: {},
        });

      attemptList.forEach((a: any) => {
        const topic = questionTopic[a.question_id];
        if (!topic) return;
        const sid = studentByAccount[a.student_account_id];
        if (!sid) return;
        const b = bucket(topic);
        const ts = a.attempted_at;
        const inCurrent = !currentStart || ts >= currentStart;
        const inPrior = priorStart && ts >= priorStart && (!currentStart || ts < currentStart);

        if (inCurrent) {
          b.attempts += 1;
          if (a.is_correct) b.correct += 1;
          const s = (b.perStudent[sid] ||= { attempts: 0, correct: 0 });
          s.attempts += 1;
          if (a.is_correct) s.correct += 1;
        } else if (inPrior) {
          b.priorAttempts += 1;
          if (a.is_correct) b.priorCorrect += 1;
        }
      });

      const stats: TopicStat[] = Object.entries(buckets)
        .filter(([_, b]) => b.attempts >= MIN_ATTEMPTS)
        .map(([topic, b]) => {
          const accuracy = b.attempts ? b.correct / b.attempts : 0;
          const priorAccuracy = b.priorAttempts >= MIN_ATTEMPTS ? b.priorCorrect / b.priorAttempts : null;
          const delta = priorAccuracy === null ? null : accuracy - priorAccuracy;
          const students: StudentTopicStat[] = Object.entries(b.perStudent).map(([sid, s]) => ({
            studentId: sid,
            name: nameById[sid] || "Unknown",
            attempts: s.attempts,
            correct: s.correct,
            accuracy: s.attempts ? s.correct / s.attempts : 0,
          }));
          return {
            topic,
            attempts: b.attempts,
            correct: b.correct,
            accuracy,
            studentsTried: students.length,
            studentsTotal: studentList.length,
            priorAccuracy,
            priorAttempts: b.priorAttempts,
            delta,
            students: students.sort((a, b) => a.accuracy - b.accuracy),
          };
        });

      const weakest = [...stats].sort((a, b) => a.accuracy - b.accuracy).slice(0, 8);
      const strongest = [...stats].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
      const drops = stats
        .filter((s) => s.delta !== null && s.delta < -0.08)
        .sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0))
        .slice(0, 6);

      return {
        weakest,
        drops,
        strongest,
        totalAttempts: attemptList.length,
        totalStudents: studentList.length,
      };
    },
  });
}

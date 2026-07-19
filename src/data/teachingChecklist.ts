// SAT Math Teaching SOP checklist
// Source: internal teachers' handbook. Edit freely — item_key values are
// persisted in `teaching_checklist_progress` so keep them stable.

export interface ChecklistItem {
  key: string; // stable id, persisted
  label: string;
}

export interface ChecklistTopic {
  number: number;
  key: string; // used as prefix for item keys
  title: string;
  minutes?: string; // e.g. "10-15 min"
  items: ChecklistItem[];
}

const t = (
  number: number,
  key: string,
  title: string,
  minutes: string | undefined,
  items: [string, string][]
): ChecklistTopic => ({
  number,
  key,
  title,
  minutes,
  items: items.map(([k, label]) => ({ key: `${key}.${k}`, label })),
});

export const TEACHING_TOPICS: ChecklistTopic[] = [
  t(1, "exponents-radicals", "Exponent and Radicals", "10-15 min", [
    ["table", "Table from the first page"],
    ["desmos-graph", "Desmos — matching the graph"],
    ["examples", "Examples"],
  ]),
  t(2, "expression", "Expression", "5-10 min", [
    ["first-3-formula", "First 3 formulas from the 7"],
    ["examples-avlaga", "Examples from the first gariin avlaga"],
  ]),
  t(3, "manipulating-linear", "Manipulating Linear Equations & Models", "10-15 min", [
    ["in-terms-of", "In terms of …"],
    ["desmos-shavriin", "Desmos — shavriin haaltig orluulah"],
    ["desmos-graph-matching", "Desmos — graph matching"],
  ]),
  t(4, "other-equations", "Other types of equations", "30-40 min", [
    ["matching-terms", "Matching terms"],
    ["one-solution", "One solution"],
    ["no-solution", "No solution"],
    ["infinitely-many", "Infinitely many solutions"],
    ["absolute-value", "Absolute value"],
    ["desmos-random", "Desmos — x1 = random(100)"],
  ]),
  t(5, "functions", "Functions", "40-50 min", [
    ["what-is-function", "What is a function? Input x → output y"],
    ["double-functions", "Double functions"],
    ["desmos-input-output", "Function in Desmos — input & output"],
    ["min-max", "Min / Max of function"],
    ["intercepts", "X, Y intercept of the graph"],
    ["factor-solutions", "Factor form ↔ solutions"],
  ]),
  t(6, "lines-linear", "Lines & Linear Relationship", "40-50 min", [
    ["ymxb", "y = mx + b — explain the formula"],
    ["slope", "Explain the slope"],
    ["slope-comparison", "Greater slope → closer to y-axis (and vice versa)"],
    ["parallel", "Parallel lines"],
    ["perpendicular", "Perpendicular lines"],
    ["exercise-1-12", "Exercise 1–12 (timed 12 min → explain)"],
  ]),
  t(7, "linear-relationship", "Linear Relationship", undefined, [
    ["input-output", "Understand input → output"],
    ["total-cost", "Total cost = (# x items × price x) + (# y items × price y)"],
    ["examples-handbook", "Examples from the handbook"],
  ]),
  t(8, "percent", "Percent", undefined, [
    ["three-formula", "The three main formulas"],
    ["why-multiply", "Why multiplying > traditional proportion"],
    ["example-8-9", "Example 8, 9 — increasing/decreasing → what?"],
    ["book-one-move", "The book problem with one move"],
    ["desmos-method", "[ ] ~ [ ] Desmos method"],
  ]),
  t(9, "exponential-vs-linear", "Exponential vs Linear Functions", undefined, [
    ["formula", "Explain the formula a(b)^(t/k)"],
    ["example-1-6", "Example 1 to 6"],
    ["examples-handbook", "Examples from the handbook"],
  ]),
  t(12, "quadratic-equation", "Quadratic Equation", undefined, [
    ["example-1-desmos", "Example 1 — Desmos"],
    ["formula", "Explain ax² + bx + c"],
    ["a-parabola", "a (+/-) parabola up/down (min/max — vertex)"],
    ["c-yintercept", "c — y-intercept of the parabola"],
    ["x1-method", "The x1 = [ ] method"],
    ["sum-solutions", "Sum of solutions ( -b/a )"],
    ["product-solutions", "Product of solutions ( c/a )"],
    ["example-5", "Example 5"],
  ]),
  t(13, "systems", "Systems of Equations", undefined, [
    ["lead-known", "Lead with: this is something you already know"],
    ["solution", "Solution"],
    ["no-solution", "No solution"],
    ["infinitely-many", "Infinitely many solutions"],
    ["other-types", "Other types — example 4, 5"],
    ["word-problems", "System of equations word problems"],
  ]),
  t(14, "inequalities", "Inequalities", undefined, [
    ["desmos", "Show it on Desmos"],
    ["system-inequalities", "System of inequalities"],
    ["nomore-atleast", "No more / at least / more than / less than"],
    ["word-problems", "Inequalities word problems"],
    ["minmax-word", "Min/Max word problems"],
  ]),
  t(15, "function-transformers", "Function Transformers", undefined, [
    ["up", "Upward"],
    ["down", "Downward"],
    ["right", "Right"],
    ["left", "Left"],
  ]),
  t(16, "quadratic-functions", "Quadratic Functions", undefined, [
    ["vertex-formula", "Vertex formula"],
    ["names", "Solutions, roots, function zeros, x-intercepts (y=0)"],
    ["example-1-12", "Example 1–12 (12 min speed → explain)"],
  ]),
  t(17, "angles", "Angles", undefined, [
    ["types", "Acute, obtuse, straight, right angle"],
    ["exterior-theorem", "Exterior angle theorem"],
    ["polygon", "Polygon 180(n-2)"],
    ["polygon-each", "(180(n-2))/n"],
    ["parallel-lines", "Parallel line angles — real-SAT examples"],
  ]),
  t(18, "triangles", "Triangles", undefined, [
    ["types", "Types of triangles"],
    ["45-45-90", "45-45-90"],
    ["30-60-90", "30-60-90"],
    ["pythag", "Pythagorean theorem"],
    ["congruent", "Congruent (ASA, SAS, SSS)"],
    ["similar", "Similar (SAS, SSS, AA(A))"],
    ["ratio-sides", "Ratio of relative sides must be equal"],
    ["angles-equal", "All inner angles must be equal"],
    ["euclid", "Euclidean theorem"],
    ["last-example", "Last example of the triangle topic"],
  ]),
  t(19, "circles", "Circles", undefined, [
    ["area", "Area"],
    ["circumference", "Circumference"],
    ["arc-measure", "Arc measure"],
    ["arc-length", "Arc length"],
    ["two-arc-formula", "Two formulas of the arc"],
    ["inscribed", "Angle inscribed in a circle (and semicircle)"],
    ["problem-68", "The problem from 68"],
    ["radius-tangent", "Radius drawn to tangent line"],
    ["tangent-segments", "Tangent segments to a circle"],
    ["example-3", "Example 3"],
    ["circle-equation", "Circle equation"],
    ["example-4-5", "Example 4, 5"],
  ]),
  t(20, "radians", "Radians", undefined, [
    ["rad-to-angle", "Radians to angle"],
    ["angle-to-rad", "Angle to radians"],
    ["problem-68", "Problem from 68"],
  ]),
  t(21, "trigonometry", "Trigonometry", undefined, [
    ["sin", "Sin"],
    ["cos", "Cos"],
    ["tan", "Tan"],
    ["sohcahtoa", "SOH-CAH-TOA"],
    ["sin-cos-acute", "Sin and cos of two acute angles are equal"],
  ]),
  t(22, "area-perimeter-volume", "Area, Perimeter & Volume", undefined, [
    ["rect-prism", "Rectangular prism"],
    ["cube", "Cube"],
    ["cylinder", "Right cylinder"],
    ["pyramid", "Right-base pyramid"],
    ["pyramid-pythag", "Pyramid — Pythagorean theorem"],
    ["cone", "Cone"],
    ["cone-pythag", "Cone — Pythagorean theorem"],
    ["similar-shapes", "Similar shapes x and x²"],
  ]),
  t(23, "reading-data", "Reading Data", undefined, [
    ["avg-rate-change", "Average rate of change"],
  ]),
  t(24, "probability", "Probability", undefined, [
    ["what-where", "What we're picking / where from"],
    ["conditional", "Conditional probability"],
    ["given-that", "Given that … what fraction of the …"],
  ]),
  t(25, "statistics-1", "Statistics I", undefined, [
    ["mean", "Mean"],
    ["median", "Median"],
    ["range", "Range"],
    ["histogram", "Histogram"],
    ["stdev", "Standard deviation"],
    ["boxplot", "Boxplot"],
  ]),
  t(26, "statistics-2", "Statistics II", undefined, [
    ["manager-lazy", "\"Manager getting lazy\" problem"],
    ["margin-error", "Margin of error"],
  ]),
];

// ── Session mapping ────────────────────────────────────────────────
// Edit this array to redefine which topic numbers belong to each session.
// The "By Session" view groups topics using this map. First pass groups
// by rough time budget of ~90 min per session.

export interface SessionDef {
  number: number;
  title: string;
  topicNumbers: number[];
}

export const SESSIONS: SessionDef[] = [
  { number: 1, title: "Session 1", topicNumbers: [1, 2, 3] },
  { number: 2, title: "Session 2", topicNumbers: [4, 5, 15] },
  { number: 4, title: "Session 4", topicNumbers: [6, 7] },
  { number: 6, title: "Session 6", topicNumbers: [12, 16, 13] },
  { number: 7, title: "Session 7", topicNumbers: [8, 9, 14] },
  { number: 8, title: "Session 8", topicNumbers: [17, 20, 24] },
  { number: 9, title: "Session 9", topicNumbers: [19, 20, 23] },
  { number: 10, title: "Session 10", topicNumbers: [21, 22, 25, 26] },
];


export const ALL_ITEM_KEYS: string[] = TEACHING_TOPICS.flatMap((t) => t.items.map((i) => i.key));

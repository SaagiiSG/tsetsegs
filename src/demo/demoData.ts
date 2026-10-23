export const demoQuestions = [
  { text: 'If $3x + 5 = 20$, what is the value of $x$?', options: ['3', '5', '7', '15'], topic: 'Algebra', difficulty: 'medium', explanation: 'Subtract 5 from both sides: $3x = 15$. Divide by 3: $x = 5$.' },
  { text: 'A line has slope $2$ and passes through $(0, 3)$. Which equation represents the line?', options: ['$y = 3x + 2$', '$y = 2x - 3$', '$y = 2x + 3$', '$y = x + 3$'], topic: 'Algebra', difficulty: 'medium', explanation: 'In $y = mx + b$, the slope is $m = 2$ and the intercept is $b = 3$.' },
  { text: 'What is the positive solution to $x^2 - 9 = 0$?', options: ['3', '9', '18', '81'], topic: 'Advanced Math', difficulty: 'hard', explanation: '$x^2 = 9$, so $x = 3$ or $x = -3$. The positive solution is $3$.' },
  { text: 'A right triangle has legs of length $6$ and $8$. What is the length of its hypotenuse?', options: ['7', '8', '9', '10'], topic: 'Geometry & Trig', difficulty: 'medium', explanation: 'The Pythagorean theorem gives $c = \\sqrt{6^2 + 8^2} = \\sqrt{100} = 10$.' },
  { text: 'The mean of $4, 6, 8$ and $k$ is $7$. What is $k$?', options: ['8', '10', '12', '14'], topic: 'Problem Solving & Data', difficulty: 'hard', explanation: 'The total must be $4 \\times 7 = 28$. Since $4 + 6 + 8 = 18$, $k = 10$.' },
  { text: 'If $f(x) = 2x^2 + 1$, what is $f(3)$?', options: ['7', '13', '19', '37'], topic: 'Advanced Math', difficulty: 'hard', explanation: '$f(3) = 2(3)^2 + 1 = 18 + 1 = 19$.' },
] as const;

export const demoStudents = [
  { name: 'Alex Morgan', points: 2840, accuracy: 84, tier: 'Gold' },
  { name: 'Mia Chen', points: 3120, accuracy: 91, tier: 'Gold' },
  { name: 'Noah Patel', points: 2470, accuracy: 78, tier: 'Silver' },
  { name: 'Emma Wilson', points: 2210, accuracy: 75, tier: 'Silver' },
  { name: 'Liam Kim', points: 1950, accuracy: 71, tier: 'Bronze' },
];
export const demoLessons = [
  { id: 'exponents', name: 'Laws of exponents', math: '$x^a \\cdot x^b = x^{a+b}$', text: 'When multiplying powers with the same base, add the exponents.', example: '$2^3 \\cdot 2^2 = 2^5 = 32$' },
  { id: 'linear', name: 'Linear equations', math: '$y = mx + b$', text: 'The slope m describes the change in y for each unit of x. The intercept b is where the line crosses the y-axis.', example: '$y = 2x + 3$ has slope $2$ and y-intercept $3$.' },
  { id: 'quadratic', name: 'Quadratic functions', math: '$f(x) = ax^2 + bx + c$', text: 'A quadratic function makes a parabola. If a is positive, the parabola opens upward.', example: '$f(x) = x^2 - 4$ has roots $x = -2$ and $x = 2$.' },
  { id: 'desmos', name: 'Graphing intersections', math: '$y = x^2$ and $y = 2x$', text: 'An intersection satisfies both equations. Set them equal to find its x-coordinate.', example: '$x^2 = 2x$ gives $x(x - 2) = 0$, so $x = 0$ or $x = 2$.' },
  { id: 'geometry', name: 'Right triangles', math: '$a^2 + b^2 = c^2$', text: 'For a right triangle, the square of the hypotenuse equals the sum of the squares of the two legs.', example: '$3^2 + 4^2 = 5^2$' },
];
export type DemoAttempt = { question: number; correct: boolean; seconds: number; createdAt: string };
export type DemoState = { attempts: DemoAttempt[]; attendance: Record<string, string>; classes: { name: string }[]; announcements: { text: string; createdAt: string }[]; completedVideos: string[]; goals: { speed: number; hard: number; medium: number } };
export type DemoSession = { expiresAt: string; state: DemoState };
// College Board's 2026–27 SAT dates. shortcut: the list runs out after Mar 2027, add the next year's dates then.
export const demoSatDates = ['2026-11-07', '2026-12-05', '2027-03-06'];
export const demoHistory = Array.from({ length: 14 }, (_, i) => ({ day: `Day ${i + 1}`, accuracy: 63 + Math.round(i * 1.8) + (i % 3) * 2, seconds: 110 - i * 3 }));
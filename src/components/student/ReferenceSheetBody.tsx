import { MathText } from '@/components/MathText';

// The SAT Math reference sheet, drawn instead of pictured, so it reflows to any window width and stays sharp.
// Each figure is a 120x90 SVG in currentColor (dark mode for free); labels are italic serif like the Bluebook sheet.

const L = ({ x, y, children, up = false }: { x: number; y: number; children: React.ReactNode; up?: boolean }) => (
  <text x={x} y={y} textAnchor="middle" stroke="none" className="fill-current" style={{ fontFamily: 'KaTeX_Math, "Times New Roman", serif', fontStyle: up ? 'normal' : 'italic', fontSize: up ? 10 : 13 }}>{children}</text>
);
const Fig = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 120 92" className="mx-auto h-auto w-full max-w-[10rem]" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" aria-hidden>{children}</svg>
);
const dash = { strokeDasharray: '3 3' };
const dot = (x: number, y: number) => <circle cx={x} cy={y} r={2.6} className="fill-current" stroke="none" />;

const ITEMS: { name: string; fig: React.ReactNode; math: string[] }[] = [
  { name: 'Circle', math: ['$A = \\pi r^2$', '$C = 2\\pi r$'], fig: <Fig><circle cx={60} cy={46} r={36} />{dot(60, 46)}<path d="M60 46h36" /><L x={79} y={40}>r</L></Fig> },
  { name: 'Rectangle', math: ['$A = \\ell w$'], fig: <Fig><rect x={16} y={28} width={86} height={44} /><L x={59} y={21}>ℓ</L><L x={111} y={54}>w</L></Fig> },
  { name: 'Triangle', math: ['$A = \\tfrac{1}{2}bh$'], fig: <Fig><path d="M12 76 50 14 108 76Z" /><path d="M50 14v62" style={dash} /><path d="M50 69h7v7" /><L x={45} y={48}>h</L><L x={60} y={90}>b</L></Fig> },
  { name: 'Right triangle', math: ['$c^2 = a^2 + b^2$'], fig: <Fig><path d="M26 14v62h80Z" /><path d="M26 69h7v7" /><L x={16} y={49}>b</L><L x={66} y={90}>a</L><L x={73} y={39}>c</L></Fig> },
  { name: '30°-60°-90° triangle', math: ['Special right triangle'], fig: <Fig><path d="M10 72h90V20Z" /><path d="M93 72v-7h7" /><L x={50} y={40}>2x</L><L x={110} y={50}>x</L><L x={55} y={88}>x√3</L><L up x={40} y={69}>30°</L><L up x={91} y={42}>60°</L></Fig> },
  { name: '45°-45°-90° triangle', math: ['Special right triangle'], fig: <Fig><path d="M22 10v64h64Z" /><path d="M22 67h7v7" /><L x={12} y={46}>s</L><L x={54} y={88}>s</L><L x={66} y={38}>s√2</L><L up x={29} y={34}>45°</L><L up x={64} y={70}>45°</L></Fig> },
  { name: 'Rectangular box', math: ['$V = \\ell wh$'], fig: <Fig><path d="M10 38h68v38H10Z" /><path d="M10 38 30 22h68L78 38M98 22v38L78 76" /><L x={44} y={90}>ℓ</L><L x={95} y={76}>w</L><L x={107} y={44}>h</L></Fig> },
  { name: 'Cylinder', math: ['$V = \\pi r^2 h$'], fig: <Fig><ellipse cx={58} cy={24} rx={38} ry={13} /><path d="M20 24v48M96 24v48M20 72a38 13 0 0 0 76 0" /><path d="M20 72a38 13 0 0 1 76 0" style={dash} />{dot(58, 24)}<path d="M58 24h38" /><L x={76} y={21}>r</L><L x={106} y={52}>h</L></Fig> },
  { name: 'Sphere', math: ['$V = \\tfrac{4}{3}\\pi r^3$'], fig: <Fig><circle cx={60} cy={46} r={36} /><path d="M24 46a36 6 0 0 0 72 0" /><path d="M24 46a36 6 0 0 1 72 0" style={dash} />{dot(60, 46)}<path d="M60 46h36" /><L x={79} y={35}>r</L></Fig> },
  { name: 'Cone', math: ['$V = \\tfrac{1}{3}\\pi r^2 h$'], fig: <Fig><path d="M22 74 60 8l38 66M22 74a38 11 0 0 0 76 0" /><path d="M22 74a38 11 0 0 1 76 0M60 74h38" style={dash} /><path d="M60 8v66M60 67h7v7" /><L x={53} y={46}>h</L><L x={80} y={72}>r</L></Fig> },
  { name: 'Rectangular pyramid', math: ['$V = \\tfrac{1}{3}\\ell wh$'], fig: <Fig><path d="M10 76h64l32-20M10 76 56 8l18 68M56 8l50 48" /><path d="M10 76l32-20h64M42 56 56 8M56 8v58" style={dash} /><path d="M56 59h6v7" /><L x={40} y={90}>ℓ</L><L x={97} y={74}>w</L><L x={61} y={48}>h</L></Fig> },
];

const FACTS = [
  'The number of degrees of arc in a circle is 360.',
  'The number of radians of arc in a circle is $2\\pi$.',
  'The sum of the measures in degrees of the angles of a triangle is 180.',
];

export function ReferenceSheetBody() {
  return (
    <div className="space-y-6 p-4">
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-x-4 gap-y-6">
        {ITEMS.map(it => (
          <li key={it.name} className="flex flex-col items-center gap-2 text-center">
            <span className="sr-only">{it.name}</span>{it.fig}
            <div className="text-sm leading-snug">{it.math.map(m => <div key={m}>{m.startsWith('$') ? <MathText text={m} /> : <span className="text-xs font-semibold">{m}</span>}</div>)}</div>
          </li>
        ))}
      </ul>
      <div className="space-y-2 border-t pt-4 text-sm">{FACTS.map(f => <p key={f}><MathText text={f} /></p>)}</div>
    </div>
  );
}

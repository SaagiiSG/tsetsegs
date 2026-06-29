import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Layers, BookOpen, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useSetProgress } from '@/hooks/useSetProgress';
import { BigCompletionRingDialog } from './BigCompletionRingDialog';

const SETS = [
  {
    key: '68' as const,
    label: '68',
    title: '68 Foundational',
    desc: 'The original 68 must-know SAT math questions, drilled to mastery.',
    color: 'hsl(180, 85%, 45%)', // teal
    route: '/practice/dashboard',
    icon: Target,
  },
  {
    key: '150' as const,
    label: '150 Hard',
    title: '150 Hard',
    desc: 'High-difficulty SAT math training. Hardest of the hardest.',
    color: 'hsl(0, 84%, 60%)', // coral
    route: '/practice/dashboard',
    icon: Layers,
  },
  {
    key: 'cb' as const,
    label: 'CB 1074',
    title: 'CollegeBoard 1074',
    desc: 'Full official CollegeBoard question bank — every released question.',
    color: 'hsl(231, 80%, 60%)', // indigo
    route: '/practice/dashboard',
    icon: BookOpen,
  },
];

export function SetProgressIsland() {
  const { data: progress, isLoading } = useSetProgress();
  const navigate = useNavigate();
  const [bigOpen, setBigOpen] = useState(false);

  const rows = [
    { ...SETS[0], counts: progress?.s68 ?? { total: 68, completed: 0, pct: 0 } },
    { ...SETS[1], counts: progress?.s150 ?? { total: 150, completed: 0, pct: 0 } },
    { ...SETS[2], counts: progress?.cb ?? { total: 1074, completed: 0, pct: 0 } },
  ];

  return (
    <>
      <Card className="h-full relative overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setBigOpen(true)}
          className="absolute top-2 right-2 h-8 w-8 z-10 text-muted-foreground hover:text-foreground"
          aria-label="Open big completion ring"
          title="Full completion ring"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <CardContent className="p-3 sm:p-4 h-full flex flex-col">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Question Sets
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-4 min-h-[200px]">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <Popover key={r.key}>
                  <PopoverTrigger asChild>
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      onClick={() => navigate(r.route)}
                      className="group relative flex flex-col items-center justify-end rounded-xl border bg-card/40 p-2 sm:p-3 overflow-hidden hover:shadow-md hover:border-primary/40 transition-all"
                      aria-label={`${r.title}, ${r.counts.pct} percent complete`}
                    >
                      {/* upward-filling bar */}
                      <div className="absolute inset-x-2 bottom-2 top-10 rounded-md overflow-hidden bg-muted/40">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.min(100, r.counts.pct)}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="absolute inset-x-0 bottom-0"
                          style={{ background: `linear-gradient(180deg, ${r.color}cc 0%, ${r.color} 100%)` }}
                        />
                        {/* percentage text inside */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="font-mono font-bold text-base sm:text-lg text-white mix-blend-difference">
                            {r.counts.pct}%
                          </span>
                        </div>
                      </div>
                      {/* icon + label header */}
                      <div className="relative z-10 flex flex-col items-center gap-1 pointer-events-none w-full mb-auto">
                        <Icon className="h-4 w-4" style={{ color: r.color }} />
                        <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide text-foreground/80">
                          {r.label}
                        </span>
                      </div>
                      {/* count footer */}
                      <div className="relative z-10 text-[10px] sm:text-xs font-mono text-muted-foreground pt-1">
                        {isLoading ? '—' : `${r.counts.completed}/${r.counts.total}`}
                      </div>
                    </motion.button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="center">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: r.color }} />
                        <h4 className="font-semibold text-sm">{r.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-mono font-semibold">{r.counts.completed} / {r.counts.total}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full transition-all" style={{ width: `${r.counts.pct}%`, background: r.color }} />
                      </div>
                      <Button size="sm" className="w-full mt-2" onClick={() => navigate(r.route)}>
                        Open practice
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <BigCompletionRingDialog
        open={bigOpen}
        onOpenChange={setBigOpen}
        s68={progress?.s68 ?? { total: 68, completed: 0, pct: 0 }}
        s150={progress?.s150 ?? { total: 150, completed: 0, pct: 0 }}
        cb={progress?.cb ?? { total: 1074, completed: 0, pct: 0 }}
      />
    </>
  );
}

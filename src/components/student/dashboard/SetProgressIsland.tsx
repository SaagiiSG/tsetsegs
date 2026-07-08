import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Target, Layers, BookOpen, Maximize2, ArrowRight } from 'lucide-react';
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
    color: '#22d3ee', // cyan-400
    route: '/practice/dashboard?set=68',
    icon: Target,
  },
  {
    key: '150' as const,
    label: '150 Hard',
    title: '150 Hard',
    desc: 'High-difficulty SAT math training. Hardest of the hardest.',
    color: '#ef4444', // red-500
    route: '/practice/dashboard?set=150',
    icon: Layers,
  },
  {
    key: 'cb' as const,
    label: 'CB',
    title: 'CollegeBoard',
    desc: 'Full official CollegeBoard question bank — every released question.',
    color: '#1e40af', // deep blue
    route: '/practice/dashboard?set=CB',
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
          <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-4 min-h-[240px]">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <Popover key={r.key}>
                  <PopoverTrigger asChild>
                    <motion.button
                      type="button"
                      whileHover={{ y: -2 }}
                      onClick={() => navigate(r.route)}
                      className="group relative h-full w-full flex items-stretch gap-2 sm:gap-3 rounded-xl border bg-card/40 p-2 sm:p-3 overflow-hidden hover:shadow-md hover:border-primary/40 transition-all text-left"
                      aria-label={`${r.title}, ${r.counts.pct} percent complete`}
                    >
                      {/* LEFT: label + count stacked */}
                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 w-full justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Icon className="h-4 w-4 flex-shrink-0" style={{ color: r.color }} />
                            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide text-foreground/90 truncate">
                              {r.label}
                            </span>
                          </div>
                          <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" style={{ color: r.color }} />
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-lg sm:text-xl leading-none" style={{ color: r.color }}>
                            {isLoading ? '—' : `${r.counts.completed}`}
                            <span className="text-muted-foreground text-sm font-normal">/{r.counts.total}</span>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {r.counts.pct}% complete
                          </div>
                        </div>
                      </div>
                      {/* RIGHT: vertical progress bar */}
                      <div className="relative w-3 sm:w-4 rounded-full overflow-hidden bg-muted/50 flex-shrink-0">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.min(100, r.counts.pct)}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="absolute inset-x-0 bottom-0 rounded-full"
                          style={{ background: `linear-gradient(180deg, ${r.color}cc 0%, ${r.color} 100%)` }}
                        />
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

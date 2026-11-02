import { Bookmark, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GridItem = { answered: boolean; marked: boolean };

const Flag = ({ className }: { className?: string }) => (
  <Bookmark aria-label="For Review" className={cn('fill-[var(--bb-red)] text-[var(--bb-red)]', className)} />
);

export function QuestionGrid({ items, current, onPick, size }: {
  items: GridItem[]; current: number | null; onPick(i: number): void; size: 'small' | 'large';
}) {
  const large = size === 'large';
  return (
    <div className={cn('grid justify-center', large ? 'grid-cols-[repeat(auto-fill,40px)] gap-x-8 gap-y-8 md:grid-cols-[repeat(10,40px)]' : 'grid-cols-[repeat(auto-fill,29px)] gap-x-4 gap-y-6 md:grid-cols-[repeat(10,29px)]')}>
      {items.map((it, i) => {
        const isCurrent = current === i;
        const label = `Question ${i + 1}${it.answered ? ', answered' : ''}${it.marked ? ', for review' : ''}`;
        return (
          <div key={i} className="relative">
            {isCurrent && <MapPin aria-hidden className="absolute -top-[21px] left-1/2 h-[17px] w-[17px] -translate-x-1/2" />}
            <button
              type="button"
              aria-label={label}
              aria-current={isCurrent ? 'true' : undefined}
              onClick={() => onPick(i)}
              className={cn(
                'bb-focus relative grid place-items-center font-bold',
                large ? 'h-10 w-10 text-[24px]' : 'h-[29px] w-[29px] text-[18px]',
                it.answered ? 'bb-box-answered bg-[var(--bb-blue)] text-white' : 'border border-dashed border-[var(--bb-ink)] text-[var(--bb-blue)] hover:bg-[var(--bb-bar)]',
              )}
            >
              <span className={cn(isCurrent && 'underline decoration-2 underline-offset-[3px]')}>{i + 1}</span>
              {it.marked && <Flag className={cn('absolute', large ? '-right-2 -top-2 h-5 w-5' : '-right-1.5 -top-1.5 h-4 w-4')} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

const Unanswered = () => <span aria-hidden className="inline-block h-4 w-4 border border-dashed border-[var(--bb-ink)]" />;

export function NavigatorContent({ title, items, current, onPick, onClose, onReviewPage }: {
  title: string; items: GridItem[]; current: number | null; onPick(i: number): void; onClose(): void; onReviewPage(): void;
}) {
  return (
    <div className="px-5 pb-6 pt-4">
      <div className="relative text-center">
        <h2 className="px-8 text-[17px] font-bold md:text-[20px]">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="bb-focus absolute right-0 top-0 rounded p-1"><X className="h-5 w-5" /></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1 border-y border-[#a8a8a8] py-2.5 text-[15px]">
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-[18px] w-[18px]" />Current</span>
        <span className="inline-flex items-center gap-1.5"><Unanswered />Unanswered</span>
        <span className="inline-flex items-center gap-1.5"><Flag className="h-[18px] w-[18px]" />For Review</span>
      </div>
      <div className="mt-8">
        <QuestionGrid items={items} current={current} onPick={onPick} size="small" />
      </div>
      <div className="mt-7 flex justify-center">
        <button type="button" onClick={onReviewPage}
          className="bb-focus h-[32px] rounded-full border-[1.5px] border-[var(--bb-blue)] px-5 text-[15px] font-bold text-[var(--bb-blue)] hover:bg-[var(--bb-bar)]">
          Go to Review Page
        </button>
      </div>
    </div>
  );
}

export function CheckYourWork({ title, items, onPick }: { title: string; items: GridItem[]; onPick(i: number): void }) {
  return (
    <div className="min-h-full bg-[var(--bb-quiet)] px-4 pb-12 pt-8 md:pt-10">
      <div className="mx-auto max-w-[760px] text-center">
        <h2 className="text-[28px] font-normal md:text-[38px]">Check Your Work</h2>
        <p className="mt-5 text-[16px] md:mt-7 md:text-[17px]">On test day, you won’t be able to move on to the next module until time expires.</p>
        <p className="mt-3 text-[16px] md:text-[17px]">For these practice questions, you can click <strong>Next</strong> when you’re ready to move on.</p>
      </div>
      <div className="mx-auto mt-8 max-w-[766px] rounded-[10px] bg-white px-5 pb-10 pt-6 shadow-[0_2px_10px_rgba(0,0,0,.08)] md:px-8 md:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[#a8a8a8] pb-4">
          <h3 className="text-[17px] font-bold md:text-[19px]">{title}</h3>
          <div className="flex items-center gap-5 text-[15px]">
            <span className="inline-flex items-center gap-1.5"><Unanswered />Unanswered</span>
            <span className="inline-flex items-center gap-1.5"><Flag className="h-[18px] w-[18px]" />For Review</span>
          </div>
        </div>
        <div className="mt-8">
          <QuestionGrid items={items} current={null} onPick={onPick} size="large" />
        </div>
      </div>
    </div>
  );
}

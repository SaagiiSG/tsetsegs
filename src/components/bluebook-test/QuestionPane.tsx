import { Bookmark } from 'lucide-react';
import { MathText } from '@/components/MathText';
import { normaliseChoices } from '@/lib/bluebookReview';
import { answerPreview } from '@/lib/bluebookTest';
import { cn } from '@/lib/utils';

/** Grey strip over each question: number square, Mark for Review, and the ABC cross-out toggle. */
export function QuestionHeader({ number, marked, onToggleMark, crossOutMode, onToggleCrossOut }: {
  number: number; marked: boolean; onToggleMark(): void; crossOutMode: boolean; onToggleCrossOut(): void;
}) {
  return (
    <div>
      <div className="flex h-[32px] items-stretch bg-[var(--bb-strip)] pr-1.5">
        <span className="grid min-w-[34px] place-items-center bg-[var(--bb-ink)] px-1.5 text-[17px] font-bold text-white">{number}</span>
        <button type="button" onClick={onToggleMark} aria-pressed={marked}
          className="bb-focus ml-3 inline-flex items-center gap-1.5 rounded text-[16px]">
          <Bookmark className={cn('h-[19px] w-[19px] stroke-[1.75]', marked && 'bb-flag-on fill-[var(--bb-red)] text-[var(--bb-red)]')} />
          <span className={cn(marked && 'underline underline-offset-2')}>Mark for Review</span>
        </button>
        <button type="button" onClick={onToggleCrossOut} aria-pressed={crossOutMode} aria-label="Cross out answer choices"
          className={cn(
            'bb-focus my-auto ml-auto grid h-[25px] w-[29px] place-items-center rounded-[4px] border-[1.5px] border-[var(--bb-ink)]',
            crossOutMode ? 'bg-[var(--bb-blue)] text-white' : 'text-[var(--bb-ink)] hover:bg-white/70',
          )}>
          <span className="relative text-[11px] font-bold leading-none tracking-tight">
            ABC
            <span aria-hidden className="absolute -left-0.5 -right-0.5 top-1/2 h-[1.5px] -rotate-[28deg] bg-current" />
          </span>
        </button>
      </div>
      <div className="bb-rule" />
    </div>
  );
}

const Circle = ({ letter, filled }: { letter: string; filled?: boolean }) => (
  <span className={cn(
    'grid h-6 w-6 shrink-0 place-items-center rounded-full border-[1.5px] border-[var(--bb-choice)] text-[13px] font-bold',
    filled && 'border-[var(--bb-ink)] bg-[var(--bb-blue)] text-white',
  )}>{letter}</span>
);

export function AnswerChoices({ options, images, selected, crossed, crossOutMode, onSelect, onToggleCross }: {
  options: unknown; images: unknown; selected: string | null; crossed: string[]; crossOutMode: boolean;
  onSelect(letter: string): void; onToggleCross(letter: string): void;
}) {
  return (
    <div role="radiogroup" aria-label="Answer choices" className="space-y-4">
      {normaliseChoices(options, images).map(({ letter, text, image }) => {
        const isSel = selected === letter;
        const isCrossed = crossed.includes(letter);
        return (
          <div key={letter} className="flex items-center gap-3">
            <button
              type="button" role="radio" aria-checked={isSel} data-letter={letter}
              onClick={() => { if (isCrossed) onToggleCross(letter); onSelect(letter); }}
              className={cn(
                'bb-focus relative flex min-h-[50px] w-full min-w-0 items-center gap-4 rounded-lg border bg-white px-3 py-2.5 text-left',
                isSel ? 'border-[var(--bb-blue)] shadow-[inset_0_0_0_2px_var(--bb-blue)]' : 'border-[var(--bb-choice)] hover:shadow-[inset_0_0_0_1px_var(--bb-choice)]',
                isCrossed && 'text-[#7a7a7a]',
              )}
            >
              <Circle letter={letter} filled={isSel} />
              <span className={cn('bb-serif min-w-0 flex-1 text-[16px] leading-[1.5]', isCrossed && 'line-through')}>
                {text ? <MathText text={text} /> : null}
                {image && <img src={image} alt={`Answer choice ${letter}`} loading="lazy" className={cn('max-h-40 w-auto object-contain', text && 'mt-2')} />}
              </span>
              {isCrossed && <span aria-hidden className="pointer-events-none absolute -left-1.5 -right-1.5 top-1/2 h-[2px] bg-[var(--bb-choice)]" />}
            </button>
            {crossOutMode && (
              <div className="grid w-9 shrink-0 place-items-center">
                {isCrossed ? (
                  <button type="button" onClick={() => onToggleCross(letter)} aria-label={`Undo cross out ${letter}`}
                    className="bb-focus rounded text-[14px] font-bold underline underline-offset-2">Undo</button>
                ) : (
                  <button type="button" onClick={() => onToggleCross(letter)} aria-label={`Cross out ${letter}`}
                    className="bb-focus relative grid h-6 w-6 place-items-center rounded-full border-[1.5px] border-[var(--bb-ink)] text-[12px] font-bold">
                    {letter}
                    <span aria-hidden className="absolute -left-1.5 -right-1.5 top-1/2 h-[1.5px] bg-[var(--bb-ink)]" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Typed answer for a student-produced response question, with Bluebook's live preview. */
export function GridIn({ value, onChange }: { value: string; onChange(v: string): void }) {
  return (
    <div>
      <div className="inline-block rounded-lg border border-[var(--bb-choice)] bg-white px-3 pb-2 pt-1.5">
        <input
          aria-label="Your answer" value={value} onChange={e => onChange(e.target.value)}
          maxLength={6} autoComplete="off" autoCorrect="off" spellCheck={false}
          className="w-[86px] border-0 border-b-[1.5px] border-[var(--bb-blue)] bg-transparent px-0.5 text-[22px] tracking-wide outline-none"
        />
      </div>
      <p className="bb-serif mt-10 flex items-center gap-2 text-[22px] font-bold">
        Answer Preview: <MathText text={answerPreview(value)} className="font-normal" />
      </p>
    </div>
  );
}

const Chip = ({ children }: { children: string }) => (
  <code className="mx-auto block w-fit rounded bg-[#e6e6e6] px-1 py-px font-mono text-[14px] leading-[1.4]">{children}</code>
);

const EXAMPLES: Array<[string, string[], string[]]> = [
  ['3.5', ['3.5', '3.50', '7/2'], ['31/2', '3 1/2']],
  ['$\\frac{2}{3}$', ['2/3', '.6666', '.6667', '0.666', '0.667'], ['0.66', '.66', '0.67', '.67']],
  ['$-\\frac{1}{3}$', ['-1/3', '-.3333', '-0.333'], ['-.33', '-0.33']],
];

/** Bluebook's directions for typed answers, shown beside the question and inside the Math Directions. */
export function SprDirections() {
  return (
    <div className="bb-serif text-[16px] leading-[1.75]">
      <h2 className="text-[20px] font-bold">Student-produced response directions</h2>
      <ul className="mt-4 list-disc space-y-0.5 pl-[60px]">
        <li>If you find <strong>more than one correct answer</strong>, enter only one answer.</li>
        <li>You can enter up to 5 characters for a <strong>positive</strong> answer and up to 6 characters (including the negative sign) for a <strong>negative</strong> answer.</li>
        <li>If your answer is a <strong>fraction</strong> that doesn’t fit in the provided space, enter the decimal equivalent.</li>
        <li>If your answer is a <strong>decimal</strong> that doesn’t fit in the provided space, enter it by truncating or rounding at the fourth digit.</li>
        <li>If your answer is a <strong>mixed number</strong> (such as <MathText text={'$3\\frac{1}{2}$'} />), enter it as an improper fraction (7/2) or its decimal equivalent (3.5).</li>
        <li>Don’t enter <strong>symbols</strong> such as a percent sign, comma, or dollar sign.</li>
      </ul>
      <table className="mx-auto mt-10 border-collapse text-center text-[16px] leading-[1.6]">
        <caption className="pb-2">Examples</caption>
        <thead>
          <tr>
            <th scope="col" className="w-[110px] border border-[var(--bb-ink)] px-4 py-6 font-normal">Answer</th>
            <th scope="col" className="w-[170px] border border-[var(--bb-ink)] px-4 py-6 font-normal">Acceptable ways to enter answer</th>
            <th scope="col" className="w-[170px] border border-[var(--bb-ink)] px-4 py-6 font-normal">Unacceptable: will NOT receive credit</th>
          </tr>
        </thead>
        <tbody>
          {EXAMPLES.map(([answer, ok, bad]) => (
            <tr key={answer}>
              <td className="border border-[var(--bb-ink)] px-4 py-6"><MathText text={answer} /></td>
              <td className="space-y-1 border border-[var(--bb-ink)] px-4 py-6">{ok.map(v => <Chip key={v}>{v}</Chip>)}</td>
              <td className="space-y-1 border border-[var(--bb-ink)] px-4 py-6">{bad.map(v => <Chip key={v}>{v}</Chip>)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

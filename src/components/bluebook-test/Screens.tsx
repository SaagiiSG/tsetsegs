import { useEffect, useState } from 'react';
import { formatClock } from '@/lib/bluebookTest';
import { DotSpinner } from './BluebookFrame';

/** Between two modules of the same section. */
export function ModuleOver() {
  return (
    <div className="bluebook fixed inset-0 grid place-items-center bg-[var(--bb-quiet)] px-6 text-center">
      <div>
        <h1 className="text-[26px] font-normal text-[var(--bb-blue)] md:text-[30px]">This Module Is Over</h1>
        <div className="mt-6 space-y-4 text-[17px] md:text-[18px]">
          <p>All your work has been saved.</p>
          <p>You’ll move on automatically in just a moment.</p>
          <p>Do not refresh this page or quit the app.</p>
        </div>
        <DotSpinner className="mx-auto mt-14" />
      </div>
    </div>
  );
}

/** Our own line drawing of a laptop sending work up; not College Board's art. */
const UploadLaptop = () => (
  <svg viewBox="0 0 200 170" className="h-[150px] w-[176px] text-[var(--bb-ink)]" aria-hidden fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
    <circle cx="100" cy="88" r="80" fill="#eef3fb" stroke="#dbe5f3" strokeWidth="2" />
    <rect x="44" y="62" width="112" height="72" rx="6" fill="#fff" />
    <path d="M30 140h140l-8 8H38z" fill="#e0e9f5" />
    <path d="M100 116V30m-26 24 26-26 26 26" />
    <path d="M60 104h16m48 0h16M60 116h80" strokeWidth="2" opacity=".35" />
  </svg>
);

export function StandBy({ error, onRetry }: { error: boolean; onRetry(): void }) {
  return (
    <div className="bluebook fixed inset-0 overflow-y-auto bg-[var(--bb-quiet)] px-4 pb-10 pt-12 text-center md:pt-16">
      <h1 className="text-[26px] font-normal md:text-[32px]">Practice Is Over: Stand By!</h1>
      <p className="mx-auto mt-4 max-w-[380px] text-[17px] leading-[1.4] md:text-[18px]">
        All your work has been saved, and we’re uploading it now. Do not refresh this page or quit the app.
      </p>
      <div className="mx-auto mt-6 flex max-w-[456px] flex-col items-center rounded-md bg-white px-6 py-10 shadow-[0_1px_6px_rgba(0,0,0,.1)]">
        {error ? (
          <div role="alert" className="flex flex-col items-center gap-5">
            <p className="text-[17px]">Some answers didn’t save. Check your connection.</p>
            <button type="button" className="bb-pill-blue" onClick={onRetry}>Try again</button>
          </div>
        ) : <DotSpinner />}
        <div className="mt-8"><UploadLaptop /></div>
      </div>
    </div>
  );
}

const BREAK_SECONDS = 600;
const RULES = [
  'Do not disturb students who are still testing.',
  'Do not exit the app or close your laptop.',
  'Do not access phones, smartwatches, textbooks, notes, or the internet.',
  'Do not eat or drink near any testing device.',
  'Do not speak in the testing room; outside the room, do not discuss the exam with anyone.',
];

/** The 10-minute break between Reading & Writing and Math. Resume Testing, or the countdown reaching 0, moves on. */
export function BreakScreen({ studentName, onResume }: { studentName: string; onResume(): void }) {
  const [left, setLeft] = useState(BREAK_SECONDS);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setLeft(Math.max(0, BREAK_SECONDS - Math.floor((Date.now() - started) / 1000))), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (left === 0) onResume(); }, [left, onResume]);

  return (
    <div className="bluebook fixed inset-0 overflow-y-auto bg-[#191919] text-white">
      <div className="mx-auto flex min-h-full max-w-[1100px] flex-col gap-12 px-6 py-12 md:flex-row md:items-start md:gap-24 md:px-16 md:py-24">
        <div className="flex shrink-0 flex-col items-center gap-8 md:w-[300px]">
          <div className="w-full rounded-md border border-white/70 px-6 py-6 text-center">
            <p className="text-[18px]">Remaining Break Time:</p>
            <p className="mt-2 text-[56px] font-bold leading-none tabular-nums">{formatClock(left)}</p>
          </div>
          <button type="button" className="bb-pill-yellow" onClick={onResume}>Resume Testing</button>
        </div>
        <div className="max-w-[460px] text-[17px] leading-[1.5]">
          <h1 className="text-[30px] font-medium tracking-[-0.01em] md:text-[34px]">Practice Test Break</h1>
          <p className="mt-5">You can resume this practice test as soon as you’re ready to move on. On test day, you’ll wait until the clock counts down. Read below to see how breaks work on test day.</p>
          <hr className="my-10 border-white/80" />
          <h2 className="text-[30px] font-medium leading-tight tracking-[-0.01em] md:text-[34px]">Take a Break: Do Not Close Your Device</h2>
          <p className="mt-5">After the break, a <strong>Resume Testing Now</strong> button will appear and you’ll start the next section.</p>
          <p className="mt-6 font-bold">Follow these rules during the break:</p>
          <ol className="mt-4 list-decimal space-y-4 pl-6">
            {RULES.map(r => <li key={r}>{r}</li>)}
          </ol>
        </div>
      </div>
      <p className="fixed bottom-8 left-6 text-[19px] font-medium md:left-12">{studentName}</p>
    </div>
  );
}

/** After the break: the next section waits until the student is ready, with its timer not yet started. */
export function ResumeScreen({ studentName, onResume }: { studentName: string; onResume(): void }) {
  return (
    <div className="bluebook fixed inset-0 grid place-items-center bg-[#191919] px-6 text-center text-white">
      <div>
        <h1 className="text-[28px] font-medium tracking-[-0.01em] md:text-[32px]">Resume Testing Now</h1>
        <p className="mt-4 text-[18px] font-light md:text-[20px]">Your testing timer has not started counting down yet.</p>
        <button type="button" className="bb-pill-yellow mt-8 text-[15px]" onClick={onResume}>Resume Testing</button>
      </div>
      <p className="fixed bottom-8 left-6 text-[19px] font-medium md:left-12">{studentName}</p>
    </div>
  );
}

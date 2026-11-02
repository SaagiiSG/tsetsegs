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

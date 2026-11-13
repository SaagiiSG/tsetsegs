import { Checkbox } from '@/components/ui/checkbox';
import { PRIVACY_URL, TERMS_URL, rememberTick } from '@/lib/terms';

/** The sign-up agreement box (Saagii, 12 Nov 2026). Sign-up buttons stay off until it's ticked; the tick is saved once the student is signed in. */
export function TermsCheck({ checked, onChange }: { checked: boolean; onChange: (on: boolean) => void }) {
  const link = 'underline underline-offset-4 hover:text-foreground';
  return (
    <div className="flex items-start gap-3 text-left text-sm leading-snug text-muted-foreground">
      <Checkbox id="terms-check" className="mt-0.5 h-5 w-5" checked={checked} onCheckedChange={v => { rememberTick(v === true); onChange(v === true); }} />
      <label htmlFor="terms-check">
        I’m 13 or older and agree to the <a className={link} href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms of Use</a> and <a className={link} href={PRIVACY_URL} target="_blank" rel="noopener noreferrer">Privacy Policy</a>. If I’m under 18, my parent or guardian agrees too.
      </label>
    </div>
  );
}

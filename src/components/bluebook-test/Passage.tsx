import { MathText } from '@/components/MathText';

/** The Reading & Writing passage, left of the question. */
export function Passage({ text }: { text: string; attemptId: string; questionId: string }) {
  return (
    <div className="bb-serif text-[16px] leading-[1.5]">
      <MathText text={text} />
    </div>
  );
}

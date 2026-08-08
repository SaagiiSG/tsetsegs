import { cn } from "@/lib/utils";

interface QuestionFiguresProps {
  url1?: string | null;
  url2?: string | null;
  className?: string;
  imgClassName?: string;
  alt?: string;
}

/**
 * Renders a question's figure(s). When a second figure exists the two are shown
 * side by side (stacking on narrow screens).
 */
export const QuestionFigures = ({
  url1,
  url2,
  className,
  imgClassName = "max-h-72 rounded-md border object-contain",
  alt = "Question figure",
}: QuestionFiguresProps) => {
  const urls = [url1, url2].filter(Boolean) as string[];
  if (urls.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-center gap-3",
        className
      )}
    >
      {urls.map((src, i) => (
        <img
          key={src + i}
          src={src}
          alt={urls.length > 1 ? `${alt} ${i + 1}` : alt}
          loading="lazy"
          className={cn(imgClassName, urls.length > 1 && "max-w-[48%]")}
        />
      ))}
    </div>
  );
};

export default QuestionFigures;

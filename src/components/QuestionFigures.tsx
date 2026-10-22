import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { svgDataUrl } from "../../supabase/functions/_shared/svgFigure";

interface QuestionFiguresProps {
  /** questions.figure_svg: a drawn figure, shown instead of the images when present. */
  svg?: string | null;
  /** questions.figure_description: alt text for the figure. */
  description?: string | null;
  url1?: string | null;
  url2?: string | null;
  className?: string;
  imgClassName?: string;
  alt?: string;
  /** One bare <img> sized by imgClassName (the drawing, else the first image), for lists and thumbnails. */
  compact?: boolean;
}

/**
 * Renders a question's figure. A drawn SVG figure wins and is drawn as an <img>
 * from a cleaned data: URL, so it can never run scripts or load anything. Otherwise
 * the image figure(s) show, two side by side (stacking on narrow screens).
 */
export const QuestionFigures = ({
  svg,
  description,
  url1,
  url2,
  className,
  imgClassName = "max-h-72 rounded-md border object-contain",
  alt = "Question figure",
  compact = false,
}: QuestionFiguresProps) => {
  const drawing = useMemo(() => svgDataUrl(svg), [svg]);
  const label = description?.trim() || alt;

  if (compact) {
    // A drawing always gets white behind it, whatever background the caller asks for.
    const src = drawing ?? url1 ?? url2;
    return src ? <img src={src} alt={label} loading="lazy" className={cn(imgClassName, drawing && "bg-white")} /> : null;
  }

  if (drawing) {
    return (
      <div className={cn("flex justify-center", className)}>
        {/* Our drawings are black on white and not theme-aware, so they always sit on a white card. */}
        <div className="w-full max-w-[560px] rounded-lg border bg-white p-3">
          <img src={drawing} alt={label} className="mx-auto block h-auto max-h-[360px] w-full object-contain" />
        </div>
      </div>
    );
  }

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
          alt={urls.length > 1 ? `${label} ${i + 1}` : label}
          loading="lazy"
          className={cn(imgClassName, urls.length > 1 && "max-w-[48%]")}
        />
      ))}
    </div>
  );
};

export default QuestionFigures;

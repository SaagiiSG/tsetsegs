import { useTour } from './TourProvider';
import { cn } from '@/lib/utils';

interface Props {
  featureId: string;
  className?: string;
  /** Optional label shown next to the dot (e.g. "NEW") */
  label?: string;
}

/**
 * Small pulsing "NEW" indicator anchored to a feature. Disappears once
 * the tour step that references it runs, or when tapped directly.
 * Wrap the target element in `position: relative` for correct absolute placement.
 */
export function NewDot({ featureId, className, label }: Props) {
  const { isFeatureAcknowledged, acknowledgeFeature } = useTour();
  if (isFeatureAcknowledged(featureId)) return null;

  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label="New feature"
      onClick={(e) => {
        e.stopPropagation();
        acknowledgeFeature(featureId);
      }}
      className={cn(
        'pointer-events-auto absolute -top-1 -right-1 z-10 flex items-center gap-1',
        className,
      )}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
      </span>
      {label && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded px-1 py-0.5">
          {label}
        </span>
      )}
    </span>
  );
}

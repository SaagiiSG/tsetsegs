import { cn } from '@/lib/utils';
import { Armchair } from 'lucide-react';

interface SeatGridProps {
  totalSeats: number;
  takenSeats: number[];
  selectedSeat: number | null;
  onSelectSeat: (seat: number) => void;
  disabled?: boolean;
  myBookedSeat?: number | null;
}

export function SeatGrid({ totalSeats, takenSeats, selectedSeat, onSelectSeat, disabled, myBookedSeat }: SeatGridProps) {
  // Calculate grid: aim for roughly 8-10 seats per row
  const cols = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(totalSeats * 1.5))));
  const rows = Math.ceil(totalSeats / cols);

  // Build seat array
  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
      {/* Screen / Front indicator */}
      <div className="mx-auto w-3/4 max-w-xs h-2 rounded-b-xl bg-primary/20 mb-2" />
      <p className="text-center text-xs text-muted-foreground -mt-2 mb-4">Front</p>

      {/* Seat grid */}
      <div 
        className="grid gap-2 justify-center mx-auto max-w-lg"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {seats.map(seatNum => {
          const isTaken = takenSeats.includes(seatNum);
          const isSelected = selectedSeat === seatNum;
          const isMine = myBookedSeat === seatNum;

          const isDisabled = disabled || (isTaken && !isMine);
          if (isDisabled) {
            return (
              <div
                key={seatNum}
                role="status"
                aria-label={`Seat ${seatNum} unavailable`}
                className={cn(
                  "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg transition-all duration-200 border select-none touch-none",
                  isMine
                    ? "bg-primary text-primary-foreground border-primary shadow-md"
                    : isTaken
                      ? "bg-muted text-muted-foreground/40 border-muted cursor-not-allowed opacity-50"
                      : "bg-card text-muted-foreground border-border cursor-not-allowed"
                )}
              >
                <Armchair className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5",
                  isMine ? "text-primary-foreground" : isTaken ? "text-muted-foreground/30" : "text-muted-foreground"
                )} />
                <span className="text-[10px] sm:text-xs font-medium mt-0.5">{seatNum}</span>
              </div>
            );
          }

          return (
            <button
              key={seatNum}
              type="button"
              onClick={(e) => {
                onSelectSeat(seatNum);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg transition-all duration-200 border select-none",
                !isDisabled && "hover:scale-105 active:scale-95",
                isDisabled && "pointer-events-none",
                isMine
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : isSelected
                    ? "bg-primary/80 text-primary-foreground border-primary ring-2 ring-primary/30 shadow-lg scale-105"
                    : isTaken
                      ? "bg-muted text-muted-foreground/40 border-muted cursor-not-allowed opacity-50"
                      : disabled
                        ? "bg-card text-muted-foreground border-border cursor-not-allowed"
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
              )}
            >
              <Armchair className={cn(
                "h-4 w-4 sm:h-5 sm:w-5",
                isMine ? "text-primary-foreground" : isSelected ? "text-primary-foreground" : isTaken ? "text-muted-foreground/30" : "text-muted-foreground"
              )} />
              <span className="text-[10px] sm:text-xs font-medium mt-0.5">{seatNum}</span>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded border border-border bg-card" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-muted opacity-50" />
          <span>Taken</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded bg-primary" />
          <span>Your Seat</span>
        </div>
      </div>
    </div>
  );
}

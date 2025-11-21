import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface Batch {
  schedule: string;
  start_date: string;
}

interface StudentSidebarProps {
  students: Student[];
  currentIndex: number;
  onSelectStudent: (index: number) => void;
  batch: Batch | null;
}

export function StudentSidebar({ students, currentIndex, onSelectStudent, batch }: StudentSidebarProps) {
  return (
    <div className="w-64 border-r bg-card h-full">
      <div className="p-4 border-b space-y-3">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Class Info</h3>
        {batch && (
          <div className="space-y-2 text-xs">
            <div>
              <div className="text-muted-foreground">Schedule</div>
              <div className="text-foreground font-medium">{batch.schedule}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Started</div>
              <div className="text-foreground font-medium">
                {new Date(batch.start_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-b">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Students</h3>
      </div>
      <ScrollArea className="h-[calc(100%-200px)]">
        <div className="p-2">
          {students.map((student, index) => {
            const displayName = student.last_name 
              ? `${student.first_name} ${student.last_name.charAt(0)}.`
              : student.first_name;

            return (
              <button
                key={student.id}
                onClick={() => onSelectStudent(index)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors mb-1",
                  currentIndex === index
                    ? "bg-primary text-primary-foreground font-bold"
                    : "hover:bg-muted"
                )}
              >
                {index + 1}. {displayName}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

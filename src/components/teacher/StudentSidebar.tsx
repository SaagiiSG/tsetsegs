import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
}

interface StudentSidebarProps {
  students: Student[];
  currentIndex: number;
  onSelectStudent: (index: number) => void;
}

export function StudentSidebar({ students, currentIndex, onSelectStudent }: StudentSidebarProps) {
  return (
    <div className="w-64 border-r bg-card h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">Students</h3>
      </div>
      <ScrollArea className="h-[calc(100%-60px)]">
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

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CenterProfileView } from './CenterProfileView';

/** Full classmate profile in a large scrolling dialog; the same view as the student's own page. */
export function CenterStudentProfileDialog({ studentId, name, open, onOpenChange }: { studentId: string | null; name: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto overflow-x-hidden p-3 sm:p-6">
        <DialogHeader className="sr-only"><DialogTitle>{name}</DialogTitle><DialogDescription>Student profile</DialogDescription></DialogHeader>
        {open && studentId && <CenterProfileView studentId={studentId} name={name} />}
      </DialogContent>
    </Dialog>
  );
}

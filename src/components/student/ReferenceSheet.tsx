import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import referenceSheetImage from '@/assets/sat-reference-sheet.jpg';

interface ReferenceSheetProps {
  trigger?: React.ReactNode;
}

export function ReferenceSheet({ trigger }: ReferenceSheetProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Reference</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>SAT Math Reference Sheet</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <img 
            src={referenceSheetImage} 
            alt="SAT Math Reference Sheet showing formulas for circles, rectangles, triangles, volumes, and special right triangles"
            className="w-full h-auto rounded-lg border"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

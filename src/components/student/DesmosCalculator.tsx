import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Calculator } from 'lucide-react';

export function DesmosCalculator() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90"
          title="Open Calculator"
        >
          <Calculator className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[500px] sm:max-w-[90vw] p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Desmos Calculator
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-80px)]">
          <iframe
            src="https://www.desmos.com/scientific"
            title="Desmos Scientific Calculator"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DesmosGraphingCalculator() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          title="Open Graphing Calculator"
        >
          <Calculator className="h-4 w-4" />
          Graphing
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-[600px] sm:max-w-[95vw] p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Desmos Graphing Calculator
          </SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-80px)]">
          <iframe
            src="https://www.desmos.com/calculator"
            title="Desmos Graphing Calculator"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
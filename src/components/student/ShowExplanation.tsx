import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExplanationView } from '@/components/explanation/ExplanationView';
import { Lightbulb } from 'lucide-react';

interface Props {
  explanation: string | null | undefined;
  revealed: boolean;
  onReveal: () => void;
  /** True while a correct answer could still earn points — viewing the explanation forfeits them. */
  forfeitApplies: boolean;
  /** True once the forfeit has been recorded (persisted or just confirmed). */
  forfeited: boolean;
  /** When false, only the reveal button renders — the parent displays the explanation itself. */
  inlineCard?: boolean;
}

/**
 * Student-initiated explanation reveal. Available anytime while solving; opening
 * it while the question can still award points forfeits those points (with a
 * confirmation so it never happens by accident).
 */
export function ShowExplanation({ explanation, revealed, onReveal, forfeitApplies, forfeited, inlineCard = true }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!explanation) return null;

  const handleOpen = () => {
    if (forfeitApplies && !forfeited) {
      setConfirmOpen(true);
    } else {
      onReveal();
    }
  };

  if (!revealed) {
    return (
      <>
        <Button variant="outline" onClick={handleOpen} className="w-full gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Show explanation
        </Button>
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Open the explanation?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              The explanation walks through the full solution, so this question will no longer earn
              points. You can still answer it to keep it in your practice history.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Keep thinking
              </Button>
              <Button onClick={() => { setConfirmOpen(false); onReveal(); }}>
                Show anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (!inlineCard) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Explanation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {forfeited && (
          <p className="text-xs text-muted-foreground">
            Explanation opened — this question no longer awards points.
          </p>
        )}
        <ExplanationView text={explanation} />
      </CardContent>
    </Card>
  );
}

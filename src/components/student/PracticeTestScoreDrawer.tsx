import { useState, useEffect } from 'react';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface PracticeTest {
  id: string;
  test_number: number;
  score: number | null;
}

interface PracticeTestScoreDrawerProps {
  trigger?: React.ReactNode;
}

export function PracticeTestScoreDrawer({ trigger }: PracticeTestScoreDrawerProps) {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [scores, setScores] = useState<Record<number, string>>({});

  useEffect(() => {
    if (open && student?.linked_student_id) {
      fetchTests();
    }
  }, [open, student?.linked_student_id]);

  const fetchTests = async () => {
    if (!student?.linked_student_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('practice_tests')
        .select('id, test_number, score')
        .eq('student_id', student.linked_student_id)
        .in('test_number', [1, 2, 3, 4, 5, 6, 7])
        .order('test_number');

      if (error) throw error;

      setTests(data || []);
      const initialScores: Record<number, string> = {};
      data?.forEach(test => {
        initialScores[test.test_number] = test.score?.toString() || '';
      });
      setScores(initialScores);
    } catch (err) {
      console.error('Failed to fetch tests:', err);
      toast.error('Failed to load practice tests');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (testNumber: number, value: string) => {
    // Only allow numbers and empty string
    if (value === '' || /^\d+$/.test(value)) {
      const numValue = parseInt(value);
      // SAT scores are 400-1600
      if (value === '' || (numValue >= 0 && numValue <= 1600)) {
        setScores(prev => ({ ...prev, [testNumber]: value }));
      }
    }
  };

  const handleSave = async () => {
    if (!student?.linked_student_id) return;

    setSaving(true);
    try {
      const updates = tests.map(test => ({
        id: test.id,
        score: scores[test.test_number] ? parseInt(scores[test.test_number]) : null
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('practice_tests')
          .update({ score: update.score })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success('Scores updated successfully');
      queryClient.invalidateQueries({ queryKey: ['student-practice-tests'] });
      queryClient.invalidateQueries({ queryKey: ['student-dashboard-stats'] });
      setOpen(false);
    } catch (err) {
      console.error('Failed to save scores:', err);
      toast.error('Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const getTestLabel = (testNumber: number) => {
    return `Practice Test ${testNumber + 3}`; // Tests 4-10 in display
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Edit Practice Test Scores</DrawerTitle>
            <DrawerDescription>
              Enter your practice test scores (400-1600)
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6, 7].map(testNumber => (
                  <div key={testNumber} className="space-y-1.5">
                    <Label htmlFor={`test-${testNumber}`} className="text-xs">
                      {getTestLabel(testNumber)}
                    </Label>
                    <Input
                      id={`test-${testNumber}`}
                      type="text"
                      inputMode="numeric"
                      placeholder="Score"
                      value={scores[testNumber] || ''}
                      onChange={(e) => handleScoreChange(testNumber, e.target.value)}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DrawerFooter>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Scores
                </>
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

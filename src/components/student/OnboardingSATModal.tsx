import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { toast } from 'sonner';
import { CalendarClock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const generateSATDates = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const satMonths = [
    { month: 2, label: 'March' }, { month: 4, label: 'May' }, { month: 5, label: 'June' },
    { month: 7, label: 'August' }, { month: 8, label: 'September' },
    { month: 9, label: 'October' }, { month: 10, label: 'November' }, { month: 11, label: 'December' },
  ];
  const dates: { value: string; label: string }[] = [];
  [currentYear, currentYear + 1].forEach(year => {
    satMonths.forEach(({ month, label }) => {
      if (year > currentYear || (year === currentYear && month >= currentMonth)) {
        dates.push({ value: `${year}-${String(month + 1).padStart(2, '0')}`, label: `${label} ${year}` });
      }
    });
  });
  return dates;
};

const SAT_TEST_DATES = generateSATDates();

interface OnboardingSATModalProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingSATModal({ open, onClose }: OnboardingSATModalProps) {
  const { student } = useStudentAuth();
  const [selectedDate, setSelectedDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedDate || !student?.linked_student?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ sat_test_month: selectedDate })
        .eq('id', student.linked_student.id);
      if (error) throw error;

      // Mark onboarding completed
      await supabase
        .from('student_accounts')
        .update({ onboarding_completed: true })
        .eq('id', student.id);

      toast.success('SAT date saved!');
      onClose();
      // Reload to refresh context
      window.location.reload();
    } catch (err) {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    // Mark onboarding completed even if skipped
    if (student) {
      await supabase
        .from('student_accounts')
        .update({ onboarding_completed: true })
        .eq('id', student.id);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <CalendarClock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-xl">When is your SAT?</DialogTitle>
          <DialogDescription className="text-center">
            We'll show you a personalized countdown and tailor your practice schedule.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger>
              <SelectValue placeholder="Select your SAT date..." />
            </SelectTrigger>
            <SelectContent>
              {SAT_TEST_DATES.map((date) => (
                <SelectItem key={date.value} value={date.value}>
                  {date.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button className="flex-1" disabled={!selectedDate || saving} onClick={handleSave}>
              {saving ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

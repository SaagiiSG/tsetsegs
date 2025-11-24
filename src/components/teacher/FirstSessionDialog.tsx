import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FirstSessionData {
  phone: string;
  parent_phone: string;
  last_name: string;
  math_level: 'bad' | 'average' | 'good';
  english_level: 'bad' | 'average' | 'good';
}

interface FirstSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  onSubmit: (data: FirstSessionData) => Promise<void>;
}

export function FirstSessionDialog({ open, onOpenChange, studentName, onSubmit }: FirstSessionDialogProps) {
  const [formData, setFormData] = useState<FirstSessionData>({
    phone: '',
    parent_phone: '',
    last_name: '',
    math_level: 'average',
    english_level: 'average',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePhone = (phone: string): boolean => {
    return /^\d{8}$/.test(phone);
  };

  const handleSubmit = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.phone.trim()) {
      newErrors.phone = 'Student phone is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Phone must be exactly 8 digits';
    }

    if (!formData.parent_phone.trim()) {
      newErrors.parent_phone = 'Parent phone is required';
    } else if (!validatePhone(formData.parent_phone)) {
      newErrors.parent_phone = 'Phone must be exactly 8 digits';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
      // Reset form
      setFormData({
        phone: '',
        parent_phone: '',
        last_name: '',
        math_level: 'average',
        english_level: 'average',
      });
      setErrors({});
    } catch (error) {
      console.error('Error submitting first session data:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>First Session Intake - {studentName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Student Phone Number *</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="12345678"
              maxLength={8}
              value={formData.phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, phone: value });
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_phone">Parent Phone Number *</Label>
            <Input
              id="parent_phone"
              type="tel"
              placeholder="12345678"
              maxLength={8}
              value={formData.parent_phone}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, parent_phone: value });
                if (errors.parent_phone) setErrors({ ...errors, parent_phone: '' });
              }}
              className={errors.parent_phone ? 'border-destructive' : ''}
            />
            {errors.parent_phone && <p className="text-sm text-destructive">{errors.parent_phone}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">Last Name *</Label>
            <Input
              id="last_name"
              type="text"
              placeholder="Last name"
              value={formData.last_name}
              onChange={(e) => {
                setFormData({ ...formData, last_name: e.target.value });
                if (errors.last_name) setErrors({ ...errors, last_name: '' });
              }}
              className={errors.last_name ? 'border-destructive' : ''}
            />
            {errors.last_name && <p className="text-sm text-destructive">{errors.last_name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="math_level">Math Level</Label>
            <Select
              value={formData.math_level}
              onValueChange={(value: 'bad' | 'average' | 'good') => 
                setFormData({ ...formData, math_level: value })
              }
            >
              <SelectTrigger id="math_level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bad">Needs Work</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="good">Good</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="english_level">English Level</Label>
            <Select
              value={formData.english_level}
              onValueChange={(value: 'bad' | 'average' | 'good') => 
                setFormData({ ...formData, english_level: value })
              }
            >
              <SelectTrigger id="english_level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bad">Needs Work</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="good">Good</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Complete First Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bug, Send, ArrowLeft, ImagePlus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const categories = [
  { value: 'ui_bug', label: 'UI Bug' },
  { value: 'question_error', label: 'Question Error' },
  { value: 'performance', label: 'Performance Issue' },
  { value: 'other', label: 'Other' },
];

export default function StudentBugReport() {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotPreview(null);
  };

  const handleSubmit = async () => {
    if (!student || !title.trim() || !category) return;
    setSubmitting(true);

    try {
      let screenshot_url: string | null = null;

      if (screenshot) {
        const ext = screenshot.name.split('.').pop();
        const path = `bug-reports/${student.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('question-images')
          .upload(path, screenshot);
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('question-images')
            .getPublicUrl(path);
          screenshot_url = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from('bug_reports').insert({
        student_account_id: student.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        screenshot_url,
      });

      if (error) throw error;
      setSubmitted(true);
      toast.success('Bug report submitted! Thank you.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit bug report');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold">Report Submitted</h2>
            <p className="text-sm text-muted-foreground">We'll look into it. Thanks for helping improve the platform!</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => { setSubmitted(false); setTitle(''); setDescription(''); setCategory(''); removeScreenshot(); }}>
                Submit Another
              </Button>
              <Button onClick={() => navigate('/practice/dashboard')}>Back to Practice</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-destructive" />
            Report a Bug
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category *</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="Brief description of the issue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Steps to reproduce, what you expected, what happened instead..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Screenshot (optional)</label>
            {screenshotPreview ? (
              <div className="relative inline-block">
                <img src={screenshotPreview} alt="Screenshot" className="max-h-40 rounded-lg border" />
                <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={removeScreenshot}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload screenshot</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
              </label>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !category || submitting}
            className="w-full"
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Submit Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, Save, MessageSquare, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { BatchStudentsTable } from './BatchStudentsTable';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { getBatchSmsTemplate, estimateSegments, MN_SMS_PRICE_PER_SEGMENT } from '@/lib/smsTemplates';
import { ScrollArea } from '@/components/ui/scroll-area';

const SCHEDULES = [
  "Даваа/Лхагва/Баасан 16:40-18:30 (Math) + Бямба 14:10-16:10 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 18:40-20:30 (Math) + Бямба 16:20-18:20 (English - үнэгүй)",
  "Мягмар/Пүрэв 16:40-18:30 (Math) + Бямба 10:00-12:00 (Math) + 12:00-14:00 (English - үнэгүй)",
  "Мягмар/Пүрэв 18:40-20:30 (Math) + Бямба 12:10-14:10 (Math) + 14:10-16:10 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 16:40-18:30 (Math) + Бямба 14:10-16:10 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 18:40-20:30 (Math) + Бямба 16:20-18:20 (English - үнэгүй)",
  "Даваа/Лхагва/Баасан 18:40-20:30 (Math - Online) + Бямба 18:30-20:00 (English - үнэгүй)",
  "Мягмар/Пүрэв 16:30-18:30 + Бямба 10:00-12:00 + Ням 10:00-14:00 (Mock - үнэгүй)",
  "Мягмар/Пүрэв 16:30-18:30 + Бямба 12:00-14:00 + Ням 12:00-16:00 (Mock - үнэгүй)",
  "Даваа-Пүрэв 12:00-14:00 (Math) + Баасан 12:00-14:00 (English - үнэгүй) [Holiday]",
  "Даваа-Пүрэв 14:10-16:10 (Math) + Баасан 14:10-16:10 (English - үнэгүй) [Holiday]",
];

const ROOMS = ["1105", "905", "Online"];

interface BatchDetailsDialogProps {
  batch: any;
  studentCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function BatchDetailsDialog({ batch, studentCount, open, onOpenChange, onUpdate }: BatchDetailsDialogProps) {
  const [teachers, setTeachers] = useState<{ name: string }[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [fbGroupLink, setFbGroupLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [smsOpen, setSmsOpen] = useState(false);
  const [smsSending, setSmsSending] = useState(false);
  const [smsResults, setSmsResults] = useState<any>(null);
  const [smsPreview, setSmsPreview] = useState<{ segments: number; encoding: string; body: string } | null>(null);

  useEffect(() => {
    if (open && batch) {
      fetchTeachers();
      setSelectedTeacher(batch.teacher || '');
      setSelectedTeachers(
        batch.course_type === 'IELTS' ? (batch.teacher || '').split(', ').filter(Boolean) : []
      );
      setSelectedSchedule(batch.schedule || '');
      setSelectedRoom(batch.room || '');
      setStartDate(batch.start_date || '');
      setFbGroupLink(batch.fb_group_link || '');
    }
  }, [open, batch]);

  useEffect(() => {
    if (selectedSchedule.toLowerCase().includes('online')) {
      setSelectedRoom('Online');
    }
  }, [selectedSchedule]);

  const fetchTeachers = async () => {
    const { data } = await supabase.from('teachers').select('name').order('name');
    if (data) setTeachers(data);
  };

  if (!batch) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const teacherValue = batch.course_type === 'IELTS'
        ? selectedTeachers.join(', ')
        : selectedTeacher;

      const { error } = await supabase
        .from('batches')
        .update({
          teacher: teacherValue,
          schedule: selectedSchedule,
          room: selectedRoom,
          start_date: startDate,
          fb_group_link: fbGroupLink,
        })
        .eq('id', batch.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Batch updated successfully' });
      onUpdate();
    } catch {
      toast({ title: 'Error', description: 'Failed to update batch', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openSmsDialog = () => {
    const body = getBatchSmsTemplate(batch);
    const { segments, encoding } = estimateSegments(body);
    setSmsPreview({ segments, encoding, body });
    setSmsResults(null);
    setSmsOpen(true);
  };

  const handleSendSms = async () => {
    setSmsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-batch-sms', {
        body: { batch_id: batch.id },
      });
      if (error) throw error;
      setSmsResults(data);
      toast({
        title: 'SMS blast complete',
        description: `Sent ${data.sent} · Failed ${data.failed} · Skipped ${data.skipped}`,
      });
    } catch (e: any) {
      toast({ title: 'Failed to send SMS', description: e.message, variant: 'destructive' });
    } finally {
      setSmsSending(false);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left Side - Batch Editor */}
          <div className="w-1/2 p-6 overflow-y-auto border-r">
            <DialogHeader className="mb-6">
              <div className="flex items-center gap-3">
                <Badge
                  className="font-semibold"
                  style={{
                    backgroundColor: batch.course_type === 'SAT' ? 'hsl(217, 91%, 60%)' : 'hsl(271, 91%, 65%)',
                    color: 'white',
                  }}
                >
                  {batch.course_type}
                </Badge>
                <DialogTitle className="text-xl">
                  {batch.batch_name || `${batch.teacher} - ${formatDate(batch.start_date)}`}
                </DialogTitle>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Teacher{batch.course_type === 'IELTS' ? 's' : ''}</Label>
                {batch.course_type === 'IELTS' ? (
                  <div className="space-y-2">
                    {teachers.map((teacher) => (
                      <label key={teacher.name} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.includes(teacher.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTeachers([...selectedTeachers, teacher.name]);
                            } else {
                              setSelectedTeachers(selectedTeachers.filter(n => n !== teacher.name));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{teacher.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.name} value={teacher.name}>{teacher.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Schedule</Label>
                <Select value={selectedSchedule} onValueChange={setSelectedSchedule}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCHEDULES.map((schedule, idx) => (
                      <SelectItem key={idx} value={schedule}>{schedule}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Room</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOMS.map((room) => (
                      <SelectItem key={room} value={room}>{room}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Facebook Group Link</Label>
                <Input value={fbGroupLink} onChange={(e) => setFbGroupLink(e.target.value)} placeholder="https://facebook.com/groups/..." />
              </div>

              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>

              <Button onClick={openSmsDialog} variant="secondary" className="w-full">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send intro SMS to all students
              </Button>
            </div>
          </div>

          {/* Right Side - Students */}
          <div className="w-1/2 flex flex-col bg-muted/30 overflow-hidden">
            <div className="p-4 border-b bg-background flex-shrink-0">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4" />
                Students ({studentCount})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <BatchStudentsTable batchId={batch.id} onUpdate={onUpdate} />
            </div>
          </div>
        </div>
      </DialogContent>

      {/* SMS Blast Dialog */}
      <Dialog open={smsOpen} onOpenChange={(o) => !smsSending && setSmsOpen(o)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send intro SMS to {studentCount} student{studentCount !== 1 ? 's' : ''}</DialogTitle>
            <DialogDescription>
              Sent via Twilio Messaging Service — routes across Mobicom, Unitel, Skytel, G-Mobile.
            </DialogDescription>
          </DialogHeader>

          {!smsResults && smsPreview && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground text-xs">Recipients</div>
                  <div className="text-lg font-semibold">{studentCount}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground text-xs">Segments / msg</div>
                  <div className="text-lg font-semibold">{smsPreview.segments} <span className="text-xs font-normal text-muted-foreground">({smsPreview.encoding})</span></div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground text-xs">Est. cost (USD)</div>
                  <div className="text-lg font-semibold">${(smsPreview.segments * studentCount * MN_SMS_PRICE_PER_SEGMENT).toFixed(2)}</div>
                </div>
              </div>
              <div>
                <Label className="text-xs">Message preview</Label>
                <ScrollArea className="h-48 rounded-md border p-3 mt-1">
                  <pre className="whitespace-pre-wrap text-xs font-mono">{smsPreview.body}</pre>
                </ScrollArea>
              </div>
            </div>
          )}

          {smsResults && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground text-xs">Sent</div>
                  <div className="text-lg font-semibold text-green-600">{smsResults.sent}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground text-xs">Failed</div>
                  <div className="text-lg font-semibold text-red-600">{smsResults.failed}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground text-xs">Skipped</div>
                  <div className="text-lg font-semibold text-yellow-600">{smsResults.skipped}</div>
                </div>
              </div>
              <ScrollArea className="h-64 rounded-md border">
                <div className="divide-y">
                  {smsResults.results?.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.ok ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                        <span className="truncate">{r.name}</span>
                        <span className="text-xs text-muted-foreground truncate">{r.phone}</span>
                      </div>
                      {!r.ok && <span className="text-xs text-red-600 truncate ml-2">{r.error}</span>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <DialogFooter>
            {!smsResults ? (
              <>
                <Button variant="outline" onClick={() => setSmsOpen(false)} disabled={smsSending}>Cancel</Button>
                <Button onClick={handleSendSms} disabled={smsSending}>
                  {smsSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><MessageSquare className="w-4 h-4 mr-2" />Send now</>}
                </Button>
              </>
            ) : (
              <Button onClick={() => setSmsOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

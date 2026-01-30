import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Lightbulb, MessageSquare, StickyNote, Send, Clock, 
  Check, X, AlertTriangle, Mail, Phone
} from 'lucide-react';
import { useInterventionData } from '@/hooks/useAdminAnalytics';
import { formatDistanceToNow } from 'date-fns';

interface InterventionSubTabProps {
  studentId: string;
}

export function InterventionSubTab({ studentId }: InterventionSubTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [message, setMessage] = useState('');
  const [noteContent, setNoteContent] = useState('');
  
  const { data, isLoading } = useInterventionData(studentId);

  const templates = [
    { id: 'reminder', label: 'Practice Reminder', content: 'Hi! We noticed you haven\'t practiced in a while. Your SAT success depends on consistent practice...' },
    { id: 'encouragement', label: 'Encouragement', content: 'Great job on your recent progress! Keep up the momentum...' },
    { id: 'topic_help', label: 'Topic Help Offer', content: 'We noticed you\'re struggling with some topics. Would you like extra help with...' },
    { id: 'celebration', label: 'Achievement Celebration', content: 'Congratulations on your achievement! You\'ve shown great dedication...' },
  ];

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* AI Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <div>
              <CardTitle>AI Recommendations</CardTitle>
              <CardDescription>Personalized intervention suggestions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recommendations at this time. Student is on track!
            </p>
          ) : (
            <div className="space-y-3">
              {data.recommendations.map((rec) => (
                <div 
                  key={rec.id} 
                  className={`p-4 rounded-lg border-l-4 ${
                    rec.priority === 'critical' ? 'bg-destructive/5 border-l-destructive' :
                    rec.priority === 'important' ? 'bg-yellow-500/5 border-l-yellow-500' :
                    'bg-muted/50 border-l-muted-foreground'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={
                          rec.priority === 'critical' ? 'destructive' :
                          rec.priority === 'important' ? 'default' : 'secondary'
                        }>
                          {rec.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{rec.impact}</span>
                      </div>
                      <p className="text-sm">{rec.text}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">{rec.actionLabel}</Button>
                      <Button size="sm" variant="ghost">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Communication History</CardTitle>
              <CardDescription>Past messages and outreach</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.communicationHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No communication history yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">Preview</TableHead>
                  <TableHead className="hidden sm:table-cell">Response</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.communicationHistory.map((comm) => (
                  <TableRow key={comm.id}>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(comm.date), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {comm.type === 'sms' && <Phone className="h-3 w-3" />}
                        {comm.type === 'email' && <Mail className="h-3 w-3" />}
                        {comm.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground text-sm">
                      {comm.preview}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {comm.response || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        comm.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                        comm.status === 'read' ? 'bg-blue-500/10 text-blue-500' :
                        comm.status === 'replied' ? 'bg-primary/10 text-primary' :
                        'bg-muted text-muted-foreground'
                      }>
                        {comm.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Message */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Send Message</CardTitle>
              <CardDescription>Quick outreach to student</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Send Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Admin Notes</CardTitle>
              <CardDescription>Internal notes about this student</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Notes */}
          <ScrollArea className="h-48">
            <div className="space-y-3">
              {data.notes.map((note) => (
                <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{note.category}</Badge>
                      <span className="text-xs text-muted-foreground">{note.author}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(note.date), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm">{note.content}</p>
                </div>
              ))}
              {data.notes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No notes yet
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Add New Note */}
          <div className="space-y-2">
            <Textarea
              placeholder="Add a note..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" disabled={!noteContent.trim()}>
                <StickyNote className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

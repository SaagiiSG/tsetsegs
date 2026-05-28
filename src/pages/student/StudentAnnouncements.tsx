import { useState } from 'react';
import { useStudentAnnouncements, markAnnouncementRead } from '@/hooks/useStudentAnnouncements';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export default function StudentAnnouncements() {
  const { student } = useStudentAuth();
  const { data, refetch, isLoading } = useStudentAnnouncements();
  const [selected, setSelected] = useState<string | null>(null);

  const items = data?.items ?? [];
  const current = items.find((i) => i.id === selected);

  const openItem = async (id: string) => {
    setSelected(id);
    if (student?.id) {
      await markAnnouncementRead(id, student.id);
      refetch();
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Megaphone className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Announcements</h1>
          <p className="text-sm text-muted-foreground">Updates from your teachers and the team</p>
        </div>
      </div>

      {current ? (
        <Card className="p-6 space-y-4">
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="-ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold">{current.title}</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {current.published_at && formatDistanceToNow(new Date(current.published_at), { addSuffix: true })}
            </p>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{current.body}</div>
        </Card>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No announcements yet.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <button
              key={a.id}
              onClick={() => openItem(a.id)}
              className="w-full text-left"
            >
              <Card className={`p-4 hover:bg-muted/30 transition ${!a.read ? 'border-primary/40 bg-primary/5' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!a.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      <h3 className="font-medium truncate">{a.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{a.body}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {a.published_at && formatDistanceToNow(new Date(a.published_at), { addSuffix: true })}
                  </Badge>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

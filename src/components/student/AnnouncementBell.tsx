import { useState } from 'react';
import { Bell, Megaphone, ArrowLeft, UserPlus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useStudentAnnouncements,
  markAnnouncementRead,
} from '@/hooks/useStudentAnnouncements';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useFriends } from '@/hooks/useFriends';
import { StudentSatSimulationCard } from '@/components/student/dashboard/StudentSatSimulationCard';

export function AnnouncementBell() {
  const { student } = useStudentAuth();
  const { data, refetch, isLoading } = useStudentAnnouncements();
  const { incoming, respond } = useFriends();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const items = data?.items ?? [];
  const announcementUnread = data?.unreadCount ?? 0;
  const requestCount = incoming.length;
  const totalUnread = announcementUnread + requestCount;
  const current = items.find((i) => i.id === selected) ?? null;

  const openItem = async (id: string) => {
    setSelected(id);
    if (student?.id) {
      await markAnnouncementRead(id, student.id);
      refetch();
    }
  };

  const tooltip =
    announcementUnread > 0 && requestCount > 0
      ? `${announcementUnread} new · ${requestCount} friend request${requestCount === 1 ? '' : 's'}`
      : requestCount > 0
      ? `${requestCount} friend request${requestCount === 1 ? '' : 's'}`
      : announcementUnread > 0
      ? `${announcementUnread} new announcement${announcementUnread === 1 ? '' : 's'}`
      : 'Announcements';

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSelected(null);
      }}
    >
      <SheetTrigger asChild>
        <button
          type="button"
          title={tooltip}
          className="relative inline-flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-full border border-border bg-card/60 hover:bg-muted transition-colors"
        >
          <Bell className="h-4 w-4 text-foreground" />
          {totalUnread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow"
            >
              {totalUnread > 9 ? '9+' : totalUnread}
            </motion.span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left">Announcements</SheetTitle>
              <SheetDescription className="text-left text-xs">
                Updates from your teachers and the team
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {!current && (
              <StudentSatSimulationCard mode="drawer" />
            )}
            {current ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="-ml-2">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div>
                  <h2 className="text-lg font-semibold">{current.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {current.published_at &&
                      formatDistanceToNow(new Date(current.published_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{current.body}</div>
              </div>
            ) : isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No announcements yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openItem(a.id)}
                    className={cn(
                      'w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/40',
                      !a.read ? 'border-primary/40 bg-primary/5' : 'border-border'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {!a.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          <h3 className="font-medium truncate text-sm">{a.title}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{a.body}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {a.published_at &&
                          formatDistanceToNow(new Date(a.published_at), { addSuffix: true })}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

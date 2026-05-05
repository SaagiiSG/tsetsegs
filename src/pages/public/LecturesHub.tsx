import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, Clock, MapPin, ChevronRight, Armchair } from 'lucide-react';
import { format } from 'date-fns';

const LECTURE_IDS = [
  'f84bb255-3439-4d96-a530-62b90ee86904',
  '67de559e-b3ba-4f2f-85c6-c22556999306',
  '202355fb-1f50-4371-8335-da923ef9ec5d',
  '5f26c254-00c5-47ae-8b44-b642104d740d',
];

export default function LecturesHub() {
  const navigate = useNavigate();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['lectures-hub-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ngee_courses')
        .select('*')
        .in('id', LECTURE_IDS)
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: seatStats } = useQuery({
    queryKey: ['lectures-hub-seats'],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from('ngee_sessions')
        .select('id, course_id, total_seats')
        .in('course_id', LECTURE_IDS);
      if (error) throw error;
      const { data: taken } = await supabase.from('ngee_session_taken_seats').select('*');
      const map: Record<string, { taken: number; total: number }> = {};
      sessions?.forEach((s) => {
        const t = taken?.filter((x) => x.session_id === s.id).length || 0;
        map[s.course_id] = {
          taken: (map[s.course_id]?.taken || 0) + t,
          total: (map[s.course_id]?.total || 0) + s.total_seats,
        };
      });
      return map;
    },
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
        <div className="text-center pt-6 pb-2">
          <Badge variant="secondary" className="mb-3">Free Lecture Series</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Standalone Lectures</h1>
          <p className="text-sm text-muted-foreground mt-2">Choose a lecture to book your seat</p>
        </div>

        <div className="space-y-3">
          {courses?.map((c) => {
            const stats = seatStats?.[c.id];
            const available = stats ? stats.total - stats.taken : null;
            const isPast = new Date(c.start_date) < new Date(new Date().toDateString());
            return (
              <button
                key={c.id}
                disabled={isPast}
                onClick={() => navigate(`/ngee/${c.id}`)}
                className="w-full text-left disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Card className="transition-all group-hover:border-primary/40 group-hover:shadow-md">
                  <CardContent className="p-4 md:p-5 flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center h-14 w-14 rounded-xl bg-primary/10 text-primary shrink-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wider">
                        {format(new Date(c.start_date), 'MMM')}
                      </div>
                      <div className="text-xl font-bold leading-none">
                        {format(new Date(c.start_date), 'd')}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm md:text-base truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {c.start_time.slice(0, 5)}–{c.end_time.slice(0, 5)}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Room {c.room}
                        </span>
                        {available !== null && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Armchair className="h-3 w-3" />
                              {available > 0 ? `${available} seats left` : 'Full'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {isPast ? (
                      <Badge variant="outline" className="text-xs">Past</Badge>
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground pt-4">
          <Calendar className="h-3 w-3 inline mr-1" />
          Booking opens at 8:00 AM on the day of each lecture
        </p>
      </div>
    </div>
  );
}

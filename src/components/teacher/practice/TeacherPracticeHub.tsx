import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Gamepad2, Flag } from 'lucide-react';
import { TeacherQuestionBrowser } from './TeacherQuestionBrowser';
import { LivePracticeContent } from '@/components/teacher/live-practice';
import { TeacherFlaggedQuestions } from '@/components/teacher/TeacherFlaggedQuestions';

export function TeacherPracticeHub() {
  return (
    <Tabs defaultValue="browse" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 h-10">
        <TabsTrigger value="browse" className="text-xs md:text-sm gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          <span>Browse</span>
        </TabsTrigger>
        <TabsTrigger value="live" className="text-xs md:text-sm gap-1.5">
          <Gamepad2 className="h-3.5 w-3.5" />
          <span>Live Session</span>
        </TabsTrigger>
        <TabsTrigger value="flagged" className="text-xs md:text-sm gap-1.5">
          <Flag className="h-3.5 w-3.5" />
          <span>Flagged</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="browse">
        <TeacherQuestionBrowser />
      </TabsContent>

      <TabsContent value="live">
        <LivePracticeContent />
      </TabsContent>

      <TabsContent value="flagged">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm md:text-base font-semibold">Flagged Questions</h3>
          </div>
          <TeacherFlaggedQuestions />
        </div>
      </TabsContent>
    </Tabs>
  );
}

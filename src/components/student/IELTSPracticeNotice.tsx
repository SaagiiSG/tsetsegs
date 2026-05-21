import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { GraduationCap, LogOut } from 'lucide-react';

/**
 * Shown when an IELTS-only student lands on the SAT practice section.
 * Practice content (questions, speed mode, leaderboard, stats) is SAT-only.
 */
export function IELTSPracticeNotice() {
  const { logout } = useStudentAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Practice section is SAT-only</CardTitle>
          <CardDescription>
            Энэ хэсэг нь зөвхөн SAT суралцагчдад зориулагдсан. Та IELTS ангид бүртгэлтэй
            байна. Хэрэв та SAT-д бүртгэлтэй боловч энэ мессеж харагдсан бол багштайгаа
            холбогдоно уу.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            The SAT practice portal (questions, speed mode, leaderboard, stats) is only
            available to SAT students. If you think this is a mistake, please contact
            your teacher.
          </p>
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

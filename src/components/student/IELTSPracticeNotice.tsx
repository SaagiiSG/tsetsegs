import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Languages, LogOut, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Safety-net fallback when an IELTS-only student somehow lands on the SAT
 * practice section. Normal flow now routes them to /ielts directly.
 */
export function IELTSPracticeNotice() {
  const { logout } = useStudentAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Languages className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Head to IELTS Prep</CardTitle>
          <CardDescription>
            Та IELTS ангид бүртгэлтэй байна. IELTS бэлтгэлийн хэсэг рүү үргэлжлүүлнэ үү.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/ielts/dashboard">
              Open IELTS Prep
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" className="w-full" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


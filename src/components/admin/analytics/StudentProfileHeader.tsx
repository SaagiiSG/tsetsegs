import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Key, User, UserX, StickyNote, Crown, Gem, Medal, Award, Trophy, UserCheck, AlertTriangle, Star, Clock, Zap } from 'lucide-react';
import { useStudentProfileData } from '@/hooks/useAdminAnalytics';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { getRiskLevelColor } from '@/hooks/useRiskCalculation';
import { StudentActionDialogs } from './StudentActionDialogs';

interface StudentProfileHeaderProps {
  studentId: string;
}

type DialogType = 'resetPass' | 'account' | 'deactivate' | 'note' | null;

export function StudentProfileHeader({ studentId }: StudentProfileHeaderProps) {
  const { data: profile, isLoading } = useStudentProfileData(studentId);
  const [openDialog, setOpenDialog] = useState<DialogType>(null);

  const getTierIcon = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'ruby': return <Crown className="h-4 w-4 text-rose-500" />;
      case 'diamond': return <Gem className="h-4 w-4 text-cyan-400" />;
      case 'gold': return <Medal className="h-4 w-4 text-yellow-500" />;
      case 'silver': return <Award className="h-4 w-4 text-slate-400" />;
      case 'bronze': return <Trophy className="h-4 w-4 text-amber-700" />;
      default: return null;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'ruby': return 'text-rose-500';
      case 'diamond': return 'text-cyan-400';
      case 'gold': return 'text-yellow-500';
      case 'silver': return 'text-slate-400';
      case 'bronze': return 'text-amber-700';
      default: return 'text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-28" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-20" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) return null;

  const riskColors = getRiskLevelColor(profile.riskLevel);

  return (
    <>
      <Card>
        <CardContent className="py-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            {/* Left: Avatar & Info */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">{profile.initials}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile.name}</h2>
                <p className="text-muted-foreground">{profile.phone}</p>
                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Badge variant="secondary">{profile.batchName}</Badge>
                  <Badge variant="outline">{profile.courseType}</Badge>
                  
                  {/* At Risk Badge - based on risk score */}
                  {profile.riskLevel === 'high' && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      At Risk
                    </Badge>
                  )}
                  
                  {/* Top Performer Badge - based on tier */}
                  {['ruby', 'diamond'].includes(profile.tier?.toLowerCase()) && (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100">
                      <Star className="h-3 w-3 mr-1" />
                      Top Performer
                    </Badge>
                  )}
                  
                  {/* Inactive 7+ Badge - based on last login */}
                  {profile.lastLogin && differenceInDays(new Date(), new Date(profile.lastLogin)) > 7 && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                      <Clock className="h-3 w-3 mr-1" />
                      Inactive 7+
                    </Badge>
                  )}
                  {!profile.lastLogin && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100">
                      <Clock className="h-3 w-3 mr-1" />
                      Never Logged In
                    </Badge>
                  )}
                  
                  {/* Sprint Leader Badge - based on sprint ranking */}
                  {profile.isSprintLeader && (
                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
                      <Zap className="h-3 w-3 mr-1" />
                      Sprint Leader
                    </Badge>
                  )}
                  
                  {profile.isBlocked && (
                    <Badge variant="destructive">Blocked</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Center: Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Rank */}
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Rank</p>
                <div className="flex items-center justify-center gap-1">
                  {getTierIcon(profile.tier)}
                  <span className={`text-lg font-bold ${getTierColor(profile.tier)}`}>
                    {profile.tier}
                  </span>
                </div>
              </div>

              {/* Level */}
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Level</p>
                <p className="text-lg font-bold">{profile.level}</p>
                <Progress value={profile.levelProgress} className="h-1 mt-1" />
              </div>

              {/* Hours */}
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Hours</p>
                <p className="text-lg font-bold">{profile.totalHours}</p>
              </div>

              {/* Risk */}
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Risk</p>
                <Badge className={`${riskColors.bg} ${riskColors.text} ${riskColors.border}`}>
                  {profile.riskLevel.charAt(0).toUpperCase() + profile.riskLevel.slice(1)} ({profile.riskScore})
                </Badge>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpenDialog('resetPass')}>
                <Key className="h-4 w-4 mr-1" />
                Reset Device
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpenDialog('account')}>
                <User className="h-4 w-4 mr-1" />
                Account
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className={profile.isBlocked ? 'text-green-600' : 'text-destructive'}
                onClick={() => setOpenDialog('deactivate')}
              >
                {profile.isBlocked ? (
                  <><UserCheck className="h-4 w-4 mr-1" />Activate</>
                ) : (
                  <><UserX className="h-4 w-4 mr-1" />Deactivate</>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setOpenDialog('note')}>
                <StickyNote className="h-4 w-4 mr-1" />
                Note
              </Button>
            </div>
          </div>

          {/* Last Login */}
          <p className="text-xs text-muted-foreground mt-4">
            Last login: {profile.lastLogin 
              ? formatDistanceToNow(new Date(profile.lastLogin), { addSuffix: true })
              : 'Never'}
          </p>
        </CardContent>
      </Card>

      <StudentActionDialogs
        studentId={studentId}
        studentName={profile.name}
        phone={profile.phone}
        linkedStudentId={profile.linkedStudentId}
        isBlocked={profile.isBlocked}
        openDialog={openDialog}
        onClose={() => setOpenDialog(null)}
      />
    </>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid,
  Legend, ReferenceLine
} from 'recharts';
import { Clock, Calendar, Target, Zap, Brain, RotateCcw, Focus } from 'lucide-react';
import { useLearningBehaviorData } from '@/hooks/useAdminAnalytics';

interface LearningBehaviorSubTabProps {
  studentId: string;
}

const COLORS = ['#22c55e', '#eab308', '#ef4444'];

export function LearningBehaviorSubTab({ studentId }: LearningBehaviorSubTabProps) {
  const { data, isLoading } = useLearningBehaviorData(studentId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const getQuadrantLabel = (speed: number, accuracy: number) => {
    if (speed > 50 && accuracy > 50) return { label: 'Fast & Accurate', color: 'text-green-500' };
    if (speed <= 50 && accuracy > 50) return { label: 'Slow but Accurate', color: 'text-blue-500' };
    if (speed > 50 && accuracy <= 50) return { label: 'Fast but Inaccurate', color: 'text-orange-500' };
    return { label: 'Needs Improvement', color: 'text-destructive' };
  };

  const quadrant = getQuadrantLabel(data.speedScore, data.accuracyScore);

  return (
    <div className="space-y-6">
      {/* Row 1: Peak Hours and Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Peak Performance Hours</CardTitle>
            </div>
            <CardDescription>Accuracy by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourlyData}>
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => `${val}:00`}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Accuracy']}
                    labelFormatter={(label) => `${label}:00`}
                  />
                  <Bar 
                    dataKey="accuracy" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">Best hours: </span>
                <span className="font-medium text-green-500">{data.bestHours.join(', ')}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Recommendation: Schedule difficult topics during peak hours
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Day of Week */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Weekly Pattern</CardTitle>
            </div>
            <CardDescription>Performance by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyData}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Accuracy']} />
                  <Bar 
                    dataKey="accuracy" 
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <span className="text-muted-foreground">Best day: </span>
                <span className="font-medium text-green-500">{data.bestDay}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Consistency score: {data.consistencyScore}%
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Difficulty Distribution and Speed vs Accuracy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Difficulty Distribution</CardTitle>
            </div>
            <CardDescription>Questions attempted by difficulty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="h-[180px] w-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.difficultyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.difficultyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {data.difficultyData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-sm">{item.name}</span>
                    <span className="text-sm font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
            {data.difficultyAlert && (
              <Badge variant="destructive" className="mt-4">
                ⚠️ {data.difficultyAlert}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Speed vs Accuracy Quadrant */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Speed vs Accuracy</CardTitle>
            </div>
            <CardDescription>Performance quadrant analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    dataKey="speed" 
                    domain={[0, 100]} 
                    name="Speed"
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Speed', position: 'bottom', fontSize: 10 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="accuracy" 
                    domain={[0, 100]} 
                    name="Accuracy"
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Accuracy', angle: -90, position: 'left', fontSize: 10 }}
                  />
                  <ReferenceLine x={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    name="Student" 
                    data={[{ speed: data.speedScore, accuracy: data.accuracyScore }]} 
                    fill="hsl(var(--primary))"
                  >
                    <Cell fill="hsl(var(--primary))" />
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className={`text-sm font-medium ${quadrant.color}`}>{quadrant.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{data.quadrantRecommendation}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Retry Metrics and Session Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retry Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Retry Behavior</CardTitle>
            </div>
            <CardDescription>How the student handles wrong answers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{data.retryRate}%</p>
                <p className="text-xs text-muted-foreground">Retry Rate</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-500">{data.retrySuccess}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                {data.retrySuccess >= 70 ? (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    <Brain className="h-3 w-3 mr-1" />
                    Good Learner
                  </Badge>
                ) : (
                  <Badge variant="secondary">Learning</Badge>
                )}
              </div>
            </div>
            <div className="h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.retryComparison} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Session Quality */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Focus className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Session Quality</CardTitle>
            </div>
            <CardDescription>Practice session effectiveness</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{data.questionsPerSession}</p>
                <p className="text-xs text-muted-foreground">Qs/Session</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{data.completionRate}%</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-2xl font-bold">{data.focusScore}</p>
                <p className="text-xs text-muted-foreground">Focus Score</p>
              </div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Session Insights</p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                {data.sessionInsights.map((insight, i) => (
                  <li key={i}>• {insight}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Users, GraduationCap, Calendar, TrendingUp } from 'lucide-react';

export function DashboardStats() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalBatches: 0,
    satStudents: 0,
    ieltsStudents: 0,
  });
  const [intakeData, setIntakeData] = useState<any[]>([]);
  const [teacherData, setTeacherData] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Fetch batches with students
    const { data: batches } = await supabase
      .from('batches')
      .select('*, students(*)');

    if (batches) {
      const totalStudents = batches.reduce((sum, batch) => sum + (batch.students?.length || 0), 0);
      const satStudents = batches
        .filter(b => b.course_type === 'SAT')
        .reduce((sum, batch) => sum + (batch.students?.length || 0), 0);
      const ieltsStudents = batches
        .filter(b => b.course_type === 'IELTS')
        .reduce((sum, batch) => sum + (batch.students?.length || 0), 0);

      setStats({
        totalStudents,
        totalBatches: batches.length,
        satStudents,
        ieltsStudents,
      });

      // Prepare intake data (last 6 months)
      const intakeMap = new Map<string, { SAT: number; IELTS: number }>();
      batches.forEach(batch => {
        const date = new Date(batch.start_date);
        const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const current = intakeMap.get(monthYear) || { SAT: 0, IELTS: 0 };
        current[batch.course_type as 'SAT' | 'IELTS'] += batch.students?.length || 0;
        intakeMap.set(monthYear, current);
      });

      const intakeArray = Array.from(intakeMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-6);

      setIntakeData(intakeArray);

      // Prepare teacher distribution data
      const teacherMap = new Map<string, number>();
      batches.forEach(batch => {
        const teachers = batch.teacher?.split(',').map((t: string) => t.trim()) || [];
        teachers.forEach(teacher => {
          if (teacher) {
            teacherMap.set(teacher, (teacherMap.get(teacher) || 0) + (batch.students?.length || 0));
          }
        });
      });

      const teacherArray = Array.from(teacherMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      setTeacherData(teacherArray);
    }
  };

  const courseDistribution = [
    { name: 'SAT', value: stats.satStudents, color: '#3b82f6' },
    { name: 'IELTS', value: stats.ieltsStudents, color: '#a855f7' },
  ];

  const chartConfig = {
    SAT: {
      label: 'SAT Students',
      color: 'hsl(217, 91%, 60%)',
    },
    IELTS: {
      label: 'IELTS Students',
      color: 'hsl(271, 81%, 56%)',
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Across all batches</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBatches}</div>
            <p className="text-xs text-muted-foreground">Active and upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SAT Students</CardTitle>
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.satStudents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudents > 0 ? Math.round((stats.satStudents / stats.totalStudents) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IELTS Students</CardTitle>
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ieltsStudents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudents > 0 ? Math.round((stats.ieltsStudents / stats.totalStudents) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Student Enrollment by Intake */}
        <Card>
          <CardHeader>
            <CardTitle>Student Enrollment Trends</CardTitle>
            <CardDescription>Last 6 months by course type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={intakeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="SAT" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="IELTS" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Course Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Course Distribution</CardTitle>
            <CardDescription>SAT vs IELTS student breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={courseDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {courseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Teacher Distribution */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Students by Teacher</CardTitle>
            <CardDescription>Total student distribution across teachers</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: 'Students',
                  color: 'hsl(var(--primary))',
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teacherData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

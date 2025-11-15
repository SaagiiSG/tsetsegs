import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Users, Sparkles } from "lucide-react";
import { BatchList } from "@/components/BatchList";

const schedules = [
  "Mon/Wed/Fri 4:40-6:30 PM",
  "Mon/Wed/Fri 6:40-8:30 PM",
  "Tue/Thu 4:40-6:30 PM + Sat 10:00 AM-12:00 PM",
  "Tue/Thu 6:40-8:30 PM + Sat 12:10-2:10 PM",
  "Mon/Wed/Fri 2:00-4:00 PM",
  "Mon/Wed/Fri 10:00 AM-12:00 PM",
];

const Admin = () => {
  const [studentList, setStudentList] = useState("");
  const [teacher, setTeacher] = useState("");
  const [schedule, setSchedule] = useState("");
  const [room, setRoom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [fbGroupLink, setFbGroupLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const { data: batchesData } = await supabase
      .from("batches")
      .select(`
        *,
        students (*)
      `)
      .order("created_at", { ascending: false });

    if (batchesData) setBatches(batchesData);
  };

  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateBatch = async () => {
    if (!studentList.trim() || !teacher || !schedule || !room || !startDate || !fbGroupLink.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      // Parse student list
      const students = studentList.split("\n").filter(line => line.trim()).map(line => {
        const match = line.match(/(.+?)\s*-\s*(\d+)/);
        if (!match) return null;
        return {
          name: match[1].trim(),
          phone: match[2].trim(),
        };
      }).filter(Boolean);

      if (students.length === 0) {
        toast.error("No valid students found. Format: Name - Phone");
        setIsLoading(false);
        return;
      }

      // Create batch with unique link
      const { data: batch, error: batchError } = await supabase
        .from("batches")
        .insert({
          teacher: teacher as "Saran-Ochir" | "Altan-Erdene" | "Manlai",
          schedule,
          room: room as "1105" | "905",
          start_date: startDate,
          unique_link_id: generateUniqueId(),
          fb_group_link: fbGroupLink.trim(),
        })
        .select()
        .single();

      if (batchError) throw batchError;

      // Create students (without unique_link_id)
      const studentsData = students.map((student: any) => ({
        batch_id: batch.id,
        name: student.name,
        phone: student.phone,
        unique_link_id: "", // Not used anymore
      }));

      const { error: studentsError } = await supabase
        .from("students")
        .insert(studentsData);

      if (studentsError) throw studentsError;

      toast.success(`Batch created with ${students.length} students!`);
      setStudentList("");
      setTeacher("");
      setSchedule("");
      setRoom("");
      setStartDate("");
      setFbGroupLink("");
      fetchBatches();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    const rows: string[] = ["Phone,Message"];
    
    batches.forEach(batch => {
      const batchLink = `${window.location.origin}/batch/${batch.unique_link_id}`;
      const messageTemplate = `Сайн байна уу? Flowers Talent Agency-д тавтай морил! 🌸\n\nТаны ангийн мэдээллийг энд дарж үзнэ үү:\n${batchLink}\n\nХаяг: Их Наяд Зүүн Өндөр 1114\nУтас: 80660314, 88559876`;
      
      batch.students.forEach((student: any) => {
        rows.push(`${student.phone},"${messageTemplate}"`);
      });
    });

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-messages.csv";
    a.click();
    toast.success("CSV exported successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-petal bg-clip-text text-transparent">
            Flowers Talent Agency Admin
          </h1>
          <p className="text-muted-foreground">Manage student batches and assignments</p>
        </div>

        <Card className="shadow-soft animate-scale-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Create New Batch
            </CardTitle>
            <CardDescription>Add students and assign their class details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="students">Student List</Label>
              <Textarea
                id="students"
                placeholder="Format: Name - Phone&#10;Example:&#10;Khuslen - 90480277&#10;Uuganbayr - 95362393"
                value={studentList}
                onChange={(e) => setStudentList(e.target.value)}
                rows={6}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teacher">Teacher</Label>
                <Select value={teacher} onValueChange={setTeacher}>
                  <SelectTrigger id="teacher" className="mt-1">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Saran-Ochir">Saran-Ochir</SelectItem>
                    <SelectItem value="Altan-Erdene">Altan-Erdene</SelectItem>
                    <SelectItem value="Manlai">Manlai</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="room">Room</Label>
                <Select value={room} onValueChange={setRoom}>
                  <SelectTrigger id="room" className="mt-1">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1105">1105 (11th floor)</SelectItem>
                    <SelectItem value="905">905 (9th floor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="schedule">Schedule</Label>
                <Select value={schedule} onValueChange={setSchedule}>
                  <SelectTrigger id="schedule" className="mt-1">
                    <SelectValue placeholder="Select schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="fbGroup">Facebook Group Link</Label>
              <Input
                id="fbGroup"
                type="url"
                placeholder="https://www.facebook.com/groups/..."
                value={fbGroupLink}
                onChange={(e) => setFbGroupLink(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleCreateBatch}
              disabled={isLoading}
              className="w-full bg-gradient-petal hover:opacity-90 transition-opacity"
            >
              {isLoading ? "Creating..." : "Create Batch"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            All Batches ({batches.length})
          </h2>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <BatchList batches={batches} onUpdate={fetchBatches} />
      </div>
    </div>
  );
};

export default Admin;

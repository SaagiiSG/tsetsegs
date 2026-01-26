import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, UserPlus, Database } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (studentId: string | null, manualName?: string, manualPhone?: string) => void;
  existingMemberStudentIds: string[];
}

interface Student {
  id: string;
  name: string;
  phone: string;
  batch_id: string | null;
}

export function IntensePrepAddStudentDialog({ open, onOpenChange, onAdd, existingMemberStudentIds }: Props) {
  const [tab, setTab] = useState<"database" | "manual">("database");
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // Manual entry state
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  useEffect(() => {
    if (open && tab === "database") {
      searchStudents();
    }
  }, [open, searchQuery, tab]);

  const searchStudents = async () => {
    try {
      setIsSearching(true);
      
      let query = supabase
        .from("students")
        .select("id, name, phone, batch_id")
        .order("name");

      if (searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      
      // Filter out already added students
      const filtered = (data || []).filter(s => !existingMemberStudentIds.includes(s.id));
      setStudents(filtered);
    } catch (error) {
      console.error("Error searching students:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromDatabase = async (student: Student) => {
    setIsAdding(true);
    await onAdd(student.id);
    setIsAdding(false);
  };

  const handleAddManual = async () => {
    if (!manualName.trim() || !manualPhone.trim()) return;
    
    setIsAdding(true);
    
    // Check if student exists in database by phone
    const { data: existingStudent } = await supabase
      .from("students")
      .select("id")
      .eq("phone", manualPhone.trim())
      .single();

    if (existingStudent) {
      // If student exists, link to them
      await onAdd(existingStudent.id);
    } else {
      // Add as manual entry - also register to database
      const { data: newStudent, error } = await supabase
        .from("students")
        .insert({
          name: manualName.trim(),
          first_name: manualName.trim().split(' ')[0],
          last_name: manualName.trim().split(' ').slice(1).join(' ') || null,
          phone: manualPhone.trim(),
          unique_link_id: crypto.randomUUID(),
          is_review_student: true, // Mark as review student since no batch
        })
        .select()
        .single();

      if (!error && newStudent) {
        await onAdd(newStudent.id);
      } else {
        // Fallback to manual entry without database registration
        await onAdd(null, manualName.trim(), manualPhone.trim());
      }
    }

    setManualName("");
    setManualPhone("");
    setIsAdding(false);
  };

  const handleClose = () => {
    setSearchQuery("");
    setManualName("");
    setManualPhone("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Student to Group</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "database" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="database" className="gap-2">
              <Database className="h-4 w-4" />
              From Database
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchQuery ? "No students found" : "Start typing to search"}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-left"
                      onClick={() => handleAddFromDatabase(student)}
                      disabled={isAdding}
                    >
                      <div>
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.phone}</div>
                      </div>
                      <Button size="sm" variant="ghost" className="h-7" disabled={isAdding}>
                        Add
                      </Button>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter student details manually. If the phone number matches an existing student, they will be linked automatically.
            </p>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="manualName">Full Name</Label>
                <Input
                  id="manualName"
                  placeholder="Student's full name"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="manualPhone">Phone Number</Label>
                <Input
                  id="manualPhone"
                  placeholder="Phone number"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleAddManual}
              className="w-full"
              disabled={!manualName.trim() || !manualPhone.trim() || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

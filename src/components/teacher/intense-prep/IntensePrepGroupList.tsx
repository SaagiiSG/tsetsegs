import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Users, Flame, Loader2, QrCode, MoreVertical, Pencil, Archive, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { makePrepJoinCode } from "./PrepClassQrDialog";
import type { IntensePrepGroup } from "./IntensePrepContent";

interface Props {
  onSelectGroup: (groupId: string) => void;
}

export function IntensePrepGroupList({ onSelectGroup }: Props) {
  const { teacherName } = useTeacherAuth();
  const [groups, setGroups] = useState<IntensePrepGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editGroup, setEditGroup] = useState<IntensePrepGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IntensePrepGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const openEdit = (group: IntensePrepGroup) => {
    setEditGroup(group);
    setEditName(group.name);
    setEditStart(group.start_date ?? "");
    setEditEnd(group.end_date ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editGroup || !editName.trim()) return;
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from("intense_prep_groups")
        .update({
          name: editName.trim(),
          start_date: editStart || null,
          end_date: editEnd || null,
        })
        .eq("id", editGroup.id);
      if (error) throw error;

      setGroups(prev =>
        prev.map(g =>
          g.id === editGroup.id
            ? { ...g, name: editName.trim(), start_date: editStart || null, end_date: editEnd || null }
            : g
        )
      );
      setEditGroup(null);
      toast({ title: "Prep class updated" });
    } catch (error: any) {
      toast({ title: "Could not update", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async (group: IntensePrepGroup) => {
    try {
      const { error } = await supabase
        .from("intense_prep_groups")
        .update({ is_active: false })
        .eq("id", group.id);
      if (error) throw error;
      setGroups(prev => prev.filter(g => g.id !== group.id));
      toast({
        title: "Prep class archived",
        description: `"${group.name}" is hidden but its data is kept.`,
      });
    } catch (error: any) {
      toast({ title: "Could not archive", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("intense_prep_groups")
        .delete()
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setGroups(prev => prev.filter(g => g.id !== deleteTarget.id));
      toast({ title: "Prep class deleted", description: `"${deleteTarget.name}" is gone for good.` });
      setDeleteTarget(null);
    } catch (error: any) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [teacherName]);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);

      // Get all active groups (all teachers can see all groups)
      const { data: groupsData, error: groupsError } = await supabase
        .from("intense_prep_groups")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (groupsError) throw groupsError;

      // Get member counts
      if (groupsData && groupsData.length > 0) {
        const groupIds = groupsData.map(g => g.id);
        const { data: memberCounts, error: memberError } = await supabase
          .from("intense_prep_members")
          .select("group_id")
          .in("group_id", groupIds);

        if (!memberError && memberCounts) {
          const counts: Record<string, number> = {};
          memberCounts.forEach(m => {
            counts[m.group_id] = (counts[m.group_id] || 0) + 1;
          });

          const enrichedGroups = groupsData.map(g => ({
            ...g,
            memberCount: counts[g.id] || 0,
            avgProgress: 0, // TODO: Calculate actual progress
          }));
          setGroups(enrichedGroups);
        } else {
          setGroups(groupsData.map(g => ({ ...g, memberCount: 0, avgProgress: 0 })));
        }
      } else {
        setGroups([]);
      }
    } catch (error: any) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Error loading groups",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      setIsCreating(true);

      // Get teacher id
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("id")
        .ilike("name", `%${teacherName}%`)
        .single();

      if (teacherError) throw teacherError;

      const { data, error } = await supabase
        .from("intense_prep_groups")
        .insert({
          name: newGroupName.trim(),
          created_by_teacher_id: teacher.id,
          join_code: makePrepJoinCode(),
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .select()
        .single();

      if (error) throw error;

      setGroups(prev => [{ ...data, memberCount: 0, avgProgress: 0 }, ...prev]);
      setNewGroupName("");
      setStartDate("");
      setEndDate("");
      setDialogOpen(false);

      toast({
        title: "Prep class created",
        description: `Registration code ${data.join_code} is ready to scan.`,
      });
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast({
        title: "Error creating group",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Intense Prep
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">Track student progress through intensive preparation</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create Group</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create prep class</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Class name</Label>
                <Input
                  placeholder="e.g. March SAT Intense Prep"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Starts</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ends</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A registration code and QR are created automatically. Registration closes after the end date.
              </p>
              <Button 
                onClick={handleCreateGroup} 
                className="w-full" 
                disabled={!newGroupName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Flame className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No prep groups yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a group to start tracking student progress
            </p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {groups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <Card 
                  className="p-4 hover:shadow-md transition-all cursor-pointer group hover:border-primary/50"
                  onClick={() => onSelectGroup(group.id)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {group.name}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              aria-label="Prep class options"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => openEdit(group)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Rename / edit dates
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(group)}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive (keep data)
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(group)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete permanently
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{group.memberCount || 0} students</span>
                      </div>
                      {group.join_code && (
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <QrCode className="h-3.5 w-3.5" />
                          <span>{group.join_code}</span>
                        </div>
                      )}
                    </div>
                    {(group.start_date || group.end_date) && (
                      <p className="text-xs text-muted-foreground">
                        {group.start_date ?? "?"} → {group.end_date ?? "?"}
                      </p>
                    )}

                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Average Progress</span>
                        <span className="font-medium">{group.avgProgress || 0}%</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all"
                          style={{ width: `${group.avgProgress || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

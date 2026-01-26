import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Flame, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();

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
        })
        .select()
        .single();

      if (error) throw error;

      setGroups(prev => [{ ...data, memberCount: 0, avgProgress: 0 }, ...prev]);
      setNewGroupName("");
      setDialogOpen(false);
      
      toast({
        title: "Group created",
        description: `"${newGroupName}" has been created successfully.`,
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
              <DialogTitle>Create New Prep Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="Group name (e.g., March SAT Prep)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
              />
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
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                        {group.name}
                      </h3>
                      <Flame className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        <span>{group.memberCount || 0} students</span>
                      </div>
                    </div>

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

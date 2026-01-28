import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Clock,
  HelpCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BluebookTest {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

interface ModuleStats {
  test_id: string;
  total_questions: number;
}

const BluebookTestList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<BluebookTest | null>(null);

  // Fetch all tests
  const { data: tests, isLoading } = useQuery({
    queryKey: ["bluebook-tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_tests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BluebookTest[];
    },
  });

  // Fetch module stats for each test
  const { data: moduleStats } = useQuery({
    queryKey: ["bluebook-module-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_modules")
        .select(`
          test_id,
          bluebook_module_questions(count)
        `);

      if (error) throw error;

      // Aggregate questions per test
      const stats: Record<string, number> = {};
      data?.forEach((module: any) => {
        const testId = module.test_id;
        const count = module.bluebook_module_questions?.[0]?.count || 0;
        stats[testId] = (stats[testId] || 0) + count;
      });

      return stats;
    },
  });

  // Toggle publish status
  const togglePublishMutation = useMutation({
    mutationFn: async ({
      testId,
      isPublished,
    }: {
      testId: string;
      isPublished: boolean;
    }) => {
      const { error } = await supabase
        .from("bluebook_tests")
        .update({ is_published: !isPublished, updated_at: new Date().toISOString() })
        .eq("id", testId);

      if (error) throw error;
    },
    onSuccess: (_, { isPublished }) => {
      queryClient.invalidateQueries({ queryKey: ["bluebook-tests"] });
      toast.success(isPublished ? "Test unpublished" : "Test published");
    },
    onError: () => {
      toast.error("Failed to update test status");
    },
  });

  // Delete test
  const deleteMutation = useMutation({
    mutationFn: async (testId: string) => {
      const { error } = await supabase
        .from("bluebook_tests")
        .delete()
        .eq("id", testId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bluebook-tests"] });
      toast.success("Test deleted");
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete test");
    },
  });

  const handleDelete = (test: BluebookTest) => {
    setTestToDelete(test);
    setDeleteDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!tests || tests.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Practice Tests</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first Bluebook-style practice test to get started.
          </p>
          <Button onClick={() => navigate("create")}>Create Test</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tests.map((test) => (
          <Card
            key={test.id}
            className="group hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate(`edit/${test.id}`)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {test.name}
                  </CardTitle>
                  <Badge
                    variant={test.is_published ? "default" : "secondary"}
                    className="mt-2"
                  >
                    {test.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`edit/${test.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePublishMutation.mutate({
                          testId: test.id,
                          isPublished: test.is_published,
                        });
                      }}
                    >
                      {test.is_published ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Publish
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(test);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              {test.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {test.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <HelpCircle className="h-4 w-4" />
                  <span>{moduleStats?.[test.id] || 0} questions</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {formatDistanceToNow(new Date(test.updated_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Practice Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{testToDelete?.name}"? This action
              cannot be undone and will remove all associated modules and
              questions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => testToDelete && deleteMutation.mutate(testToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BluebookTestList;

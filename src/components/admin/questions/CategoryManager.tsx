import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function CategoryManager() {
  const [newCategory, setNewCategory] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories with question count
  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories-with-counts'],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from('question_categories')
        .select('*')
        .order('name');
      
      if (error) throw error;

      // Get question counts for each category
      const countsPromises = cats.map(async (cat) => {
        const { count } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', cat.id);
        return { ...cat, questionCount: count || 0 };
      });

      return Promise.all(countsPromises);
    }
  });

  // Add category mutation
  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from('question_categories')
        .insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Category added' });
      setNewCategory('');
      queryClient.invalidateQueries({ queryKey: ['categories-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['question-categories'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('question_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Category deleted' });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['categories-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['question-categories'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    addMutation.mutate(newCategory.trim());
  };

  const getCategoryColor = (name: string) => {
    const colors: Record<string, string> = {
      'Algebra': 'bg-blue-500/10 text-blue-500',
      'Geometry': 'bg-green-500/10 text-green-500',
      'Statistics': 'bg-purple-500/10 text-purple-500',
      'Reading Comprehension': 'bg-orange-500/10 text-orange-500',
      'Grammar/Writing': 'bg-pink-500/10 text-pink-500',
    };
    return colors[name] || 'bg-gray-500/10 text-gray-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new category */}
          <div className="flex gap-2">
            <Input
              placeholder="New category name..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={addMutation.isPending || !newCategory.trim()}>
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Category list */}
          <div className="space-y-2">
            {categories?.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge className={getCategoryColor(cat.name)}>{cat.name}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {cat.questionCount} questions
                  </span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setDeleteId(cat.id)}
                  disabled={cat.questionCount > 0}
                  title={cat.questionCount > 0 ? 'Cannot delete - has questions' : 'Delete category'}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

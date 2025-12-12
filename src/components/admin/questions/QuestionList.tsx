import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, Youtube, Image, Search, FileQuestion } from 'lucide-react';
import { MathText } from '@/components/MathText';

interface QuestionListProps {
  onEdit: (question: any) => void;
  questionSet?: '68' | 'CB';
}

export function QuestionList({ onEdit, questionSet = '68' }: QuestionListProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['question-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch questions based on question set
  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', questionSet, categoryFilter, difficultyFilter, search],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select(`
          *,
          category:question_categories(name)
        `)
        .eq('is_original', true)
        .order('question_id');

      // Filter by question set
      if (questionSet === '68') {
        query = query.eq('question_set', '68');
      } else {
        query = query.eq('question_set', 'CollegeBoard');
      }

      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      if (difficultyFilter !== 'all') {
        query = query.eq('difficulty_level', difficultyFilter);
      }

      if (search) {
        query = query.or(`question_id.ilike.%${search}%,question_text.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const getDifficultyColor = (difficulty: string | null) => {
    const colors: Record<string, string> = {
      'easy': 'bg-green-500/10 text-green-600 border-green-500/20',
      'medium': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'hard': 'bg-red-500/10 text-red-600 border-red-500/20',
    };
    return colors[difficulty?.toLowerCase() || ''] || 'bg-muted text-muted-foreground';
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Question deleted' });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions-count'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('questions')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: `${selectedIds.size} questions deleted` });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['questions-count'] });
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (questions && selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else if (questions) {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const colors: Record<string, string> = {
      'Algebra': 'bg-blue-500/10 text-blue-500',
      'Geometry': 'bg-green-500/10 text-green-500',
      'Statistics': 'bg-purple-500/10 text-purple-500',
      'Reading Comprehension': 'bg-orange-500/10 text-orange-500',
      'Grammar/Writing': 'bg-pink-500/10 text-pink-500',
    };
    return colors[categoryName] || 'bg-gray-500/10 text-gray-500';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading questions...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle>{questionSet === '68' ? '68 Questions' : 'CollegeBoard Questions'} ({questions?.length || 0})</CardTitle>
            <div className="flex flex-wrap gap-2 items-center">
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-40"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {questionSet === 'CB' && (
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {questions && questions.length > 0 ? (
            <div className="rounded-md border overflow-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={questions.length > 0 && selectedIds.size === questions.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-24">ID</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-36">Category</TableHead>
                    {questionSet === 'CB' && <TableHead className="w-24">Difficulty</TableHead>}
                    <TableHead className="w-28">Type</TableHead>
                    <TableHead className="w-20">Media</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => (
                    <TableRow key={q.id} className={selectedIds.has(q.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(q.id)}
                          onCheckedChange={() => toggleSelect(q.id)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{q.question_id}</TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate">
                          <MathText text={q.question_text} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getCategoryColor(q.category?.name || '')}>
                          {q.category?.name || 'N/A'}
                        </Badge>
                      </TableCell>
                      {questionSet === 'CB' && (
                        <TableCell>
                          <Badge variant="outline" className={getDifficultyColor(q.difficulty_level)}>
                            {q.difficulty_level || 'N/A'}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant="outline">
                          {q.question_type === 'multiple_choice' ? 'MC' : 'Fill'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {q.question_image_url && (
                            <Image className="h-4 w-4 text-muted-foreground" />
                          )}
                          {q.video_url && (
                            <Youtube className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(q)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(q.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No questions found</p>
              <p className="text-sm">Click "Add Question" to create your first question</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this question and all its variations. This action cannot be undone.
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

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Questions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} questions and all their variations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedIds.size} Questions`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import { useRef, useEffect } from 'react';
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
import { useMarqueeSelection } from '@/hooks/useMarqueeSelection';
import { Edit, Trash2, Youtube, Image, Search, FileQuestion } from 'lucide-react';
import { MathText } from '@/components/MathText';
import { useState } from 'react';

interface QuestionListProps {
  onEdit: (question: any) => void;
  questionSet?: '68' | 'CB' | '150' | 'english';
}

export function QuestionList({ onEdit, questionSet = '68' }: QuestionListProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tableContainerRef = useRef<HTMLDivElement>(null);

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

  // Fetch questions based on question set (excluding bluebook questions)
  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions', questionSet, categoryFilter, difficultyFilter, search],
    queryFn: async () => {
      // First, get all question IDs that are in bluebook tests
      const { data: bluebookQuestionIds } = await supabase
        .from('bluebook_module_questions')
        .select('question_id');
      
      const excludeIds = bluebookQuestionIds?.map(q => q.question_id).filter(Boolean) || [];

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
      } else if (questionSet === '150') {
        query = query.eq('question_set', 'SATMathTraining800');
      } else if (questionSet === 'english') {
        query = query.eq('subject', 'english');
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

      // Exclude bluebook questions
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Marquee selection hook
  const {
    selectedIds,
    setSelectedIds,
    marquee,
    getMarqueeRect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleRowClick,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  } = useMarqueeSelection({
    items: questions || [],
    getItemId: (q) => q.id,
    containerRef: tableContainerRef,
    rowSelector: 'tbody tr',
  });

  // Click outside to deselect
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        tableContainerRef.current &&
        !tableContainerRef.current.contains(target) &&
        !target.closest('[role="dialog"]') &&
        !target.closest('button')
      ) {
        clearSelection();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSelection]);

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

  const marqueeRect = getMarqueeRect();

  return (
    <>
      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
              <CardTitle className="text-base md:text-xl">
                  {questionSet === '68' ? '68 Questions' : questionSet === '150' ? '150 Hard Questions' : questionSet === 'english' ? 'English Questions' : 'CB Questions'} ({questions?.length || 0})
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 hidden md:block">
                  Tip: Drag to select multiple • Shift+click for range
                </p>
              </div>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 md:mr-1" />
                  <span className="hidden md:inline">Delete</span> ({selectedIds.size})
                </Button>
              )}
            </div>
            {/* Filters - Stack on mobile */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 w-full sm:w-40"
                />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="flex-1 sm:w-36">
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
                {(questionSet === 'CB' || questionSet === '150' || questionSet === 'english') && (
                  <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                    <SelectTrigger className="flex-1 sm:w-28">
                      <SelectValue placeholder="Diff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          {questions && questions.length > 0 ? (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-2">
                {questions.map((q) => (
                  <div 
                    key={q.id}
                    className={`p-3 rounded-lg border ${selectedIds.has(q.id) ? 'bg-primary/10 border-primary/30' : 'bg-card'}`}
                    onClick={() => toggleSelect(q.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-medium">{q.question_id}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {q.question_type === 'multiple_choice' ? 'MC' : 'Fill'}
                          </Badge>
                          {q.question_image_url && <Image className="h-3 w-3 text-muted-foreground" />}
                          {q.video_url && <Youtube className="h-3 w-3 text-red-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          <MathText text={q.question_text} />
                        </p>
                        <div className="flex gap-1.5 mt-2 flex-wrap">
                          <Badge variant="secondary" className={`text-[10px] ${getCategoryColor(q.category?.name || '')}`}>
                            {q.category?.name || 'N/A'}
                          </Badge>
                          {(questionSet === 'CB' || questionSet === '150') && q.difficulty_level && (
                            <Badge variant="outline" className={`text-[10px] ${getDifficultyColor(q.difficulty_level)}`}>
                              {q.difficulty_level}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(q)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(q.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div 
                ref={tableContainerRef}
                className="hidden md:block rounded-md border overflow-auto max-h-[60vh] relative select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                {/* Marquee selection box */}
                {marquee.isSelecting && marqueeRect.width > 5 && marqueeRect.height > 5 && (
                  <div
                    className="absolute pointer-events-none bg-primary/20 border-2 border-primary/50 z-50"
                    style={{
                      left: marqueeRect.left,
                      top: marqueeRect.top,
                      width: marqueeRect.width,
                      height: marqueeRect.height,
                    }}
                  />
                )}
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
                      {(questionSet === 'CB' || questionSet === '150') && <TableHead className="w-24">Difficulty</TableHead>}
                      <TableHead className="w-28">Type</TableHead>
                      <TableHead className="w-20">Media</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q, index) => (
                      <TableRow 
                        key={q.id} 
                        className={`cursor-pointer ${selectedIds.has(q.id) ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                        onClick={(e) => handleRowClick(index, q.id, e)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
                        {(questionSet === 'CB' || questionSet === '150') && (
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
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
            </>
          ) : (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <FileQuestion className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 opacity-50" />
              <p>No questions found</p>
              <p className="text-sm">Tap "Add" to create your first question</p>
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

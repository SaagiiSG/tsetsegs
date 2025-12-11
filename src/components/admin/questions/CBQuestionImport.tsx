import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Loader2, CheckCircle, XCircle, Edit2, Save, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker using unpkg which has the latest versions
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface ParsedQuestion {
  pageNumber: number;
  question_id: string;
  domain: string;
  skill: string;
  difficulty: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  rationale: string;
  status: 'pending' | 'parsing' | 'success' | 'error';
  error?: string;
  isEditing?: boolean;
  pageImageBase64?: string;
}

const DOMAINS = [
  'Advanced Math',
  'Algebra', 
  'Geometry and Trigonometry',
  'Data Analysis'
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

export function CBQuestionImport() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setParsedQuestions([]);
      setParseProgress(0);
    } else {
      toast.error('Please select a PDF file');
    }
  };

  const convertPageToBase64 = async (pdf: pdfjsLib.PDFDocumentProxy, pageNum: number): Promise<string> => {
    const page = await pdf.getPage(pageNum);
    const scale = 2; // Higher scale for better quality
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas
    };
    
    await page.render(renderContext as any).promise;
    
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const parseQuestion = async (imageBase64: string, pageNumber: number): Promise<ParsedQuestion> => {
    const { data, error } = await supabase.functions.invoke('parse-cb-question', {
      body: { imageBase64, pageNumber }
    });

    if (error || !data?.success) {
      return {
        pageNumber,
        question_id: '',
        domain: '',
        skill: '',
        difficulty: '',
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: '',
        rationale: '',
        status: 'error',
        error: error?.message || data?.error || 'Failed to parse',
        pageImageBase64: imageBase64
      };
    }

    return {
      pageNumber,
      ...data.question,
      status: 'success',
      pageImageBase64: imageBase64
    };
  };

  const startParsing = async () => {
    if (!file) return;

    setIsParsing(true);
    setParseProgress(0);
    setParsedQuestions([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;
      setTotalPages(numPages);

      // Initialize all questions as pending
      const initialQuestions: ParsedQuestion[] = Array.from({ length: numPages }, (_, i) => ({
        pageNumber: i + 1,
        question_id: '',
        domain: '',
        skill: '',
        difficulty: '',
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: '',
        rationale: '',
        status: 'pending'
      }));
      setParsedQuestions(initialQuestions);

      // Parse pages one by one (to avoid rate limits)
      for (let i = 0; i < numPages; i++) {
        const pageNum = i + 1;
        
        // Update status to parsing
        setParsedQuestions(prev => prev.map((q, idx) => 
          idx === i ? { ...q, status: 'parsing' } : q
        ));

        try {
          const imageBase64 = await convertPageToBase64(pdf, pageNum);
          const result = await parseQuestion(imageBase64, pageNum);
          
          setParsedQuestions(prev => prev.map((q, idx) => 
            idx === i ? result : q
          ));
        } catch (err) {
          setParsedQuestions(prev => prev.map((q, idx) => 
            idx === i ? { ...q, status: 'error', error: String(err) } : q
          ));
        }

        setParseProgress(((i + 1) / numPages) * 100);
        
        // Small delay between requests to avoid rate limiting
        if (i < numPages - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(`Parsed ${numPages} pages`);
    } catch (err) {
      console.error('PDF parsing error:', err);
      toast.error('Failed to parse PDF');
    } finally {
      setIsParsing(false);
    }
  };

  const updateQuestion = (index: number, field: keyof ParsedQuestion, value: string) => {
    setParsedQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const toggleEdit = (index: number) => {
    setParsedQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, isEditing: !q.isEditing } : q
    ));
  };

  const removeQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const saveMutation = useMutation({
    mutationFn: async (questions: ParsedQuestion[]) => {
      // Filter only valid questions with required fields
      const validQuestions = questions.filter(q => 
        q.status === 'success' && 
        q.question_text && 
        q.correct_answer && 
        ['A', 'B', 'C', 'D'].includes(q.correct_answer.toUpperCase())
      );
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions to save. Ensure all questions have text and a correct answer (A, B, C, or D).');
      }
      
      // Get the highest existing CB question number
      const { data: existingQuestions } = await supabase
        .from('questions')
        .select('question_id')
        .like('question_id', 'CB%')
        .order('question_id', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existingQuestions?.[0]?.question_id) {
        const match = existingQuestions[0].question_id.match(/CB(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const questionsToInsert = validQuestions.map((q, idx) => ({
        question_id: `CB${String(nextNumber + idx).padStart(4, '0')}`,
        question_text: q.question_text,
        question_type: 'multiple_choice',
        multiple_choice_options: {
          A: q.option_a || '',
          B: q.option_b || '',
          C: q.option_c || '',
          D: q.option_d || ''
        },
        answer: q.correct_answer.toUpperCase(),
        question_set: 'CollegeBoard',
        original_cb_id: q.question_id || null,
        subtopic: q.skill || null,
        difficulty_level: q.difficulty || null,
        rationale: q.rationale || null,
        is_active: true,
        is_original: true
      }));

      const { error } = await supabase
        .from('questions')
        .insert(questionsToInsert);

      if (error) throw error;
      return questionsToInsert.length;
    },
    onSuccess: (count) => {
      toast.success(`Saved ${count} questions to database`);
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setParsedQuestions([]);
      setFile(null);
    },
    onError: (error) => {
      toast.error('Failed to save questions: ' + error.message);
    }
  });

  const validCount = parsedQuestions.filter(q => 
    q.status === 'success' && 
    q.question_text && 
    q.correct_answer && 
    ['A', 'B', 'C', 'D'].includes(q.correct_answer.toUpperCase())
  ).length;
  const successCount = parsedQuestions.filter(q => q.status === 'success').length;
  const errorCount = parsedQuestions.filter(q => q.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import CollegeBoard Questions
          </CardTitle>
          <CardDescription>
            Upload a CollegeBoard PDF export. The AI will extract questions, options, answers, and explanations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="pdf-upload">Select PDF File</Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isParsing}
              />
            </div>
            <Button 
              onClick={startParsing} 
              disabled={!file || isParsing}
              className="mt-6"
            >
              {isParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Start Parsing
                </>
              )}
            </Button>
          </div>

          {file && (
            <p className="text-sm text-muted-foreground">
              Selected: {file.name}
            </p>
          )}

          {isParsing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Parsing pages...</span>
                <span>{Math.round(parseProgress)}%</span>
              </div>
              <Progress value={parseProgress} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {parsedQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Parsed Questions</CardTitle>
                <CardDescription>
                  Review and edit parsed questions before saving
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {successCount} Success
                  </Badge>
                  {errorCount > 0 && (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      {errorCount} Errors
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={() => saveMutation.mutate(parsedQuestions)}
                  disabled={validCount === 0 || saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save {validCount} Questions
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-20">Status</TableHead>
                    <TableHead className="w-24">CB ID</TableHead>
                    <TableHead className="w-32">Domain</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead className="w-20">Answer</TableHead>
                    <TableHead className="w-24">Difficulty</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedQuestions.map((q, idx) => (
                    <TableRow key={idx} className={q.status === 'error' ? 'bg-destructive/10' : ''}>
                      <TableCell>{q.pageNumber}</TableCell>
                      <TableCell>
                        {q.status === 'pending' && <Badge variant="secondary">Pending</Badge>}
                        {q.status === 'parsing' && <Loader2 className="h-4 w-4 animate-spin" />}
                        {q.status === 'success' && <Badge className="bg-green-500">OK</Badge>}
                        {q.status === 'error' && <Badge variant="destructive">Error</Badge>}
                      </TableCell>
                      <TableCell>
                        {q.isEditing ? (
                          <Input
                            value={q.question_id}
                            onChange={(e) => updateQuestion(idx, 'question_id', e.target.value)}
                            className="w-20"
                          />
                        ) : (
                          <code className="text-xs">{q.question_id || '-'}</code>
                        )}
                      </TableCell>
                      <TableCell>
                        {q.isEditing ? (
                          <Select
                            value={q.domain}
                            onValueChange={(v) => updateQuestion(idx, 'domain', v)}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DOMAINS.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs">{q.domain || '-'}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {q.isEditing ? (
                          <Textarea
                            value={q.question_text}
                            onChange={(e) => updateQuestion(idx, 'question_text', e.target.value)}
                            className="min-h-[60px] text-xs"
                          />
                        ) : (
                          <span className="text-xs line-clamp-2">
                            {q.question_text || q.error || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {q.isEditing ? (
                          <Select
                            value={q.correct_answer}
                            onValueChange={(v) => updateQuestion(idx, 'correct_answer', v)}
                          >
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {['A', 'B', 'C', 'D'].map(a => (
                                <SelectItem key={a} value={a}>{a}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">{q.correct_answer || '-'}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {q.isEditing ? (
                          <Select
                            value={q.difficulty}
                            onValueChange={(v) => updateQuestion(idx, 'difficulty', v)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DIFFICULTIES.map(d => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={
                            q.difficulty === 'easy' ? 'secondary' :
                            q.difficulty === 'medium' ? 'default' : 'destructive'
                          }>
                            {q.difficulty || '-'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleEdit(idx)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeQuestion(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

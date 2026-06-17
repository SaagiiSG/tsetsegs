import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Search, Check, X, Loader2, List, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SecurityWrapper } from '@/components/security/SecurityWrapper';

interface VocabularyWord {
  id: string;
  word_number: number;
  english: string;
  mongolian: string;
  subject: string;
}

type VocabType = 'english' | 'math';

const StudentVocabulary = () => {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [vocabType, setVocabType] = useState<VocabType>('math');
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch all vocabulary from database
  const { data: allVocabulary = [], isLoading } = useQuery({
    queryKey: ['vocabulary-words'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vocabulary_words')
        .select('*')
        .eq('is_active', true)
        .order('word_number');
      
      if (error) throw error;
      return data as VocabularyWord[];
    },
    staleTime: 10 * 60 * 1000
  });

  // Filter vocabulary by selected type
  const vocabulary = useMemo(() => {
    return allVocabulary.filter(word => word.subject === vocabType);
  }, [allVocabulary, vocabType]);

  // Fetch learned words for this student
  const { data: learnedWords = [] } = useQuery({
    queryKey: ['student-vocab-progress', student?.id],
    queryFn: async () => {
      if (!student?.id) return [];
      const { data, error } = await supabase
        .from('student_vocabulary_progress')
        .select('word_id, confidence_level')
        .eq('student_account_id', student.id);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!student?.id,
  });

  const learnedWordIds = new Set(learnedWords.map(w => w.word_id));
  const totalWords = vocabulary.length;
  
  // Calculate progress for current vocab type
  const learnedInCurrentType = vocabulary.filter(w => learnedWordIds.has(w.id)).length;
  const progressPercent = totalWords > 0 ? Math.round((learnedInCurrentType / totalWords) * 100) : 0;

  // Reset index when switching vocab types
  const handleVocabTypeChange = (type: VocabType) => {
    setVocabType(type);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedAnswer(null);
    setIsShuffled(false);
    setShuffledIndices([]);
  };

  // Get current word based on shuffle state
  const getCurrentWord = useCallback(() => {
    if (!vocabulary.length) return null;
    const safeIndex = Math.min(currentIndex, vocabulary.length - 1);
    if (isShuffled && shuffledIndices.length > 0) {
      return vocabulary[shuffledIndices[safeIndex]];
    }
    return vocabulary[safeIndex];
  }, [currentIndex, isShuffled, shuffledIndices, vocabulary]);

  const currentWord = getCurrentWord();

  // Generate 4 multiple choice options
  const multipleChoiceOptions = useMemo(() => {
    if (!currentWord || !vocabulary.length) return [];
    
    const correctAnswer = currentWord;
    const wrongAnswers: VocabularyWord[] = [];
    const usedIds = new Set([correctAnswer.id]);
    
    while (wrongAnswers.length < 3 && vocabulary.length > 3) {
      const randomIndex = Math.floor(Math.random() * vocabulary.length);
      const word = vocabulary[randomIndex];
      if (!usedIds.has(word.id)) {
        usedIds.add(word.id);
        wrongAnswers.push(word);
      }
    }
    
    const allOptions = [correctAnswer, ...wrongAnswers];
    for (let i = allOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allOptions[i], allOptions[j]] = [allOptions[j], allOptions[i]];
    }
    
    return allOptions;
  }, [currentWord, currentIndex, isShuffled, vocabulary]);

  // Filter words by search
  const filteredWords = vocabulary.filter(word => 
    word.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
    word.mongolian.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    if (totalWords === 0) return;
    setIsFlipped(false);
    setSelectedAnswer(null);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % totalWords);
    }, 150);
  };

  const handlePrev = () => {
    if (totalWords === 0) return;
    setIsFlipped(false);
    setSelectedAnswer(null);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + totalWords) % totalWords);
    }, 150);
  };

  const handleSelectAnswer = async (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    
    const selectedOption = multipleChoiceOptions[index];
    const isCorrect = isCorrectAnswer(selectedOption);
    
    if (isCorrect && student?.id && currentWord) {
      try {
        const existingProgress = learnedWords.find(w => w.word_id === currentWord.id);
        
        if (existingProgress) {
          await supabase
            .from('student_vocabulary_progress')
            .update({
              review_count: (existingProgress as any).review_count + 1 || 1,
              last_reviewed_at: new Date().toISOString(),
              confidence_level: Math.min(5, existingProgress.confidence_level + 1),
              updated_at: new Date().toISOString(),
            })
            .eq('student_account_id', student.id)
            .eq('word_id', currentWord.id);
        } else {
          await supabase
            .from('student_vocabulary_progress')
            .insert({
              student_account_id: student.id,
              word_id: currentWord.id,
              confidence_level: 1,
              review_count: 1,
            });
        }
        
        queryClient.invalidateQueries({ queryKey: ['student-vocab-progress'] });
        queryClient.invalidateQueries({ queryKey: ['student-mastery-data'] });
      } catch (err) {
        console.error('Failed to track vocab progress:', err);
      }
    }
    
    setTimeout(() => {
      setIsFlipped(true);
    }, 500);
  };

  const handleShuffle = () => {
    if (totalWords === 0) return;
    const indices = [...Array(totalWords)].map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    setIsShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedAnswer(null);
  };

  const handleReset = () => {
    setIsShuffled(false);
    setShuffledIndices([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedAnswer(null);
  };

  const handleWordClick = (index: number) => {
    setCurrentIndex(index);
    setIsFlipped(false);
    setSelectedAnswer(null);
    setIsShuffled(false);
    setShuffledIndices([]);
    setSearchQuery('');
    setDrawerOpen(false);
  };

  const isCorrectAnswer = (option: VocabularyWord) => option.id === currentWord?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SecurityWrapper>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search vocabulary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 text-base"
            />
          </div>

          {/* Search Results Dropdown */}
          {searchQuery && (
            <Card className="p-2 max-h-60 overflow-y-auto">
              {filteredWords.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No words found
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredWords.map((word) => (
                    <button
                      key={word.id}
                      onClick={() => handleWordClick(vocabulary.indexOf(word))}
                      className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex items-center gap-3"
                    >
                      <span className="text-xs text-muted-foreground">#{word.word_number}</span>
                      <span className="font-medium">{word.english}</span>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Progress Bar + Vocab Type Toggle */}
          <div className="flex items-center gap-4">
            {/* Progress Section */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{learnedInCurrentType} / {totalWords} ({progressPercent}%)</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            {/* Vocab Type Toggle */}
            <div className="flex rounded-xl border-2 border-border bg-background p-1 shrink-0 shadow-sm">
              <Button
                variant={vocabType === 'english' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleVocabTypeChange('english')}
                className={cn(
                  "px-5 rounded-lg font-bold text-sm transition-all",
                  vocabType === 'english' && "shadow-md"
                )}
              >
                English
              </Button>
              <Button
                variant={vocabType === 'math' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleVocabTypeChange('math')}
                className={cn(
                  "px-5 rounded-lg font-bold text-sm transition-all",
                  vocabType === 'math' && "shadow-md"
                )}
              >
                Math
              </Button>
            </div>
          </div>

          {/* Empty State */}
          {totalWords === 0 ? (
            <Card className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No {vocabType} vocabulary yet</h3>
              <p className="text-muted-foreground text-sm">
                {vocabType === 'math' 
                  ? 'Math vocabulary words will appear here once added.'
                  : 'English vocabulary words will appear here once added.'}
              </p>
            </Card>
          ) : (
            <>
              {/* Current Word Info */}
              {currentWord && learnedWordIds.has(currentWord.id) && (
                <div className="flex justify-center">
                  <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-3 py-1.5 rounded-full">
                    <Check className="w-3 h-3" />
                    Already learned
                  </span>
                </div>
              )}

              {/* Flashcard */}
              <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                  <AnimatePresence mode="wait">
                    {!isFlipped ? (
                      <motion.div
                        key={`front-${currentIndex}-${vocabType}`}
                        initial={{ rotateY: -90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <Card className="w-full p-6 shadow-xl border-2">
                          <div className="space-y-6">
                            {/* English Word */}
                            <div className="text-center py-4">
                              <span className="text-xs text-muted-foreground font-medium">
                                #{currentWord?.word_number}
                              </span>
                              <p className="text-2xl md:text-3xl font-bold mt-2">
                                {currentWord?.english}
                              </p>
                            </div>
                            
                            {/* Multiple Choice Options */}
                            <div className="grid grid-cols-1 gap-2">
                              {multipleChoiceOptions.map((option, idx) => {
                                const isSelected = selectedAnswer === idx;
                                const isCorrect = isCorrectAnswer(option);
                                const showResult = selectedAnswer !== null;
                                
                                return (
                                  <button
                                    key={option.id}
                                    onClick={() => handleSelectAnswer(idx)}
                                    disabled={selectedAnswer !== null}
                                    className={cn(
                                      "w-full p-3 rounded-lg border-2 text-left transition-all",
                                      "hover:bg-accent hover:border-primary/50",
                                      !showResult && "border-border",
                                      showResult && isCorrect && "border-green-500 bg-green-500/10",
                                      showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                                      showResult && !isSelected && !isCorrect && "opacity-50"
                                    )}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={cn(
                                        "text-sm font-medium",
                                        showResult && isCorrect && "text-green-600 dark:text-green-400",
                                        showResult && isSelected && !isCorrect && "text-red-600 dark:text-red-400"
                                      )}>
                                        {option.mongolian}
                                      </span>
                                      {showResult && isCorrect && (
                                        <Check className="w-4 h-4 text-green-500" />
                                      )}
                                      {showResult && isSelected && !isCorrect && (
                                        <X className="w-4 h-4 text-red-500" />
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            
                            {selectedAnswer === null && (
                              <p className="text-center text-xs text-muted-foreground">
                                Select the correct Mongolian translation
                              </p>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`back-${currentIndex}-${vocabType}`}
                        initial={{ rotateY: -90, opacity: 0 }}
                        animate={{ rotateY: 0, opacity: 1 }}
                        exit={{ rotateY: 90, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        <Card className="w-full p-6 shadow-xl border-2 bg-primary/5 border-primary/30">
                          <div className="space-y-4 text-center py-8">
                            <span className="text-xs text-muted-foreground font-medium">
                              #{currentWord?.word_number}
                            </span>
                            <p className="text-xl font-semibold text-muted-foreground">
                              {currentWord?.english}
                            </p>
                            <div className="pt-4 border-t">
                              <p className="text-lg md:text-xl font-bold text-primary">
                                {currentWord?.mongolian}
                              </p>
                            </div>
                            {selectedAnswer !== null && (
                              <div className={cn(
                                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
                                isCorrectAnswer(multipleChoiceOptions[selectedAnswer])
                                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                  : "bg-red-500/20 text-red-600 dark:text-red-400"
                              )}>
                                {isCorrectAnswer(multipleChoiceOptions[selectedAnswer]) ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Correct!
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4" />
                                    Incorrect
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-center gap-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handlePrev}
                  className="h-12 w-12"
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                
                <div className="flex items-center gap-2 min-w-[100px] justify-center">
                  <span className="text-lg font-semibold">{Math.min(currentIndex + 1, totalWords)}</span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">{totalWords}</span>
                </div>
                
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleNext}
                  className="h-12 w-12"
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3">
                <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <List className="w-4 h-4" />
                      Word List
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[320px] sm:w-[400px] p-0">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        {vocabType === 'english' ? 'English' : 'Math'} Vocabulary
                        <span className="text-sm font-normal text-muted-foreground">
                          ({totalWords} words)
                        </span>
                      </SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-80px)]">
                      <div className="p-2">
                        {vocabulary.map((word, idx) => {
                          const isLearned = learnedWordIds.has(word.id);
                          const isCurrent = idx === currentIndex && !isShuffled;
                          
                          return (
                            <button
                              key={word.id}
                              onClick={() => handleWordClick(idx)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3",
                                "hover:bg-accent",
                                isCurrent && "bg-primary/10 border border-primary/30"
                              )}
                            >
                              <span className={cn(
                                "w-8 h-8 flex items-center justify-center rounded-full text-xs font-medium shrink-0",
                                isLearned 
                                  ? "bg-green-500/20 text-green-600" 
                                  : "bg-muted text-muted-foreground"
                              )}>
                                {isLearned ? <Check className="w-4 h-4" /> : word.word_number}
                              </span>
                              <p className="font-medium truncate flex-1">{word.english}</p>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
                
                <Button 
                  variant={isShuffled ? "default" : "outline"}
                  onClick={handleShuffle}
                  className="gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              {/* Word List Preview (Below Flashcard) */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">Quick Browse</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setDrawerOpen(true)}
                    className="text-xs"
                  >
                    View All
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {vocabulary.slice(0, 12).map((word, idx) => {
                    const isLearned = learnedWordIds.has(word.id);
                    const isCurrent = idx === currentIndex && !isShuffled;
                    
                    return (
                      <button
                        key={word.id}
                        onClick={() => handleWordClick(idx)}
                        className={cn(
                          "p-2 rounded-lg text-left transition-all text-sm",
                          "hover:bg-accent border",
                          isCurrent && "bg-primary/10 border-primary/30",
                          !isCurrent && "border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {isLearned && <Check className="w-3 h-3 text-green-500" />}
                          <span className="font-medium truncate">{word.english}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{word.mongolian}</p>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </>
          )}

        </div>
      </div>
    </SecurityWrapper>
  );
};

export default StudentVocabulary;

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Search, BookOpen, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SecurityWrapper } from '@/components/security/SecurityWrapper';

interface VocabularyWord {
  id: string;
  word_number: number;
  english: string;
  mongolian: string;
}

const StudentVocabulary = () => {
  const { student } = useStudentAuth();
  const queryClient = useQueryClient();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isShuffled, setIsShuffled] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  // Fetch vocabulary from database
  const { data: vocabulary = [], isLoading } = useQuery({
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
    staleTime: 10 * 60 * 1000 // Cache for 10 minutes
  });

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

  // Get current word based on shuffle state
  const getCurrentWord = useCallback(() => {
    if (!vocabulary.length) return null;
    if (isShuffled && shuffledIndices.length > 0) {
      return vocabulary[shuffledIndices[currentIndex]];
    }
    return vocabulary[currentIndex];
  }, [currentIndex, isShuffled, shuffledIndices, vocabulary]);

  const currentWord = getCurrentWord();

  // Generate 4 multiple choice options (1 correct + 3 random wrong)
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
    
    // Shuffle all 4 options
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
    setIsFlipped(false);
    setSelectedAnswer(null);
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % totalWords);
    }, 150);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setSelectedAnswer(null);
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + totalWords) % totalWords);
    }, 150);
  };

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleSelectAnswer = async (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    
    const selectedOption = multipleChoiceOptions[index];
    const isCorrect = isCorrectAnswer(selectedOption);
    
    // Track progress if correct and student is logged in
    if (isCorrect && student?.id && currentWord) {
      try {
        // Upsert progress - increment confidence if already learned
        const existingProgress = learnedWords.find(w => w.word_id === currentWord.id);
        
        if (existingProgress) {
          // Update existing - increment review count
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
          // Insert new progress
          await supabase
            .from('student_vocabulary_progress')
            .insert({
              student_account_id: student.id,
              word_id: currentWord.id,
              confidence_level: 1,
              review_count: 1,
            });
        }
        
        // Invalidate queries to refresh stats
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
  };

  const isCorrectAnswer = (option: VocabularyWord) => option.id === currentWord?.id;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!vocabulary.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No vocabulary words available</p>
      </div>
    );
  }

  return (
    <SecurityWrapper>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold">SAT Vocabulary</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              {totalWords} words • {learnedWordIds.size} learned ({totalWords > 0 ? Math.round((learnedWordIds.size / totalWords) * 100) : 0}%)
            </p>
            {currentWord && learnedWordIds.has(currentWord.id) && (
              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                <Check className="w-3 h-3" />
                Already learned
              </span>
            )}
          </div>

          {/* Flashcard */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-md">
              <AnimatePresence mode="wait">
                {!isFlipped ? (
                  <motion.div
                    key={`front-${currentIndex}`}
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
                    key={`back-${currentIndex}`}
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
              <span className="text-lg font-semibold">{currentIndex + 1}</span>
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

          {/* Word List Search */}
          <Card className="p-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search words..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchQuery && (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {filteredWords.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No words found
                    </p>
                  ) : (
                    filteredWords.map((word) => (
                      <button
                        key={word.id}
                        onClick={() => handleWordClick(vocabulary.indexOf(word))}
                        className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors flex justify-between items-center gap-4"
                      >
                        <span className="font-medium">{word.english}</span>
                        <span className="text-sm text-muted-foreground truncate max-w-[50%]">
                          {word.mongolian}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Progress indicator */}
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / totalWords) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </SecurityWrapper>
  );
};

export default StudentVocabulary;

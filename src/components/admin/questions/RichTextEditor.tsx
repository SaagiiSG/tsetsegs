import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bold, Italic, Subscript, Superscript, Pi, Eye } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder, className, minHeight = '120px' }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [mathInput, setMathInput] = useState('');
  const [mathPopoverOpen, setMathPopoverOpen] = useState(false);

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);

    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  const wrapSelection = useCallback((wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
      const newText = value.substring(0, start) + wrapper + selectedText + wrapper + value.substring(end);
      onChange(newText);
    } else {
      insertText(wrapper, wrapper);
    }
  }, [value, onChange, insertText]);

  const insertMath = useCallback(() => {
    if (mathInput.trim()) {
      insertText(`$${mathInput}$`);
      setMathInput('');
      setMathPopoverOpen(false);
    }
  }, [mathInput, insertText]);

  // Render text with math expressions
  const renderPreview = useCallback((text: string) => {
    // Split by math delimiters $ ... $
    const parts = text.split(/(\$[^$]+\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const mathContent = part.slice(1, -1);
        try {
          const html = katex.renderToString(mathContent, {
            throwOnError: false,
            displayMode: false,
          });
          return (
            <span 
              key={index} 
              dangerouslySetInnerHTML={{ __html: html }}
              className="mx-1"
            />
          );
        } catch (e) {
          return <span key={index} className="text-destructive">{part}</span>;
        }
      }
      
      // Handle basic formatting
      let formatted = part;
      // Bold **text**
      formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic *text*
      formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Subscript ~text~
      formatted = formatted.replace(/~([^~]+)~/g, '<sub>$1</sub>');
      // Superscript ^text^
      formatted = formatted.replace(/\^([^^]+)\^/g, '<sup>$1</sup>');
      
      return (
        <span 
          key={index} 
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  }, []);

  const mathExamples = [
    { label: 'Fraction', latex: '\\frac{a}{b}' },
    { label: 'Square root', latex: '\\sqrt{x}' },
    { label: 'Exponent', latex: 'x^{2}' },
    { label: 'Subscript', latex: 'x_{n}' },
    { label: 'Sum', latex: '\\sum_{i=1}^{n}' },
    { label: 'Integral', latex: '\\int_{a}^{b}' },
    { label: 'Pi', latex: '\\pi' },
    { label: 'Infinity', latex: '\\infty' },
    { label: 'Plus/Minus', latex: '\\pm' },
    { label: 'Not equal', latex: '\\neq' },
    { label: 'Less/Equal', latex: '\\leq' },
    { label: 'Greater/Equal', latex: '\\geq' },
  ];

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 border rounded-md bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelection('**')}
          title="Bold (**text**)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelection('*')}
          title="Italic (*text*)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelection('^')}
          title="Superscript (^text^)"
        >
          <Superscript className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelection('~')}
          title="Subscript (~text~)"
        >
          <Subscript className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Popover open={mathPopoverOpen} onOpenChange={setMathPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              title="Insert Math (LaTeX)"
            >
              <Pi className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div>
                <Label>LaTeX Expression</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={mathInput}
                    onChange={(e) => setMathInput(e.target.value)}
                    placeholder="e.g., \frac{1}{2}"
                    onKeyDown={(e) => e.key === 'Enter' && insertMath()}
                  />
                  <Button type="button" size="sm" onClick={insertMath}>
                    Insert
                  </Button>
                </div>
              </div>
              
              {mathInput && (
                <div className="p-2 border rounded bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Preview:</Label>
                  <div className="mt-1 text-lg">
                    {(() => {
                      try {
                        const html = katex.renderToString(mathInput, { throwOnError: false });
                        return <span dangerouslySetInnerHTML={{ __html: html }} />;
                      } catch {
                        return <span className="text-destructive">Invalid LaTeX</span>;
                      }
                    })()}
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-xs text-muted-foreground">Quick Insert:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {mathExamples.map((ex) => (
                    <Button
                      key={ex.latex}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setMathInput(ex.latex);
                      }}
                    >
                      {ex.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1" />

        <Button
          type="button"
          variant={showPreview ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
          title="Toggle Preview"
        >
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
      </div>

      {/* Editor / Preview */}
      {showPreview ? (
        <div className={`p-3 border rounded-md bg-background ${className}`} style={{ minHeight }}>
          {value ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {renderPreview(value)}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={className}
          style={{ minHeight }}
        />
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Use **bold**, *italic*, ^superscript^, ~subscript~, and $math$ for LaTeX expressions
      </p>
    </div>
  );
}

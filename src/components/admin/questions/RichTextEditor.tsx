import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Bold, Italic, Subscript, Superscript, Pi, Eye, Calculator } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { addStyles, EditableMathField } from 'react-mathquill';

// Initialize MathQuill styles
addStyles();

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

  // MathQuill config for the inline editor
  const mathQuillConfig = {
    autoCommands: 'pi theta alpha beta gamma sqrt nthroot sum prod int infty pm neq leq geq abs',
    autoOperatorNames: 'sin cos tan log ln exp',
    spaceBehavesLikeTab: true,
    leftRightIntoCmdGoes: 'up' as const,
    supSubsRequireOperand: true,
    charsThatBreakOutOfSupSub: '+-=<>',
  };

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
              title="Insert Math (Desmos-style editor)"
              className="gap-1"
            >
              <Calculator className="h-4 w-4" />
              <span className="text-xs">Math</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96" align="start">
            <div className="space-y-3">
              <div>
                <Label className="flex items-center gap-2">
                  <Pi className="h-4 w-4" />
                  Desmos-Style Math Editor
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Type naturally: / for fractions, sqrt for √, ^ for exponents
                </p>
              </div>
              
              {/* MathQuill Editor */}
              <div className="border rounded-md bg-background p-2 min-h-[48px]">
                <EditableMathField
                  latex={mathInput}
                  onChange={(mathField) => setMathInput(mathField.latex())}
                  config={mathQuillConfig}
                />
              </div>
              
              {/* Live Preview */}
              {mathInput && (
                <div className="p-2 border rounded bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Preview (as students see it):</Label>
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

              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setMathInput('');
                    setMathPopoverOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={insertMath}
                  disabled={!mathInput.trim()}
                >
                  Insert
                </Button>
              </div>
              
              {/* Quick Reference */}
              <div className="border-t pt-2">
                <Label className="text-xs text-muted-foreground">Quick shortcuts:</Label>
                <div className="grid grid-cols-3 gap-1 mt-1 text-xs text-muted-foreground">
                  <span>/ → fraction</span>
                  <span>sqrt → √</span>
                  <span>^ → exponent</span>
                  <span>_ → subscript</span>
                  <span>pi → π</span>
                  <span>theta → θ</span>
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
        Use **bold**, *italic*, ^superscript^, ~subscript~. Click "Math" for Desmos-style math input.
      </p>
    </div>
  );
}

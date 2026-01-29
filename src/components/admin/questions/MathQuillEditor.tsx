import { useEffect, useRef, useCallback, useState } from 'react';
import { addStyles, EditableMathField, StaticMathField } from 'react-mathquill';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// Initialize MathQuill styles
addStyles();

interface MathQuillEditorProps {
  value: string;
  onChange: (latex: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  minHeight?: string;
  readOnly?: boolean;
}

/**
 * A Desmos-style math editor powered by MathQuill.
 * 
 * Keyboard shortcuts (exactly like Desmos):
 * - `/` after content → creates fraction
 * - `sqrt` → square root with box
 * - `^` (Shift+6) → superscript/exponent
 * - `_` → subscript
 * - `pi`, `theta`, `alpha` → Greek symbols
 * - `sin`, `cos`, `tan`, `log`, `ln` → formatted operators
 * - Arrow keys → navigate between parts of expressions
 * - Space → exits current block (like Tab in Desmos)
 */
export function MathQuillEditor({
  value,
  onChange,
  placeholder = 'Type math here...',
  className,
  label,
  minHeight = '48px',
  readOnly = false,
}: MathQuillEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const mathFieldRef = useRef<any>(null);

  // MathQuill configuration matching Desmos behavior
  const config = {
    // Auto-convert typed commands to symbols
    autoCommands: 'pi theta alpha beta gamma delta epsilon sigma omega phi lambda sqrt nthroot sum prod int infty pm mp neq leq geq approx cdot times div abs',
    // Auto-format function names
    autoOperatorNames: 'sin cos tan cot sec csc arcsin arccos arctan log ln exp lim',
    // Space behaves like Tab - exits current block
    spaceBehavesLikeTab: true,
    // Arrow into sup/sub goes to the numerator/up position (Desmos behavior)
    leftRightIntoCmdGoes: 'up' as const,
    // Require something before ^ or _ (prevents x^^2 typos)
    supSubsRequireOperand: true,
    // Characters that break out of superscript/subscript
    charsThatBreakOutOfSupSub: '+-=<>',
    // Restrict MathQuill to only LaTeX commands
    restrictMismatchedBrackets: true,
    // Handler for changes
    handlers: {
      edit: (mathField: any) => {
        const latex = mathField.latex();
        onChange(latex);
      },
    },
  };

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Show placeholder when empty and not focused
  const showPlaceholder = !value && !isFocused;

  if (readOnly) {
    return (
      <div className={cn("mathquill-readonly", className)}>
        {label && <Label className="mb-2 block">{label}</Label>}
        {value ? (
          <StaticMathField>{value}</StaticMathField>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("mathquill-editor-wrapper space-y-1", className)}>
      {label && <Label className="block">{label}</Label>}
      <div
        className={cn(
          "mathquill-editor-container relative rounded-md border bg-background transition-all",
          isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
          "hover:border-primary/50"
        )}
        style={{ minHeight }}
      >
        <EditableMathField
          latex={value}
          onChange={(mathField) => {
            onChange(mathField.latex());
          }}
          config={config}
          mathquillDidMount={(mathField) => {
            mathFieldRef.current = mathField;
            // Add focus/blur listeners
            const textarea = mathField.el().querySelector('textarea');
            if (textarea) {
              textarea.addEventListener('focus', handleFocus);
              textarea.addEventListener('blur', handleBlur);
            }
          }}
        />
        {showPlaceholder && (
          <div className="pointer-events-none absolute inset-0 flex items-center px-3 text-muted-foreground text-sm">
            {placeholder}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Type naturally: / for fractions, sqrt for √, ^ for exponents, pi for π
      </p>
    </div>
  );
}

/**
 * Inline math field for embedding in text - smaller and more compact
 */
export function InlineMathField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (latex: string) => void;
  className?: string;
}) {
  const config = {
    autoCommands: 'pi theta alpha beta gamma sqrt nthroot sum prod int infty pm neq leq geq abs',
    autoOperatorNames: 'sin cos tan log ln exp',
    spaceBehavesLikeTab: true,
    leftRightIntoCmdGoes: 'up' as const,
    supSubsRequireOperand: true,
    charsThatBreakOutOfSupSub: '+-=<>',
  };

  return (
    <span className={cn("mathquill-inline inline-block", className)}>
      <EditableMathField
        latex={value}
        onChange={(mathField) => onChange(mathField.latex())}
        config={config}
      />
    </span>
  );
}

export default MathQuillEditor;

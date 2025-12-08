import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className = '' }: MathTextProps) {
  const renderedContent = useMemo(() => {
    if (!text) return null;
    
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
      // Line breaks
      formatted = formatted.replace(/\n/g, '<br/>');
      
      return (
        <span 
          key={index} 
          dangerouslySetInnerHTML={{ __html: formatted }}
        />
      );
    });
  }, [text]);

  return <span className={className}>{renderedContent}</span>;
}

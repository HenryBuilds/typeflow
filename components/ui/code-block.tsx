'use client';

import { useState, useEffect } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Simple syntax highlighting for TypeScript/JavaScript
function highlightCode(code: string, language: string): React.ReactNode[] {
  if (language === 'bash' || language === 'shell') {
    return highlightBash(code);
  }
  return highlightTypeScript(code);
}

function highlightBash(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    let key = 0;

    // Comments
    if (line.trim().startsWith('#')) {
      parts.push(
        <span key={key++} className="text-muted-foreground italic">
          {line}
        </span>
      );
    } else {
      // Split by parts and highlight commands
      const words = line.split(/(\s+)/);
      let isFirstWord = true;

      for (const word of words) {
        if (!word) continue;
        
        if (isFirstWord && word.trim() && !word.match(/^\s+$/)) {
          // Command
          parts.push(
            <span key={key++} className="text-chart-1 font-medium">
              {word}
            </span>
          );
          isFirstWord = false;
        } else if (word.startsWith('--') || word.startsWith('-')) {
          // Flags
          parts.push(
            <span key={key++} className="text-chart-3">
              {word}
            </span>
          );
        } else if (word.startsWith('$') || word.startsWith('~')) {
          // Variables
          parts.push(
            <span key={key++} className="text-chart-4">
              {word}
            </span>
          );
        } else {
          parts.push(<span key={key++}>{word}</span>);
        }
      }
    }

    return (
      <div key={i} className="leading-relaxed">
        {parts.length > 0 ? parts : line || '\u00A0'}
      </div>
    );
  });
}

function highlightTypeScript(code: string): React.ReactNode[] {
  const lines = code.split('\n');
  
  const keywords = new Set([
    'import', 'export', 'from', 'const', 'let', 'var', 'function', 'class', 
    'interface', 'type', 'extends', 'implements', 'return', 'if', 'else', 
    'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this',
    'async', 'await', 'try', 'catch', 'throw', 'typeof', 'instanceof',
    'true', 'false', 'null', 'undefined', 'default', 'as'
  ]);

  const types = new Set([
    'string', 'number', 'boolean', 'void', 'any', 'unknown', 'never',
    'Promise', 'Record', 'Array', 'INodeType', 'INodeTypeDescription',
    'IExecuteFunctions', 'INodeExecutionData', 'ICredentialType',
    'INodeProperties', 'IAuthenticateGeneric'
  ]);

  return lines.map((line, lineIndex) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      // Match patterns in order of priority
      let matched = false;

      // Comments
      const commentMatch = remaining.match(/^(\/\/.*)$/);
      if (commentMatch) {
        parts.push(
          <span key={key++} className="text-muted-foreground italic">
            {commentMatch[1]}
          </span>
        );
        remaining = '';
        matched = true;
      }

      // Strings (single, double, template)
      if (!matched) {
        const stringMatch = remaining.match(/^(['"`])((?:\\.|(?!\1)[^\\])*)\1/);
        if (stringMatch) {
          parts.push(
            <span key={key++} className="text-chart-1">
              {stringMatch[0]}
            </span>
          );
          remaining = remaining.slice(stringMatch[0].length);
          matched = true;
        }
      }

      // Numbers
      if (!matched) {
        const numberMatch = remaining.match(/^(\d+\.?\d*)/);
        if (numberMatch) {
          parts.push(
            <span key={key++} className="text-chart-4">
              {numberMatch[1]}
            </span>
          );
          remaining = remaining.slice(numberMatch[0].length);
          matched = true;
        }
      }

      // Words (keywords, types, identifiers)
      if (!matched) {
        const wordMatch = remaining.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)/);
        if (wordMatch) {
          const word = wordMatch[1];
          if (keywords.has(word)) {
            parts.push(
              <span key={key++} className="text-chart-3 font-medium">
                {word}
              </span>
            );
          } else if (types.has(word)) {
            parts.push(
              <span key={key++} className="text-chart-2">
                {word}
              </span>
            );
          } else {
            parts.push(<span key={key++}>{word}</span>);
          }
          remaining = remaining.slice(word.length);
          matched = true;
        }
      }

      // Operators and punctuation
      if (!matched) {
        const opMatch = remaining.match(/^([{}[\]().,;:?!<>=+\-*/%&|^~@#]+)/);
        if (opMatch) {
          parts.push(
            <span key={key++} className="text-muted-foreground">
              {opMatch[1]}
            </span>
          );
          remaining = remaining.slice(opMatch[0].length);
          matched = true;
        }
      }

      // Whitespace
      if (!matched) {
        const wsMatch = remaining.match(/^(\s+)/);
        if (wsMatch) {
          parts.push(<span key={key++}>{wsMatch[1]}</span>);
          remaining = remaining.slice(wsMatch[0].length);
          matched = true;
        }
      }

      // Fallback: single character
      if (!matched && remaining.length > 0) {
        parts.push(<span key={key++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      }
    }

    return (
      <div key={lineIndex} className="leading-relaxed">
        {parts.length > 0 ? parts : '\u00A0'}
      </div>
    );
  });
}

interface CodeBlockProps {
  code: string;
  language?: 'typescript' | 'javascript' | 'bash' | 'shell' | 'json';
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ 
  code, 
  language = 'typescript', 
  title,
  showLineNumbers = false,
  className 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    setHighlightedCode(highlightCode(code, language));
  }, [code, language]);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');
  const isBash = language === 'bash' || language === 'shell';

  return (
    <div className={cn('relative group rounded-lg overflow-hidden', className)}>
      {/* Header */}
      {(title || isBash) && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isBash && <Terminal className="h-4 w-4" />}
            <span>{title || (isBash ? 'Terminal' : language)}</span>
          </div>
        </div>
      )}
      
      {/* Code */}
      <div className="relative bg-card border border-border rounded-lg overflow-hidden">
        {!title && !isBash && (
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-muted/20 to-transparent pointer-events-none" />
        )}
        
        <pre className="p-4 overflow-x-auto text-sm font-mono">
          <code className="text-foreground">
            {showLineNumbers ? (
              <div className="flex">
                <div className="select-none pr-4 text-muted-foreground/50 text-right min-w-[2rem]">
                  {lines.map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1">
                  {highlightedCode}
                </div>
              </div>
            ) : (
              highlightedCode
            )}
          </code>
        </pre>
        
        {/* Copy button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </div>
    </div>
  );
}

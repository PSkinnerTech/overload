import React, { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Copy, Download, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';

interface DocumentPreviewProps {
  content: string;
  className?: string;
  showActions?: boolean;
}

export function DocumentPreview({ 
  content, 
  className,
  showActions = true 
}: DocumentPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  // Process Markdown to HTML (basic implementation)
  const processMarkdown = (markdown: string): string => {
    // This is a very basic markdown processor
    // In production, use a proper markdown library like marked or remark
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n\n/g, '</p><p>')
      // Lists
      .replace(/^\* (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // Wrap in paragraphs
      .replace(/^(?!<[h|p|u|o|l|pre])/gm, '<p>')
      .replace(/(?<![>])$/gm, '</p>')
      // Clean up empty paragraphs
      .replace(/<p><\/p>/g, '')
      .replace(/<p>(<[h|u|o|l|pre])/g, '$1')
      .replace(/(<\/[h|u|o|l|pre]>)<\/p>/g, '$1');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenExternal = () => {
    // In a real implementation, this would open in the user's default markdown editor
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  useEffect(() => {
    // Add syntax highlighting if code blocks are present
    if (previewRef.current) {
      const codeBlocks = previewRef.current.querySelectorAll('pre code');
      codeBlocks.forEach(block => {
        block.classList.add('hljs');
      });
    }
  }, [content]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Actions */}
      {showActions && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenExternal}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Open
          </Button>
        </div>
      )}

      {/* Preview */}
      <div 
        ref={previewRef}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "p-6 rounded-lg border bg-background overflow-auto",
          className
        )}
        dangerouslySetInnerHTML={{ __html: processMarkdown(content) }}
      />
    </div>
  );
}
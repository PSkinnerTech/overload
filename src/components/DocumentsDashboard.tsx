import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';
import { DocumentPreview } from './DocumentPreview';
import { CognitiveLoadBadge } from './CognitiveLoadDisplay';
import { 
  FileText, 
  Search, 
  Calendar,
  Clock,
  Download,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { cn } from '../lib/utils';

interface DocumentItem {
  filename: string;
  title: string;
  date: Date;
  size: number;
  cognitiveLoad?: number;
  preview?: string;
}

export function DocumentsDashboard() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await window.overloadApi.document.list();
      if (result.success) {
        // Parse document metadata from filenames
        const docs: DocumentItem[] = await Promise.all(
          result.documents.map(async (filename: string) => {
            const doc = await parseDocumentMetadata(filename);
            return doc;
          })
        );
        setDocuments(docs);
      } else {
        setError('Failed to load documents');
      }
    } catch (err) {
      setError('Error loading documents');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const parseDocumentMetadata = async (filename: string): Promise<DocumentItem> => {
    // Extract metadata from filename (format: sessionId_timestamp.md)
    const parts = filename.replace('.md', '').split('_');
    const timestamp = parts[parts.length - 1];
    
    // Try to load document preview
    let preview = '';
    let title = 'Untitled Document';
    let cognitiveLoad: number | undefined;
    
    try {
      const result = await window.overloadApi.document.open(filename);
      if (result.success && result.content) {
        // Extract title from first heading
        const titleMatch = result.content.match(/^#\s+(.+)$/m);
        if (titleMatch) {
          title = titleMatch[1];
        } else {
          // Try to get from metadata
          const metaTitleMatch = result.content.match(/title:\s*"(.+)"/);
          if (metaTitleMatch) {
            title = metaTitleMatch[1];
          }
        }

        // Extract cognitive load from metadata
        const cognitiveMatch = result.content.match(/cognitiveLoadIndex:\s*(\d+)/);
        if (cognitiveMatch) {
          cognitiveLoad = parseInt(cognitiveMatch[1]);
        }

        // Get preview (first 200 chars of content)
        const contentStart = result.content.indexOf('\n\n') + 2;
        preview = result.content.substring(contentStart, contentStart + 200) + '...';
      }
    } catch (err) {
      console.error('Error loading document preview:', err);
    }

    return {
      filename,
      title,
      date: new Date(timestamp.replace(/-/g, ':')),
      size: 0, // Would need file stats for actual size
      cognitiveLoad,
      preview
    };
  };

  const handleDocumentSelect = async (doc: DocumentItem) => {
    setSelectedDocument(doc);
    setError(null);
    
    try {
      const result = await window.overloadApi.document.open(doc.filename);
      if (result.success && result.content) {
        setDocumentContent(result.content);
      } else {
        setError('Failed to open document');
      }
    } catch (err) {
      setError('Error opening document');
      console.error(err);
    }
  };

  const handleDownload = (doc: DocumentItem) => {
    const blob = new Blob([documentContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.preview?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* Document List */}
      <div className={cn(
        "border-r bg-background",
        selectedDocument ? "w-1/3" : "w-full"
      )}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold">Documents</h1>
            <p className="text-muted-foreground mt-1">
              Browse and manage your generated documents
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Document List */}
          {filteredDocuments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {searchQuery 
                    ? 'Try adjusting your search query'
                    : 'Start a recording session to create your first document'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <Card
                  key={doc.filename}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedDocument?.filename === doc.filename 
                      ? "border-primary bg-accent" 
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => handleDocumentSelect(doc)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {/* Title and Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium line-clamp-1">{doc.title}</h3>
                        {doc.cognitiveLoad !== undefined && (
                          <CognitiveLoadBadge index={doc.cognitiveLoad} />
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {doc.date.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {doc.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Preview */}
                      {doc.preview && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {doc.preview}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview */}
      {selectedDocument && (
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Preview Header */}
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedDocument.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Created on {selectedDocument.date.toLocaleDateString()} at{' '}
                  {selectedDocument.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDownload(selectedDocument)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-hidden p-6">
            {showPreview ? (
              <DocumentPreview 
                content={documentContent}
                className="h-full"
                showActions={false}
              />
            ) : (
              <div className="h-full overflow-auto">
                <pre className="p-4 bg-muted rounded-lg text-sm">
                  <code>{documentContent}</code>
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
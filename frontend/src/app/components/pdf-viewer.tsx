import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Download, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  documentName: string;
  onDownload?: () => void;
  isSigned?: boolean;
  url?: string;
}

export function PDFViewer({ documentName, onDownload, isSigned, url }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden border border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border flex-shrink-0">
        <h3 className="font-medium text-sm truncate max-w-md">{documentName}</h3>
        <div className="flex items-center gap-2">
          {isSigned && (
            <span className="text-xs text-success flex items-center gap-1 font-medium bg-success/10 px-2 py-1 rounded">
              <CheckCircle2 className="w-3 h-3" />
              Подписан
            </span>
          )}
          {onDownload && (
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 relative">
        {url ? (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Загрузка документа...</span>
                </div>
              </div>
            )}
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                  <p className="text-sm text-destructive font-medium">Не удалось загрузить документ</p>
                  <p className="text-xs text-muted-foreground mt-1">Попробуйте скачать PDF</p>
                  {onDownload && (
                    <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={onDownload}>
                      <Download className="w-4 h-4" />
                      Скачать
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <iframe
                src={url}
                className="w-full h-full bg-white"
                title={documentName}
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Документ не загружен</p>
              {onDownload && (
                <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={onDownload}>
                  <Download className="w-4 h-4" />
                  Скачать PDF
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
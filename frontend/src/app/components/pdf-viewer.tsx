import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Button } from '@/app/components/ui/button';
import { Download, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  documentName: string;
  onDownload?: () => void;
  isSigned?: boolean;
  url?: string;
}

export function PDFViewer({ documentName, onDownload, isSigned, url }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

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
      <div ref={containerRef} className="flex-1 overflow-auto flex flex-col items-center relative py-4 px-2">
        {url ? (
          <>
            {loading && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Загрузка документа...</span>
                </div>
              </div>
            )}
            {error ? (
              <div className="flex items-center justify-center h-full w-full">
                <div className="text-center px-4">
                  <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                  <p className="text-sm text-destructive font-medium mb-3">Не удалось загрузить документ</p>
                  {onDownload && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={onDownload}>
                      <Download className="w-4 h-4" />
                      Скачать PDF
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <Document
                file={url}
                onLoadSuccess={({ numPages }) => { setNumPages(numPages); setLoading(false); }}
                onLoadError={() => { setLoading(false); setError(true); }}
                loading=""
              >
                {Array.from({ length: numPages }, (_, i) => (
                  <div key={i + 1} className="mb-3 shadow-md">
                    <Page
                      pageNumber={i + 1}
                      width={containerWidth - 16}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                ))}
              </Document>
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

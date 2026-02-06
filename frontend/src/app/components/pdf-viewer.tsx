import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize2, CheckCircle2 } from 'lucide-react';

interface PDFViewerProps {
  documentName: string;
  onDownload?: () => void;
  isSigned?: boolean; // Новый проп для определения подписанного документа
}

export function PDFViewer({ documentName, onDownload, isSigned, url }: PDFViewerProps & { url?: string }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(3);
  const [zoom, setZoom] = useState(100);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));
  const handleZoomIn = () => setZoom((z) => Math.min(200, z + 25));
  const handleZoomOut = () => setZoom((z) => Math.max(50, z - 25));
  const handleDownload = () => {
    if (onDownload) onDownload();
  };

  // If we have a URL, show the real PDF via iframe
  if (url) {
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
            <Button variant="outline" size="sm" onClick={onDownload || (() => window.open(url, '_blank'))}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <iframe
          src={url}
          className="w-full flex-1 bg-white"
          title={documentName}
        />
      </div>
    );
  }

  // Fallback to mock if no URL provided (or for storybook/testing)
  return (
    <div className="flex flex-col h-full bg-muted/30 rounded-lg overflow-hidden border border-border">
      {/* ... existing mock implementation ... */}
      {/* Signed Document Notice */}
      {isSigned && (
        <div className="px-4 py-2 bg-success/10 border-b border-success/20 flex items-center gap-2 flex-shrink-0">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-sm text-success font-medium">
            Подписанный документ с электронной подписью (страница подписи добавлена в конец)
          </span>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[80px] text-center">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">{zoom}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 overflow-auto p-8 flex items-start justify-center">
        <div
          className="bg-white shadow-lg"
          style={{
            width: `${(595 * zoom) / 100}px`, // A4 width at 72dpi
            minHeight: `${(842 * zoom) / 100}px`, // A4 height at 72dpi
            transform: `scale(1)`,
            transformOrigin: 'top center',
          }}
        >
          {/* Mock PDF Content */}
          <div className="p-12 space-y-4">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold mb-2">ДОГОВОР ОКАЗАНИЯ УСЛУГ</h1>
              <p className="text-sm text-gray-600">№ {currentPage}-2024</p>
            </div>

            <div className="space-y-4 text-sm leading-relaxed">
              <p>
                <strong>1. Предмет договора</strong>
              </p>
              <p className="text-justify">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
                incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
                exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>

              <p>
                <strong>2. Права и обязанности сторон</strong>
              </p>
              <p className="text-justify">
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
                fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
                culpa qui officia deserunt mollit anim id est laborum.
              </p>

              <p>
                <strong>3. Стоимость услуг и порядок расчетов</strong>
              </p>
              <p className="text-justify">
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
                doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore
                veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>

              <p>
                <strong>4. Ответственность сторон</strong>
              </p>
              <p className="text-justify">
                Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed
                quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
              </p>

              <p>
                <strong>5. Срок действия договора</strong>
              </p>
              <p className="text-justify">
                Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur,
                adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore
                magnam aliquam quaerat voluptatem.
              </p>

              {currentPage === totalPages && (
                <div className="mt-16 pt-8 border-t border-gray-300">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="font-semibold mb-2">Исполнитель:</p>
                      <p className="text-sm">ООО "Рога и Копыта"</p>
                      <div className="mt-8 border-t border-gray-400 pt-2">
                        <p className="text-xs text-gray-600">Подпись / Печать</p>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold mb-2">Заказчик:</p>
                      <p className="text-sm">Иванов Иван Иванович</p>
                      <div className="mt-8 border-t border-gray-400 pt-2">
                        <p className="text-xs text-gray-600">Подпись</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-gray-400 text-center mt-16">
              Страница {currentPage} из {totalPages}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
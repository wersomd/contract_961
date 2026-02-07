import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { PDFViewer } from '@/app/components/pdf-viewer';
import { FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import logo from '@/assets/logo.png';

interface ClientViewDocumentPageProps {
  onSign?: () => void;
  token?: string | null;
}

export function ClientViewDocumentPage({ onSign, token }: ClientViewDocumentPageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docInfo, setDocInfo] = useState<{
    documentName: string;
    clientName: string;
    status: string;
    valid: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (!token) {
      setError('Неверная ссылка');
      setLoading(false);
      return;
    }

    fetch(`/sign/${token}`)
      .then(res => res.json())
      .then(data => {
        if (!data.valid) {
          setError(data.error || 'Ссылка недействительна');
        } else {
          setDocInfo(data.request);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Ошибка загрузки документа');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = () => {
    if (token && docInfo) {
      window.open(`/sign/${token}/document`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Ошибка доступа</h2>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  if (!docInfo) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <img src={logo} alt="961.kz" className="h-10 w-auto" />
            <span className="text-xs text-muted-foreground">Безопасное подписание</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Document Info */}
        <Card className="p-4 md:p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 md:w-7 md:h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-semibold mb-2">
                {docInfo.documentName}
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Уважаемый(ая) {docInfo.clientName}, пожалуйста, ознакомьтесь с документом и подпишите его
              </p>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleDownload}>
                <Download className="w-4 h-4" />
                Скачать PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* Document Viewer */}
        <Card className="p-4 md:p-6 mb-6">
          <h3 className="text-sm font-medium mb-4">Предпросмотр документа</h3>
          <div className="h-[500px] md:h-[600px]">
            <PDFViewer
              documentName={docInfo.documentName}
              onDownload={handleDownload}
              url={`/sign/${token}/document`}
            />
          </div>
        </Card>

        {/* Sign Button */}
        <Card className="p-4 md:p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Нажимая кнопку "Подписать", вы подтверждаете согласие с условиями документа
            </p>
            <Button onClick={onSign} size="lg" className="w-full sm:w-auto gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Подписать документ
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2026 961.kz. Электронное подписание документов</p>
        </div>
      </div>
    </div>
  );
}
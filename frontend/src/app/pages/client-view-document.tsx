import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { PDFViewer } from '@/app/components/pdf-viewer';
import { FileText, Download, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent"></div>
          <p className="text-white/60 text-sm">Загрузка документа...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center bg-white/5 backdrop-blur-xl border-white/10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-white">Ошибка доступа</h2>
          <p className="text-white/60">{error}</p>
        </Card>
      </div>
    );
  }

  if (!docInfo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="961.kz" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <p className="text-xs text-white/40">Безопасное подписание</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Защищённое соединение</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Welcome Message */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Добро пожаловать, {docInfo.clientName}!
          </h1>
          <p className="text-white/60">
            Ознакомьтесь с документом и подпишите его
          </p>
        </div>

        {/* Document Info Card */}
        <Card className="p-5 md:p-6 mb-6 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center flex-shrink-0">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-1">
                {docInfo.documentName}
              </h2>
              <p className="text-sm text-white/50 mb-4">
                Документ на подписание
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-white/5 border-white/20 text-white hover:bg-white/10"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
                Скачать PDF
              </Button>
            </div>
          </div>
        </Card>

        {/* Document Viewer */}
        <Card className="p-4 md:p-6 mb-6 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-white/80">Предпросмотр документа</h3>
          </div>
          <div className="h-[500px] md:h-[600px] rounded-lg overflow-hidden bg-white">
            <PDFViewer
              documentName={docInfo.documentName}
              onDownload={handleDownload}
              url={`/sign/${token}/document`}
            />
          </div>
        </Card>

        {/* Sign Button */}
        <Card className="p-6 md:p-8 bg-gradient-to-r from-primary/20 to-primary/5 backdrop-blur-xl border-primary/20">
          <div className="text-center">
            <p className="text-sm text-white/60 mb-6">
              Нажимая кнопку "Подписать", вы подтверждаете согласие с условиями документа
            </p>
            <Button
              onClick={onSign}
              size="lg"
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-8 py-6 text-base shadow-lg shadow-primary/25"
            >
              <CheckCircle2 className="w-5 h-5" />
              Подписать документ
            </Button>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="text-xs text-white/30">© 2026 961.kz. Электронное подписание документов</p>
        </div>
      </div>
    </div>
  );
}
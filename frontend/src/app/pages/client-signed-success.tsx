import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { CheckCircle2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import logo from '@/assets/logo.png';

interface ClientSignedSuccessPageProps {
  onDownload?: () => void;
  token?: string | null;
}

export function ClientSignedSuccessPage({ onDownload, token }: ClientSignedSuccessPageProps) {
  const signedDate = new Date();

  const handleDownload = () => {
    if (token) {
      window.open(`/sign/${token}/signed-document`, '_blank');
    } else {
      onDownload?.();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <img src={logo} alt="961.kz" className="h-10 w-auto" />
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center p-4 py-8 md:py-16">
        <Card className="w-full max-w-md p-6 md:p-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>

            <h2 className="text-2xl md:text-3xl font-semibold mb-3">
              Документ подписан!
            </h2>

            <p className="text-muted-foreground mb-8">
              Документ успешно подписан и отправлен менеджеру
            </p>

            {/* Document Info */}
            <div className="p-4 rounded-lg bg-muted/50 text-left mb-6 space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Статус</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Подписано
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-sm text-muted-foreground">Дата и время</span>
                <span className="text-sm font-medium">
                  {format(signedDate, 'd MMMM yyyy, HH:mm', { locale: ru })}
                </span>
              </div>
            </div>

            <Button onClick={handleDownload} variant="outline" className="w-full gap-2 mb-4">
              <Download className="w-4 h-4" />
              Скачать подписанную копию
            </Button>

            <p className="text-xs text-muted-foreground">
              Копия документа доступна для скачивания по этой ссылке
            </p>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pb-8">
        <p>© 2026 961.kz. Электронное подписание документов</p>
      </div>
    </div>
  );
}

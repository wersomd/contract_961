import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { CheckCircle2, Download, Sparkles, PartyPopper } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-4">
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
      <div className="flex items-center justify-center p-4 py-12 md:py-20">
        <Card className="w-full max-w-md p-8 md:p-10 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="text-center">
            {/* Success Animation */}
            <div className="relative inline-block mb-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                <PartyPopper className="w-5 h-5 text-primary" />
              </div>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Документ подписан!
            </h2>

            <p className="text-white/50 mb-10">
              Спасибо! Документ успешно подписан и отправлен
            </p>

            {/* Document Info */}
            <div className="p-5 rounded-xl bg-white/5 border border-white/10 text-left mb-8 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/50">Статус</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  Подписано
                </span>
              </div>
              <div className="h-px bg-white/10"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-white/50">Дата и время</span>
                <span className="text-sm font-medium text-white">
                  {format(signedDate, 'd MMMM yyyy, HH:mm', { locale: ru })}
                </span>
              </div>
            </div>

            <Button
              onClick={handleDownload}
              size="lg"
              className="w-full gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold py-6"
            >
              <Download className="w-5 h-5" />
              Скачать подписанный документ
            </Button>

            <p className="mt-6 text-xs text-white/40">
              Копия документа доступна для скачивания по этой ссылке
            </p>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-xs text-white/30">© 2026 961.kz. Электронное подписание документов</p>
      </div>
    </div>
  );
}

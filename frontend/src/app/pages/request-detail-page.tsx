import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { StatusBadge } from '@/app/components/status-badge';
import { PDFViewer } from '@/app/components/pdf-viewer';
import { RequestTimeline } from '@/app/components/request-timeline';
import { Separator } from '@/app/components/ui/separator';
import {
  ArrowLeft,
  Send,
  XCircle,
  Clock,
  Download,
  MoreVertical,
  FileText,
  Phone,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Eye,
  MessageSquare,
  Loader2,
  Shield,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { format, isValid } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { requestsService, Request } from '@/services/requests.service';

interface RequestDetailPageProps {
  requestId: string;
  onBack?: () => void;
}

const safeFormat = (dateString: string | undefined | null, formatStr: string) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) {
      console.warn('Invalid date detected:', dateString);
      return '-';
    }
    return format(date, formatStr, { locale: ru });
  } catch (e) {
    console.error('Date formatting error:', e, dateString);
    return 'Error';
  }
};

export function RequestDetailPage({ requestId, onBack }: RequestDetailPageProps) {
  const [request, setRequest] = useState<Request | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    const loadRequest = async () => {
      if (!requestId) return;

      setLoading(true);
      setError(null);
      try {
        const data = await requestsService.getById(requestId);
        if (!data || !data.request) {
          throw new Error('Данные заявки не найдены');
        }
        setRequest(data.request);
        setTimeline(data.timeline || []);

        // Store the API endpoint URL
        const docUrl = data.signedDocumentUrl || data.documentUrl;
        setDocumentUrl(docUrl);

        // Fetch PDF with authorization and create blob URL
        if (docUrl) {
          try {
            const token = localStorage.getItem('token');
            const pdfResponse = await fetch(docUrl, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (pdfResponse.ok) {
              const blob = await pdfResponse.blob();
              const blobUrl = URL.createObjectURL(blob);
              setPdfBlobUrl(blobUrl);
            }
          } catch (pdfErr) {
            console.warn('Could not load PDF preview:', pdfErr);
          }
        }
      } catch (err) {
        console.error('Failed to load request:', err);
        setError('Не удалось загрузить данные заявки');
        toast.error('Ошибка загрузки заявки');
      } finally {
        setLoading(false);
      }
    };
    loadRequest();

    // Cleanup blob URL on unmount
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [requestId]);

  const handleResend = async () => {
    try {
      if (!requestId) return;
      await requestsService.resend(requestId);
      toast.success('Ссылка повторно отправлена клиенту');
      const data = await requestsService.getById(requestId);
      setTimeline(data.timeline || []);
    } catch (error) {
      toast.error('Ошибка при отправке');
    }
  };

  const handleCancel = async () => {
    try {
      if (!requestId) return;
      await requestsService.cancel(requestId, 'Отменено администратором');
      setShowCancelDialog(false);
      toast.success('Заявка отменена');
      const data = await requestsService.getById(requestId);
      setRequest(data.request);
      setTimeline(data.timeline || []);
    } catch (error) {
      toast.error('Ошибка при отмене');
    }
  };

  const handleDownload = () => {
    if (documentUrl) {
      window.open(documentUrl, '_blank');
    } else {
      toast.error('Документ недоступен');
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-8">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Ошибка загрузки</h2>
          <p className="text-muted-foreground mt-1">{error || 'Заявка не найдена'}</p>
        </div>
        <Button onClick={onBack} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Вернуться к списку
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-muted/10">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10 shadow-sm">
        <div className="px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 hover:bg-muted">
                <ArrowLeft className="w-4 h-4" />
                Назад к списку
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                Создано: {safeFormat(request.createdAt, 'd MMMM yyyy, HH:mm')}
              </span>
              <Button variant="outline" onClick={handleResend} className="gap-2" disabled={request.status === 'signed' || request.status === 'canceled'}>
                <Send className="w-4 h-4" />
                Отправить
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    {request.status === 'signed' ? 'Скачать подписанный' : 'Скачать исходный'}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowCancelDialog(true)}
                    className="text-destructive"
                    disabled={request.status === 'signed' || request.status === 'canceled'}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Отменить заявку
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{request.displayId}</h1>
                <StatusBadge status={request.status} />
              </div>
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {request.documentName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Document & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            <RequestTimeline items={timeline} />

            {/* Document Preview */}
            <Card className="overflow-hidden border-border/50 shadow-sm">
              <div className="p-6 border-b border-border flex items-center justify-between bg-card/50">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Предпросмотр
                </h2>
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleDownload}>
                  <Download className="w-4 h-4" />
                  Скачать PDF
                </Button>
              </div>
              <div className="h-[750px] bg-muted/20">
                {/* Note: PDFViewer needs a valid URL. If documentUrl is mostly local or proxied, ensure it works. */}
                <PDFViewer
                  documentName={request.documentName}
                  onDownload={handleDownload}
                  isSigned={request.status === 'signed'}
                  url={pdfBlobUrl}
                />
              </div>
            </Card>
          </div>

          {/* Right Column - Info */}
          <div className="space-y-6">
            {/* Client Info */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/10">
                <h2 className="text-lg font-semibold">Клиент</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-start gap-4 p-4 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold group-hover:scale-105 transition-transform">
                    {request.clientName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary group-hover:underline decoration-primary/50 underline-offset-4">
                      {request.clientName}
                    </p>
                    <p className="text-sm text-muted-foreground font-mono mt-0.5">{request.clientPhone}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Компания:</span>
                    <span className="font-medium ml-auto">{request.clientName ? 'Частное лицо' : '-'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Дата регистрации:</span>
                    <span className="font-medium ml-auto">-</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Request Info */}
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/10">
                <h2 className="text-lg font-semibold">Детали заявки</h2>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Дата создания
                  </span>
                  <span className="font-medium text-sm">
                    {safeFormat(request.createdAt, 'd MMM yyyy')}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Дедлайн
                  </span>
                  <span className="font-medium text-sm">
                    {safeFormat(request.deadline, 'd MMM yyyy')}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" /> Менеджер
                  </span>
                  <span className="font-medium text-sm">
                    {request.managerName}
                  </span>
                </div>

                {request.viewedAt && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <Eye className="w-4 h-4" /> Просмотрено
                      </span>
                      <span className="font-medium text-sm">
                        {safeFormat(request.viewedAt, 'd MMM HH:mm')}
                      </span>
                    </div>
                  </>
                )}

                {request.signedAt && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-success flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" /> Подписано
                      </span>
                      <span className="font-medium text-sm text-success">
                        {safeFormat(request.signedAt, 'd MMM HH:mm')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отменить заявку?</DialogTitle>
            <DialogDescription>
              Клиент больше не сможет подписать этот документ. Это действие нельзя отменить.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Назад
            </Button>
            <Button variant="destructive" onClick={handleCancel}>
              Отменить заявку
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
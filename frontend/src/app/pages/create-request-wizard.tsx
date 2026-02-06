import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Separator } from '@/app/components/ui/separator';
import { ArrowLeft, ArrowRight, Check, User, FileUp, Upload, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { requestsService } from '@/services/requests.service';
import { clientsService, Client } from '@/services/clients.service';
import { useDebounce } from '@/hooks/use-debounce';

interface CreateRequestWizardProps {
  onBack?: () => void;
  onComplete?: () => void;
}

export function CreateRequestWizard({ onBack, onComplete }: CreateRequestWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [clientPhone, setClientPhone] = useState('');
  const [clientName, setClientName] = useState('');
  const [comment, setComment] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [documentName, setDocumentName] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  // Client Search State
  const debouncedPhone = useDebounce(clientPhone, 500);
  const [isSearchingClient, setIsSearchingClient] = useState(false);

  // Search logic
  useEffect(() => {
    const searchClient = async () => {
      // Only search if we have a somewhat valid phone length (e.g. > 5 digits) 
      // and we are not in "edit mode" where we already selected a client but user changed input?
      // Actually, user asked: if client exists in DB he came out with name.

      const cleanPhone = debouncedPhone.replace(/\D/g, '');
      if (cleanPhone.length < 6) return;

      setIsSearchingClient(true);
      try {
        const data = await clientsService.getAll({ search: debouncedPhone, limit: 1 });
        if (data.clients.length > 0) {
          // Found a match? Logic: if search matches phone exactly or close enough
          // The search API searches by ALL fields. We should check if the phone matches.
          const match = data.clients.find(c => c.phone.replace(/\D/g, '').includes(cleanPhone));
          if (match) {
            setClientName(match.name);
            setSelectedClientId(match.id);
            toast.success(`Клиент найден: ${match.name}`);
          } else {
            // No exact phone match, likely new client
            // Don't clear name if user already typed it?
            // Or clear it? Maybe just leave it.
            setSelectedClientId(null);
          }
        } else {
          setSelectedClientId(null);
        }
      } catch (error) {
        console.error('Client search error', error);
      } finally {
        setIsSearchingClient(false);
      }
    };

    searchClient();
  }, [debouncedPhone]);

  const handleNext = () => {
    if (step === 1) {
      if (!clientName || !clientPhone) {
        toast.error('Заполните телефон и имя клиента');
        return;
      }

      const phoneDigits = clientPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10) { // accepting 10 or 11
        toast.error('Введите корректный номер телефона');
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      onBack?.();
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!documentFile || !documentName) {
      toast.error('Загрузите документ и укажите название');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('documentFile', documentFile);
      formData.append('documentName', documentName);
      formData.append('clientPhone', clientPhone);
      formData.append('clientName', clientName);
      if (selectedClientId) {
        formData.append('clientId', selectedClientId);
      }
      if (comment) {
        formData.append('comment', comment);
      }

      await requestsService.create(formData);
      toast.success('Заявка успешно создана!');
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    } catch (error: any) {
      const msg = error?.data?.message || 'Ошибка при создании заявки';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocumentFile(file);
      setDocumentName(file.name.replace('.pdf', ''));
    }
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center gap-4 mb-4 md:mb-6">
            <Button variant="ghost" size="sm" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold mb-1">Создание заявки</h1>
              <p className="text-sm text-muted-foreground">Шаг {step} из 2</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            {[1, 2].map((s, index) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${s < step
                    ? 'bg-primary text-primary-foreground'
                    : s === step
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                    }`}
                >
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {index < 1 && (
                  <div
                    className={`h-0.5 flex-1 ${s < step ? 'bg-primary' : 'bg-muted'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        {step === 1 && (
          <Card className="p-8 shadow-md">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shadow-sm">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">Информация о клиенте</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Укажите данные клиента для отправки документа
                </p>
              </div>
            </div>

            <Separator className="mb-8" />

            <div className="space-y-8">
              <div className="space-y-3">
                <Label htmlFor="clientPhone" className="text-base">
                  Телефон клиента <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="clientPhone"
                    type="tel"
                    placeholder="+7 707 000 0102"
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value);
                      // If user is clearing phone, clear client link
                      if (e.target.value.length < clientPhone.length && selectedClientId) {
                        setSelectedClientId(null);
                      }
                    }}
                    className="h-12 text-lg"
                  />
                  {isSearchingClient && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Мы автоматически найдем клиента по номеру или создадим нового
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="clientName" className="text-base">
                  ФИО клиента <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="clientName"
                  placeholder="Иванов Иван Иванович"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-12 text-lg"
                />
                {selectedClientId && (
                  <p className="text-sm text-green-600 flex items-center gap-1.5 font-medium animate-pulse">
                    <Check className="w-4 h-4" />
                    Клиент найден в базе
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <Label htmlFor="comment" className="text-base">Комментарий (опционально)</Label>
                <Textarea
                  id="comment"
                  placeholder="Дополнительная информация о клиенте или заявке"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Документ</h2>
                <p className="text-sm text-muted-foreground">
                  Загрузите документ для подписания
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label>
                  Загрузить документ <span className="text-destructive">*</span>
                </Label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="file-upload"
                  />
                  <div className="pointer-events-none">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    {documentFile ? (
                      <>
                        <p className="text-sm font-medium mb-1">{documentFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(documentFile.size / 1024).toFixed(2)} KB
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium mb-1">
                          Нажмите для загрузки или перетащите файл
                        </p>
                        <p className="text-xs text-muted-foreground">PDF, до 10 МБ</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="documentName">
                  Название документа <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="documentName"
                  placeholder="Договор оказания услуг №123"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          {step < 2 ? (
            <Button onClick={handleNext}>
              Далее
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Создать и отправить
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { CheckCircle2, XCircle, FileText, Download, Loader2, Clock, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import logo from '@/assets/logo.png';

interface VerifyPageProps {
    displayId?: string;
}

interface VerifyResult {
    valid: boolean;
    request?: {
        displayId: string;
        documentName: string;
        clientName: string;
        status: string;
        signedAt: string | null;
        createdAt: string;
    };
    error?: string;
}

export function VerifyPage({ displayId }: VerifyPageProps) {
    const [loading, setLoading] = useState(true);
    const [result, setResult] = useState<VerifyResult | null>(null);

    useEffect(() => {
        if (!displayId) {
            setResult({ valid: false, error: 'Неверный идентификатор заявки' });
            setLoading(false);
            return;
        }

        fetch(`/api/public/verify/${displayId}`)
            .then(res => res.json())
            .then(data => {
                setResult(data);
            })
            .catch(() => {
                setResult({ valid: false, error: 'Ошибка проверки документа' });
            })
            .finally(() => setLoading(false));
    }, [displayId]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'signed':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        Подписан
                    </span>
                );
            case 'sent':
            case 'viewed':
            case 'code_sent':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                        <Clock className="w-4 h-4" />
                        Ожидает подписания
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                        <XCircle className="w-4 h-4" />
                        Отклонён
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                        {status}
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-[#0066FF] mx-auto mb-4" />
                    <p className="text-muted-foreground">Проверяем документ...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="bg-[#0066FF] rounded-lg p-2">
                        <img src={logo} alt="961.kz" className="h-8 w-auto" />
                    </div>
                    <span className="text-sm text-muted-foreground">Проверка подлинности</span>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 py-8">
                {result?.valid && result.request ? (
                    <>
                        {/* Success Card */}
                        <Card className="p-6 mb-6">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-7 h-7 text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <h1 className="text-xl font-semibold text-green-700 mb-1">
                                        Документ подтверждён
                                    </h1>
                                    <p className="text-muted-foreground">
                                        Этот документ был подписан через систему Contract 961.kz
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Document Details */}
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Информация о документе
                            </h2>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-muted-foreground">Номер заявки</span>
                                    <span className="font-medium">{result.request.displayId}</span>
                                </div>

                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-muted-foreground">Название документа</span>
                                    <span className="font-medium">{result.request.documentName}</span>
                                </div>

                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <User className="w-4 h-4" />
                                        Подписант
                                    </span>
                                    <span className="font-medium">{result.request.clientName}</span>
                                </div>

                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-muted-foreground">Статус</span>
                                    {getStatusBadge(result.request.status)}
                                </div>

                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        Дата создания
                                    </span>
                                    <span className="font-medium">
                                        {format(new Date(result.request.createdAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                                    </span>
                                </div>

                                {result.request.signedAt && (
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-muted-foreground flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4" />
                                            Дата подписания
                                        </span>
                                        <span className="font-medium text-green-600">
                                            {format(new Date(result.request.signedAt), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {result.request.status === 'signed' && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <Button
                                        className="gap-2"
                                        onClick={() => window.open(`/api/public/verify/${displayId}/document`, '_blank')}
                                    >
                                        <Download className="w-4 h-4" />
                                        Скачать подписанный документ
                                    </Button>
                                </div>
                            )}
                        </Card>
                    </>
                ) : (
                    /* Error Card */
                    <Card className="p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <XCircle className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-xl font-semibold text-red-700 mb-2">
                            Документ не найден
                        </h1>
                        <p className="text-muted-foreground">
                            {result?.error || 'Проверьте правильность ссылки или обратитесь к отправителю документа'}
                        </p>
                    </Card>
                )}

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-muted-foreground">
                    <p>© 2026 Contract 961.kz — Система электронного подписания документов</p>
                    <p className="mt-1">БИН: 211040031441 | ТОО "961"</p>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Card } from '@/app/components/ui/card';
import { CheckCircle2, Circle, Clock, Mail, Eye, XCircle, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TimelineItem {
    type: 'created' | 'sent' | 'viewed' | 'signed' | 'canceled' | 'code_sent';
    title: string;
    timestamp: string | Date;
    metadata?: any;
}

interface RequestTimelineProps {
    items: TimelineItem[];
}

const getIcon = (type: TimelineItem['type']) => {
    switch (type) {
        case 'created':
            return <FileText className="w-5 h-5 text-blue-500" />;
        case 'sent':
            return <Mail className="w-5 h-5 text-blue-500" />;
        case 'viewed':
            return <Eye className="w-5 h-5 text-amber-500" />;
        case 'code_sent':
            return <MessageSquare className="w-5 h-5 text-indigo-500" />;
        case 'signed':
            return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        case 'canceled':
            return <XCircle className="w-5 h-5 text-red-500" />;
        default:
            return <Circle className="w-5 h-5 text-gray-300" />;
    }
};

const getLineColor = (type: TimelineItem['type']) => {
    switch (type) {
        case 'signed': return 'bg-success';
        case 'canceled': return 'bg-destructive';
        case 'viewed': return 'bg-amber-500';
        default: return 'bg-border';
    }
};

export function RequestTimeline({ items }: RequestTimelineProps) {
    if (!items || items.length === 0) {
        return (
            <Card className="p-6 text-center text-muted-foreground">
                История событий пуста
            </Card>
        );
    }

    return (
        <Card className="p-6">
            <h3 className="font-semibold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                История событий
            </h3>
            <div className="relative space-y-8 pl-2">
                {items.map((item, index) => (
                    <div key={index} className="relative pl-8">
                        {/* Connecting Line */}
                        {index < items.length - 1 && (
                            <div
                                className="absolute left-[11px] top-8 bottom-[-32px] w-0.5 bg-border"
                            />
                        )}

                        {/* Icon */}
                        <div className={`absolute left-0 top-0 bg-background rounded-full border-2 ${item.type === 'signed' ? 'border-success' :
                            item.type === 'canceled' ? 'border-destructive' : 'border-border'
                            } p-0.5`}>
                            {getIcon(item.type)}
                        </div>

                        {/* Content */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div>
                                <p className="font-medium text-sm">{item.title}</p>
                                {item.metadata && Object.keys(item.metadata).length > 0 && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {/* Render specific metadata friendly */}
                                        {item.metadata.manager && `Менеджер: ${item.metadata.manager}`}
                                        {item.metadata.ip && `IP: ${item.metadata.ip}`}
                                        {item.metadata.reason && `Причина: ${item.metadata.reason}`}
                                        {item.metadata.smsSent !== undefined && (
                                            `SMS: ${item.metadata.smsSent ? 'Отправлено' : 'Ошибка отправки'}`
                                        )}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                {format(new Date(item.timestamp), 'd MMM HH:mm', { locale: ru })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

import { MessageSquare } from 'lucide-react';

import React from 'react';
import { cn } from '@/app/components/ui/utils';

export type RequestStatus = 
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'code_sent'
  | 'signed'
  | 'expired'
  | 'canceled'
  | 'failed';

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  draft: {
    label: 'Черновик',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  sent: {
    label: 'Отправлено',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  viewed: {
    label: 'Просмотрено',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
  code_sent: {
    label: 'Код отправлен',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  signed: {
    label: 'Подписано',
    className: 'bg-green-50 text-green-700 border-green-200',
  },
  expired: {
    label: 'Просрочено',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  canceled: {
    label: 'Отменено',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  failed: {
    label: 'Ошибка',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

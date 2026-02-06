import React, { useEffect, useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { StatusBadge } from '@/app/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { dashboardService, Request } from '@/services/requests.service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DashboardPageProps {
  onCreateRequest?: () => void;
  onViewAllRequests?: () => void;
  onViewRequest?: (id: string) => void;
}

interface Stats {
  pending: number;
  signed: number;
  expired: number;
  drafts: number;
}

export function DashboardPage({ onCreateRequest, onViewAllRequests, onViewRequest }: DashboardPageProps) {
  const [stats, setStats] = useState<Stats>({ pending: 0, signed: 0, expired: 0, drafts: 0 });
  const [recentRequests, setRecentRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data.stats);
        setRecentRequests(data.activeRequests || []);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-4 md:px-8 py-4 md:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold mb-1">Главная</h1>
              <p className="text-sm text-muted-foreground">
                Обзор заявок на подписание
              </p>
            </div>
            <Button onClick={onCreateRequest} className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Создать заявку
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">На подписи</p>
              <p className="text-3xl font-semibold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Требуют действия</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Подписано</p>
              <p className="text-3xl font-semibold">{stats.signed}</p>
              <p className="text-xs text-green-600">Успешно завершены</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-orange-50 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Просрочено</p>
              <p className="text-3xl font-semibold">{stats.expired}</p>
              <p className="text-xs text-orange-600">Требует внимания</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Черновики</p>
              <p className="text-3xl font-semibold">{stats.drafts}</p>
              <p className="text-xs text-muted-foreground">Не отправлены</p>
            </div>
          </Card>
        </div>

        {/* Recent Requests Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Последние заявки</h3>
                <p className="text-sm text-muted-foreground">
                  Недавно созданные заявки на подписание
                </p>
              </div>
              <Button variant="ghost" className="gap-2" onClick={onViewAllRequests}>
                Все заявки
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Документ</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Менеджер</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Нет заявок. Создайте первую заявку!
                    </TableCell>
                  </TableRow>
                ) : (
                  recentRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onViewRequest?.(request.id)}
                    >
                      <TableCell className="font-medium">{request.displayId}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.clientName}</div>
                          <div className="text-xs text-muted-foreground">{request.clientPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.documentName}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(request.createdAt), 'd MMM, HH:mm', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">{request.managerName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
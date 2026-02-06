import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/app/components/ui/dialog';
import {
  Search,
  Download,
  Filter,
  FileText,
  UserPlus,
  Settings,
  Trash2,
  Edit,
  Send,
  Shield,
  Loader2,
  Clock,
  User,
  Monitor,
  Globe,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { auditService, AuditLog } from '@/services/audit.service';
import { useDebounce } from '@/hooks/use-debounce';

const actionIcons: Record<string, React.ElementType> = {
  'create_request': FileText,
  'sms_sent': Send,
  'cancel_request': Trash2,
  'sign_document': Shield,
  'update_settings': Settings,
  'create_template': FileText,
  'create_client': UserPlus,
  'view_document': FileText,
  'extend_deadline': Edit,
  'login': Shield,
};

const actionLabels: Record<string, string> = {
  'create_request': 'Создание заявки',
  'sms_sent': 'Отправка SMS',
  'cancel_request': 'Отмена заявки',
  'sign_document': 'Подписание документа',
  'update_settings': 'Изменение настроек',
  'create_template': 'Создание шаблона',
  'create_client': 'Добавление клиента',
  'view_document': 'Просмотр документа',
  'extend_deadline': 'Продление дедлайна',
  'login': 'Вход в систему',
};

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getLogs({
        search: debouncedSearch,
        action: actionFilter,
        date: dateFilter,
        page,
        limit: 10,
      });
      setLogs(data.logs);
      setTotalPages(data.totalPages);
      setTotalLogs(data.total);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [debouncedSearch, actionFilter, dateFilter, page]);

  const handleExport = async () => {
    try {
      const csvData = await auditService.exportCsv({
        action: actionFilter,
        date: dateFilter,
      });

      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', 'audit_logs.csv');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRowClick = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailsOpen(true);
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Журнал аудита</h1>
              <p className="text-sm text-muted-foreground">
                История всех действий в системе
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={handleExport}>
              <Download className="w-4 h-4" />
              Экспорт CSV
            </Button>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по пользователю, ресурсу..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-56 h-10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Тип действия" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все действия</SelectItem>
                <SelectItem value="create_request">Создание заявки</SelectItem>
                <SelectItem value="sign_document">Подписание</SelectItem>
                <SelectItem value="cancel_request">Отмена</SelectItem>
                <SelectItem value="login">Авторизация</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-48 h-10"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Дата и время</TableHead>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Действие</TableHead>
                  <TableHead>Ресурс</TableHead>
                  <TableHead>IP-адрес</TableHead>
                  <TableHead>Детали</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      Записи не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((event) => {
                    const Icon = actionIcons[event.action] || FileText;

                    return (
                      <TableRow
                        key={event.id}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => handleRowClick(event)}
                      >
                        <TableCell>
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(event.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{event.userName}</div>
                        </TableCell>
                        <TableCell className="text-sm">{actionLabels[event.action] || event.action}</TableCell>
                        <TableCell className="font-mono text-xs">{event.resourceId}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {event.ipAddress || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {JSON.stringify(event.metadata)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Показано {logs.length} из {totalLogs} записей
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage(p => p - 1)}
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage(p => p + 1)}
              >
                Вперед
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog && (
                <>
                  {actionIcons[selectedLog.action] && React.createElement(actionIcons[selectedLog.action], { className: "w-5 h-5 text-primary" })}
                  {actionLabels[selectedLog.action] || selectedLog.action}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Детальная информация о событии
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Время
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedLog.createdAt), 'dd MMMM yyyy, HH:mm:ss', { locale: ru })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" /> Пользователь
                  </p>
                  <p className="text-sm font-medium">{selectedLog.userName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Globe className="w-3 h-3" /> IP-адрес
                  </p>
                  <p className="text-sm font-medium font-mono">{selectedLog.ipAddress || 'Неизвестно'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <FileText className="w-3 h-3" /> Ресурс ID
                  </p>
                  <p className="text-sm font-medium font-mono">{selectedLog.resourceId || '-'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-muted-foreground" />
                  Метаданные
                </p>
                <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
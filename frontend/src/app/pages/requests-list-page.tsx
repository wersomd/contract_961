import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Plus, Search, Filter, Download, MoreHorizontal, Loader2, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { requestsService, Request } from '@/services/requests.service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/use-debounce'; // Assuming this hook exists or I'll implement it inline

interface RequestsListPageProps {
  onCreateRequest?: () => void;
  onViewRequest?: (id: string) => void;
}

export function RequestsListPage({ onCreateRequest, onViewRequest }: RequestsListPageProps) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      try {
        const data = await requestsService.getAll({
          search: debouncedSearch,
          status: statusFilter,
          page,
          limit: 10,
        });
        setRequests(data.requests);
        setTotalPages(data.totalPages);
        setTotalRequests(data.total);
      } catch (error) {
        console.error('Failed to load requests:', error);
      } finally {
        setLoading(false);
      }
    };
    loadRequests();
  }, [debouncedSearch, statusFilter, page]);

  const statusOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Все статусы' },
    { value: 'draft', label: 'Черновик' },
    { value: 'sent', label: 'Отправлено' },
    { value: 'viewed', label: 'Просмотрено' },
    { value: 'code_sent', label: 'Код отправлен' },
    { value: 'signed', label: 'Подписано' },
    { value: 'expired', label: 'Просрочено' },
    { value: 'canceled', label: 'Отменено' },
  ];

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Заявки на подписание</h1>
              <p className="text-sm text-muted-foreground">
                Управление заявками на подписание документов
              </p>
            </div>
            <Button onClick={onCreateRequest} className="gap-2">
              <Plus className="w-4 h-4" />
              Создать заявку
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по клиенту, документу или ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 h-10">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 h-10">
              <Download className="w-4 h-4" />
              Экспорт
            </Button>
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
                  <TableHead>ID</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Документ</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Менеджер</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Заявки не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow
                      key={request.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onViewRequest?.(request.id)}
                    >
                      <TableCell className="font-medium">{request.displayId}</TableCell>
                      <TableCell className="font-medium">{request.clientName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {request.clientPhone}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.documentName}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(request.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                      </TableCell>
                      <TableCell className="text-sm">{request.managerName}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              onViewRequest?.(request.id);
                            }}>
                              <Eye className="w-4 h-4 mr-2" />
                              Просмотреть
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Удалить заявку? Это действие необратимо.')) {
                                  try {
                                    await requestsService.deleteRequest(request.id);
                                    setRequests(prev => prev.filter(r => r.id !== request.id));
                                    setTotalRequests(prev => prev - 1);
                                  } catch (err) {
                                    console.error('Failed to delete request:', err);
                                  }
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-border flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Показано {requests.length} из {totalRequests} заявок
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
    </div>
  );
}

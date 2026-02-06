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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import { Plus, Search, Building2, Phone, FileText, Loader2, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AddClientDialog } from '@/app/components/add-client-dialog';
import { clientsService, Client, ClientDetails } from '@/services/clients.service';
import { useDebounce } from '@/hooks/use-debounce';
import { StatusBadge } from '@/app/components/status-badge';

export function ClientsPage() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClients, setTotalClients] = useState(0);

  // Client Details Sheet
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientDetails, setSelectedClientDetails] = useState<ClientDetails | null>(null);
  console.log("selectedClientDetails", selectedClientDetails)
  const [detailsLoading, setDetailsLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 500);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await clientsService.getAll({
        search: debouncedSearch,
        page,
        limit: 10,
      });
      setClients(data.clients);
      setTotalPages(data.totalPages);
      setTotalClients(data.total);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [debouncedSearch, page]);

  useEffect(() => {
    if (selectedClientId) {
      const loadDetails = async () => {
        setDetailsLoading(true);
        try {
          const data = await clientsService.getById(selectedClientId);
          setSelectedClientDetails({ ...data.client, requests: data.requests });
        } catch (error) {
          console.error('Failed to load client details:', error);
        } finally {
          setDetailsLoading(false);
        }
      };
      loadDetails();
    } else {
      setSelectedClientDetails(null);
    }
  }, [selectedClientId]);

  const handleClientAdded = () => {
    loadClients();
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1">Клиенты</h1>
              <p className="text-sm text-muted-foreground">
                База клиентов и история подписаний
              </p>
            </div>
            <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4" />
              Добавить клиента
            </Button>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, телефону..."
              className="pl-9 h-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                  <TableHead>Клиент</TableHead>
                  <TableHead>Телефон</TableHead>
                  <TableHead>Компания</TableHead>
                  <TableHead>Заявок</TableHead>
                  <TableHead>Последняя заявка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      Клиенты не найдены
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-primary">
                              {client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{client.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {client.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.company ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {client.company}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{client.requestsCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {client.lastRequestDate
                          ? format(new Date(client.lastRequestDate), 'd MMM yyyy', { locale: ru })
                          : '—'}
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
              Показано {clients.length} из {totalClients} клиентов
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

      {/* Add Client Dialog */}
      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onClientAdded={handleClientAdded}
      />

      {/* Client Details Sheet */}
      <Sheet open={!!selectedClientId} onOpenChange={(open) => !open && setSelectedClientId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl w-full p-0 sm:p-0">
          {/* Note: sheet usually has default padding. We reset it to control inner layout or wrap inner. 
              Actually, standard SheetContent has p-6. Users reported sticking. 
              Let's Wrap content in a div with proper padding/scroll.
          */}
          <div className="h-full flex flex-col p-6 sm:p-8 overflow-y-auto">
            <SheetHeader className="mb-8">
              <SheetTitle className="text-2xl">Информация о клиенте</SheetTitle>
              <SheetDescription className="text-base">
                Детальная информация и история заявок
              </SheetDescription>
            </SheetHeader>

            {detailsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
              </div>
            ) : selectedClientDetails ? (
              <div className="space-y-8 flex-1 pb-8">
                {/* Basic Info */}
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary flex-shrink-0">
                    {selectedClientDetails.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="pt-1">
                    <h3 className="text-xl font-semibold leading-tight mb-1">{selectedClientDetails.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Клиент с {format(new Date(selectedClientDetails.createdAt), 'd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Телефон</label>
                      <p className="text-base font-medium flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        {selectedClientDetails.phone}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Компания</label>
                      <p className="text-base font-medium flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {selectedClientDetails.company || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Request History */}
                <div>
                  <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    История заявок
                  </h4>
                  <div className="space-y-3">
                    {selectedClientDetails.requests && selectedClientDetails.requests.length > 0 ? (
                      selectedClientDetails.requests.map((req: any) => (
                        <div key={req.id} className="p-4 border border-border rounded-xl bg-card hover:bg-accent/30 transition-all hover:shadow-sm cursor-default">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span className="font-mono text-xs text-muted-foreground block mb-1">{req.displayId}</span>
                              <p className="font-medium text-sm leading-snug">{req.documentName}</p>
                            </div>
                            <StatusBadge status={req.status} />
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {format(new Date(req.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>История заявок пуста</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
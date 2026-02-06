import React, { useState } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Switch } from '@/app/components/ui/switch';
import { Checkbox } from '@/app/components/ui/checkbox';
import { StatusBadge } from '@/app/components/status-badge';
import { EmptyState } from '@/app/components/empty-state';
import { Skeleton } from '@/app/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { Separator } from '@/app/components/ui/separator';
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  FileText,
  AlertCircle,
  CheckCircle2,
  Info
} from 'lucide-react';
import { toast } from 'sonner';

export function UIKitPage() {
  const [switchValue, setSwitchValue] = useState(false);
  const [checkboxValue, setCheckboxValue] = useState(false);

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold mb-1">UI Kit</h1>
          <p className="text-sm text-muted-foreground">
            Компоненты дизайн-системы SignDoc
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-8 max-w-6xl">
        {/* Colors */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Цветовая палитра</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="w-full h-16 rounded-lg bg-primary mb-3"></div>
              <p className="text-sm font-medium">Primary</p>
              <p className="text-xs text-muted-foreground">#4f46e5</p>
            </Card>
            <Card className="p-4">
              <div className="w-full h-16 rounded-lg bg-success mb-3"></div>
              <p className="text-sm font-medium">Success</p>
              <p className="text-xs text-muted-foreground">#16a34a</p>
            </Card>
            <Card className="p-4">
              <div className="w-full h-16 rounded-lg bg-warning mb-3"></div>
              <p className="text-sm font-medium">Warning</p>
              <p className="text-xs text-muted-foreground">#f59e0b</p>
            </Card>
            <Card className="p-4">
              <div className="w-full h-16 rounded-lg bg-destructive mb-3"></div>
              <p className="text-sm font-medium">Destructive</p>
              <p className="text-xs text-muted-foreground">#dc2626</p>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Typography */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Типографика</h2>
          <Card className="p-6 space-y-4">
            <div>
              <h1>Заголовок H1 - 32px Semibold</h1>
            </div>
            <div>
              <h2>Заголовок H2 - 24px Semibold</h2>
            </div>
            <div>
              <h3>Заголовок H3 - 20px Semibold</h3>
            </div>
            <div>
              <h4>Заголовок H4 - 16px Semibold</h4>
            </div>
            <div>
              <p>Обычный текст - 16px Regular</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Вторичный текст - 14px Regular
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Мелкий текст - 12px Regular
              </p>
            </div>
          </Card>
        </section>

        <Separator />

        {/* Buttons */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Кнопки</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">Варианты</p>
                <div className="flex flex-wrap gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Размеры</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">С иконками</p>
                <div className="flex flex-wrap gap-3">
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Создать
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Скачать
                  </Button>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Удалить
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Состояния</p>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button>
                    Loading...
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <Separator />

        {/* Inputs */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Поля ввода</h2>
          <Card className="p-6">
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="input1">Текстовое поле</Label>
                <Input id="input1" placeholder="Введите текст..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="input2">С иконкой</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="input2" placeholder="Поиск..." className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="select1">Выпадающий список</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Вариант 1</SelectItem>
                    <SelectItem value="2">Вариант 2</SelectItem>
                    <SelectItem value="3">Вариант 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="textarea1">Текстовая область</Label>
                <Textarea id="textarea1" placeholder="Введите текст..." rows={3} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="check1" checked={checkboxValue} onCheckedChange={setCheckboxValue} />
                <Label htmlFor="check1">Checkbox</Label>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="switch1">Switch</Label>
                <Switch id="switch1" checked={switchValue} onCheckedChange={setSwitchValue} />
              </div>
            </div>
          </Card>
        </section>

        <Separator />

        {/* Status Badges */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Статусы</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-3">
              <StatusBadge status="draft" />
              <StatusBadge status="sent" />
              <StatusBadge status="viewed" />
              <StatusBadge status="code_sent" />
              <StatusBadge status="signed" />
              <StatusBadge status="expired" />
              <StatusBadge status="canceled" />
              <StatusBadge status="failed" />
            </div>
          </Card>
        </section>

        <Separator />

        {/* Badges */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Бейджи</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </div>
          </Card>
        </section>

        <Separator />

        {/* Table */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Таблица</h2>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Клиент</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">REQ-001</TableCell>
                  <TableCell>Иван Иванов</TableCell>
                  <TableCell>
                    <StatusBadge status="signed" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    02.02.2026
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">REQ-002</TableCell>
                  <TableCell>Мария Петрова</TableCell>
                  <TableCell>
                    <StatusBadge status="sent" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    01.02.2026
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </section>

        <Separator />

        {/* Empty State */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Пустые состояния</h2>
          <Card>
            <EmptyState
              icon={FileText}
              title="Нет заявок"
              description="Создайте первую заявку на подписание документа"
              action={{
                label: 'Создать заявку',
                onClick: () => toast.success('Клик по кнопке'),
              }}
            />
          </Card>
        </section>

        <Separator />

        {/* Skeleton Loaders */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Skeleton (загрузка)</h2>
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>
          </Card>
        </section>

        <Separator />

        {/* Toast Notifications */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Toast уведомления</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => toast.success('Операция выполнена успешно!')}>
                Success Toast
              </Button>
              <Button onClick={() => toast.error('Произошла ошибка!')}>
                Error Toast
              </Button>
              <Button onClick={() => toast.info('Информационное сообщение')}>
                Info Toast
              </Button>
              <Button onClick={() => toast('Обычное уведомление')}>
                Default Toast
              </Button>
            </div>
          </Card>
        </section>

        <Separator />

        {/* Modal Dialog */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Модальные окна</h2>
          <Card className="p-6">
            <Dialog>
              <DialogTrigger asChild>
                <Button>Открыть модальное окно</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Вы уверены?</DialogTitle>
                  <DialogDescription>
                    Это действие нельзя будет отменить. Вы действительно хотите продолжить?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline">Отмена</Button>
                  <Button>Подтвердить</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        </section>

        <Separator />

        {/* Icons */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Иконки (Lucide)</h2>
          <Card className="p-6">
            <div className="flex flex-wrap gap-6">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Plus</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Search className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Search</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Download className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Download</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Upload</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Edit className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Edit</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Trash2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Trash</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Check</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <X className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">X</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">FileText</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Alert</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Success</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-lg bg-muted flex items-center justify-center">
                  <Info className="w-6 h-6" />
                </div>
                <p className="text-xs text-muted-foreground">Info</p>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

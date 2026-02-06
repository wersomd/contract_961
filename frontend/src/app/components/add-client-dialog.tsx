import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { toast } from 'sonner';

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded?: (client: { name: string; phone: string; company?: string }) => void;
}

export function AddClientDialog({ open, onOpenChange, onClientAdded }: AddClientDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.name || !formData.phone) {
      toast.error('Заполните обязательные поля');
      return;
    }

    // Проверка длины телефона (должно быть 11 цифр)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length !== 11) {
      toast.error('Номер телефона должен содержать 11 цифр');
      return;
    }

    // Добавление клиента
    const newClient = {
      name: formData.name,
      phone: formData.phone,
      company: formData.company || undefined,
    };

    onClientAdded?.(newClient);
    toast.success('Клиент успешно добавлен!');
    
    // Сброс формы и закрытие диалога
    setFormData({ name: '', phone: '', company: '' });
    onOpenChange(false);
  };

  const handleCancel = () => {
    setFormData({ name: '', phone: '', company: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Добавить клиента</DialogTitle>
          <DialogDescription>
            Создайте нового клиента в базе данных
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                ФИО клиента <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Иванов Иван Иванович"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Телефон <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+7 707 000 0102"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Введите номер телефона (11 цифр)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Компания (опционально)</Label>
              <Input
                id="company"
                placeholder='ООО "Рога и Копыта"'
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel}>
              Отмена
            </Button>
            <Button type="submit">
              Добавить клиента
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Switch } from '@/app/components/ui/switch';
import { Separator } from '@/app/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Smartphone, Users, Shield, Bell } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsPage() {
  const handleSave = () => {
    toast.success('Настройки сохранены');
  };

  return (
    <div className="h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="px-8 py-6">
          <h1 className="text-2xl font-semibold mb-1">Настройки</h1>
          <p className="text-sm text-muted-foreground">
            Управление параметрами системы
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="max-w-4xl">
          <Tabs defaultValue="sms" className="space-y-6">
            <TabsList>
              <TabsTrigger value="sms" className="gap-2">
                <Smartphone className="w-4 h-4" />
                SMS-провайдер
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="w-4 h-4" />
                Пользователи
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                Безопасность
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Уведомления
              </TabsTrigger>
            </TabsList>

            {/* SMS Provider */}
            <TabsContent value="sms">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Настройки SMS-провайдера</h3>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="smsProvider">Провайдер</Label>
                    <Select defaultValue="smsc">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="smsc">SMSC.ru</SelectItem>
                        <SelectItem value="smsaero">SMS Aero</SelectItem>
                        <SelectItem value="twilio">Twilio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API ключ</Label>
                    <Input id="apiKey" type="password" defaultValue="••••••••••••••••" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="senderName">Имя отправителя</Label>
                    <Input id="senderName" defaultValue="SignDoc" maxLength={11} />
                    <p className="text-xs text-muted-foreground">
                      Максимум 11 символов латиницей
                    </p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Шаблон SMS с ссылкой</Label>
                    <Input
                      defaultValue="Подпишите документ: {link}"
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Шаблон SMS с кодом</Label>
                    <Input
                      defaultValue="Код подтверждения: {code}"
                      className="font-mono text-sm"
                    />
                  </div>

                  <Button variant="outline">Отправить тестовое SMS</Button>
                </div>
              </Card>
            </TabsContent>

            {/* Users */}
            <TabsContent value="users">
              <Card className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Пользователи</h3>
                  <p className="text-sm text-muted-foreground">
                    Пользователи создаются администратором через SQL команды
                  </p>
                </div>
                <div className="space-y-4">
                  {[
                    { name: 'Мария Петрова', email: 'maria@company.ru', role: 'Admin' },
                    { name: 'Иван Сидоров', email: 'ivan@company.ru', role: 'Manager' },
                  ].map((user, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm px-2.5 py-1 rounded-md bg-muted">
                          {user.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Security */}
            <TabsContent value="security">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Безопасность</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-0.5">
                      <Label>IP whitelist</Label>
                      <p className="text-sm text-muted-foreground">
                        Ограничить доступ по IP-адресам
                      </p>
                    </div>
                    <Switch />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-0.5">
                      <Label>Логирование действий</Label>
                      <p className="text-sm text-muted-foreground">
                        Записывать все действия пользователей
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Время хранения логов (дней)</Label>
                    <Select defaultValue="90">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 дней</SelectItem>
                        <SelectItem value="90">90 дней</SelectItem>
                        <SelectItem value="180">180 дней</SelectItem>
                        <SelectItem value="365">1 год</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Notifications */}
            <TabsContent value="notifications">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-6">Уведомления</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-0.5">
                      <Label>Email-уведомления</Label>
                      <p className="text-sm text-muted-foreground">
                        Получать уведомления о новых подписаниях
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-0.5">
                      <Label>Напоминания о дедлайнах</Label>
                      <p className="text-sm text-muted-foreground">
                        За 24 часа до истечения срока
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="space-y-0.5">
                      <Label>Уведомления об ошибках</Label>
                      <p className="text-sm text-muted-foreground">
                        Отправка SMS и другие сбои
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end mt-8">
            <Button onClick={handleSave}>Сохранить изменения</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
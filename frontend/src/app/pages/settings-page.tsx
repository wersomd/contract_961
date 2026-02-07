import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Users, Loader2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

export function SettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/settings/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Ошибка загрузки пользователей');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700';
      case 'manager': return 'bg-blue-100 text-blue-700';
      default: return 'bg-muted';
    }
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
          <Card className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Пользователи
              </h3>
              <p className="text-sm text-muted-foreground">
                Пользователи системы
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">
                {error}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Пользователи не найдены
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name || user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm px-2.5 py-1 rounded-md ${getRoleColor(user.role)}`}>
                        {getRoleLabel(user.role)}
                      </span>
                      {!user.isActive && (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-600">
                          Неактивен
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
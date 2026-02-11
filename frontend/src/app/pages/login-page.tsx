import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card } from '@/app/components/ui/card';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/auth.service';
import logoImage from '@/assets/logo.png';

interface LoginPageProps {
  onLogin?: (token: string, user: any) => void;
  onForgotPassword?: () => void;
}

export function LoginPage({ onLogin, onForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ email, password });
      onLogin?.(response.token, response.user);
    } catch (err: any) {
      console.error('Login error:', err);
      // Extract error message from various response structures
      let message = 'Неверный email или пароль';
      if (err?.data?.error) {
        message = err.data.error;
      } else if (err?.data?.message) {
        message = err.data.message;
      } else if (typeof err?.message === 'string' && !err.message.startsWith('API Error')) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-4">
            <div className="px-4 py-3 rounded-lg bg-primary">
              <img src={logoImage} alt="961.kz" className="h-10" />
            </div>
            <p className="text-sm text-muted-foreground">Платформа подписания документов</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="p-8 shadow-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold mb-2">Вход в систему</h2>
            <p className="text-sm text-muted-foreground">
              Введите свои данные для входа
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@961.kz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Пароль</Label>
                <button
                  type="button"
                  onClick={onForgotPassword}
                  className="text-sm text-primary hover:underline"
                >
                  Забыли пароль?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11"
              disabled={loading}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2026 961.kz. Все права защищены.</p>
        </div>
      </div>
    </div>
  );
}
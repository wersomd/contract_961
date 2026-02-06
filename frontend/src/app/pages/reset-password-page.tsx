import React, { useState } from 'react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Card } from '@/app/components/ui/card';
import { FileText, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';

interface ResetPasswordPageProps {
  onBack?: () => void;
}

export function ResetPasswordPage({ onBack }: ResetPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setSent(true);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <FileText className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">SignDoc</h1>
              <p className="text-sm text-muted-foreground">Платформа подписания документов</p>
            </div>
          </div>
        </div>

        {/* Reset Form */}
        <Card className="p-8 shadow-lg">
          {!sent ? (
            <>
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Назад к входу
              </button>

              <div className="mb-6">
                <h2 className="text-2xl font-semibold mb-2">Восстановление пароля</h2>
                <p className="text-sm text-muted-foreground">
                  Введите ваш email и мы отправим инструкции по восстановлению
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : 'Отправить инструкции'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Письмо отправлено</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Инструкции по восстановлению пароля отправлены на <br />
                <span className="font-medium text-foreground">{email}</span>
              </p>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 text-left mb-6">
                <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  Если письмо не пришло в течение 5 минут, проверьте папку "Спам" или попробуйте снова
                </div>
              </div>
              <Button onClick={onBack} variant="outline" className="w-full">
                Вернуться к входу
              </Button>
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2026 SignDoc. Все права защищены.</p>
        </div>
      </div>
    </div>
  );
}

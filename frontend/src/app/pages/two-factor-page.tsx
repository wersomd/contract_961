import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/app/components/ui/button';
import { Card } from '@/app/components/ui/card';
import { FileText, Shield, AlertCircle } from 'lucide-react';

interface TwoFactorPageProps {
  onVerify?: () => void;
  onBack?: () => void;
}

export function TwoFactorPage({ onVerify, onBack }: TwoFactorPageProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    if (!/^\d*$/.test(value)) {
      return;
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 5 && value && newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) {
      return;
    }

    const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setCode(newCode);

    if (newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''));
    } else {
      const nextEmptyIndex = newCode.findIndex(digit => !digit);
      inputRefs.current[nextEmptyIndex]?.focus();
    }
  };

  const handleVerify = async (codeValue: string) => {
    setLoading(true);
    setError('');

    // Simulate API call
    setTimeout(() => {
      if (codeValue === '123456') {
        onVerify?.();
      } else {
        setError('Неверный код подтверждения');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
      setLoading(false);
    }, 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codeValue = code.join('');
    if (codeValue.length === 6) {
      handleVerify(codeValue);
    }
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

        {/* 2FA Form */}
        <Card className="p-8 shadow-lg">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold mb-2">Двухфакторная аутентификация</h2>
            <p className="text-sm text-muted-foreground">
              Введите 6-значный код из приложения-аутентификатора
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-xl font-semibold border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-input-background"
                  disabled={loading}
                />
              ))}
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
              disabled={loading || code.some(digit => !digit)}
            >
              {loading ? 'Проверка...' : 'Подтвердить'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <button
              onClick={onBack}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Вернуться к входу
            </button>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Для теста используйте код: <span className="font-medium">123456</span>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2026 SignDoc. Все права защищены.</p>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';

interface ClientEnterCodePageProps {
  onSuccess?: () => void;
  onBack?: () => void;
  token?: string | null;
}

export function ClientEnterCodePage({ onSuccess, onBack, token }: ClientEnterCodePageProps) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (token) {
      sendCode();
    }
  }, [token]);

  useEffect(() => {
    inputRefs.current[0]?.focus();

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendCode = async () => {
    if (!token) return;
    setSendingCode(true);
    setError('');

    try {
      const res = await fetch(`/sign/${token}/send-code`, { method: 'POST' });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Ошибка отправки кода');
      } else {
        setTimer(60);
        setCanResend(false);
      }
    } catch (err) {
      setError('Ошибка соединения');
    } finally {
      setSendingCode(false);
    }
  };

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

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((digit) => digit !== '') && newCode.length === 6) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (codeValue: string) => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/sign/${token}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeValue })
      });
      const data = await res.json();

      if (data.success) {
        onSuccess?.();
      } else {
        setError(data.error || 'Неверный код');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Ошибка проверки кода');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    sendCode();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-4 md:py-6">
          <div className="flex items-center justify-between">
            <div className="bg-[#0066FF] rounded-lg p-2">
              <img src={logo} alt="961.kz" className="h-8 w-auto" />
            </div>
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Назад
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center p-4 py-8 md:py-16">
        <Card className="w-full max-w-md p-6 md:p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">Введите код подтверждения</h2>
            <p className="text-sm text-muted-foreground">
              Код отправлен в SMS на ваш номер телефона
            </p>
          </div>

          <div className="space-y-6">
            {/* Code Input */}
            <div className="flex justify-center gap-2 md:gap-3" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={loading}
                  className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold rounded-lg border-2 transition-colors
                    ${error ? 'border-red-500 bg-red-50' : 'border-border focus:border-primary'}
                    focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50`}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm">Проверка кода...</span>
              </div>
            )}

            {/* Timer & Resend */}
            <div className="text-center">
              {sendingCode ? (
                <p className="text-sm text-muted-foreground">Отправка кода...</p>
              ) : canResend ? (
                <Button variant="link" onClick={handleResend} className="text-primary">
                  Отправить код повторно
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Повторная отправка через <span className="font-semibold">{timer}</span> сек
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pb-8">
        <p>© 2026 961.kz. Электронное подписание документов</p>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Shield, AlertCircle, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="961.kz" className="h-10 w-auto" />
              <div className="hidden sm:block">
                <p className="text-xs text-white/40">Безопасное подписание</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Назад</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex items-center justify-center p-4 py-12 md:py-20">
        <Card className="w-full max-w-md p-8 md:p-10 bg-white/5 backdrop-blur-xl border-white/10">
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <Shield className="w-10 h-10 text-primary" />
            </div>
          </div>

          <div className="mb-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Подтвердите подписание</h2>
            <p className="text-white/50">
              Введите 6-значный код из SMS
            </p>
          </div>

          <div className="space-y-8">
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
                  className={`w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold rounded-xl bg-white/10 border-2 transition-all text-white
                    ${error ? 'border-red-400 bg-red-500/10' : 'border-white/20 focus:border-primary focus:bg-white/15'}
                    focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50`}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center justify-center gap-2 text-red-400 bg-red-500/10 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-3 text-primary">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                <span className="text-sm">Проверка кода...</span>
              </div>
            )}

            {/* Timer & Resend */}
            <div className="text-center">
              {sendingCode ? (
                <p className="text-sm text-white/50">Отправка кода...</p>
              ) : canResend ? (
                <Button
                  variant="ghost"
                  onClick={handleResend}
                  className="text-primary hover:text-primary/80 hover:bg-primary/10"
                >
                  Отправить код повторно
                </Button>
              ) : (
                <p className="text-sm text-white/50">
                  Повторная отправка через <span className="text-primary font-semibold">{timer}</span> сек
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <div className="flex items-center justify-center gap-2 text-white/30 text-xs mb-2">
          <Sparkles className="w-3 h-3 text-primary/50" />
          <span>Защищённое соединение</span>
        </div>
        <p className="text-xs text-white/30">© 2026 961.kz. Электронное подписание документов</p>
      </div>
    </div>
  );
}

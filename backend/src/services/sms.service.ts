import { config } from '../config/index.js';

export interface SmsResult {
    success: boolean;
    messageId?: string;
    error?: string;
    errorCode?: number;
}

interface SmscResponse {
    id?: number;
    cnt?: number;
    error?: string;
    error_code?: number;
    cost?: string;
}

/**
 * SMSC.kz SMS Provider
 * 
 * API Documentation: https://smsc.kz/api/
 */
export class SmscProvider {
    private readonly login: string;
    private readonly password: string;
    private readonly sender: string;
    private readonly apiUrl: string;

    constructor() {
        this.login = config.smsc.login;
        this.password = config.smsc.password;
        this.sender = config.smsc.sender;
        this.apiUrl = config.smsc.apiUrl;
    }

    /**
     * Send SMS message
     */
    async send(phone: string, message: string): Promise<SmsResult> {
        try {
            const params = new URLSearchParams({
                login: this.login,
                psw: this.password,
                phones: phone.replace('+', ''),
                mes: message,
                sender: this.sender,
                fmt: '3',
                charset: 'utf-8',
            });

            const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
                method: 'GET',
            });

            const data = await response.json() as SmscResponse;

            if (data.error) {
                console.error('[SMSC] Error:', data.error, 'Code:', data.error_code);
                return {
                    success: false,
                    error: this.getErrorMessage(data.error_code || 0),
                    errorCode: data.error_code,
                };
            }

            console.log('[SMSC] SMS sent, ID:', data.id, 'Parts:', data.cnt);
            return {
                success: true,
                messageId: String(data.id),
            };
        } catch (error) {
            console.error('[SMSC] Network error:', error);
            return {
                success: false,
                error: 'Network error',
            };
        }
    }

    /**
     * Get cost of sending SMS
     */
    async getCost(phone: string, message: string): Promise<{ cost: string; parts: number } | null> {
        try {
            const params = new URLSearchParams({
                login: this.login,
                psw: this.password,
                phones: phone.replace('+', ''),
                mes: message,
                cost: '1',
                fmt: '3',
                charset: 'utf-8',
            });

            const response = await fetch(`${this.apiUrl}?${params.toString()}`);
            const data = await response.json() as SmscResponse;

            if (data.error) {
                return null;
            }

            return {
                cost: data.cost || '0',
                parts: data.cnt || 1,
            };
        } catch {
            return null;
        }
    }

    private getErrorMessage(code: number): string {
        const errors: Record<number, string> = {
            1: 'Ошибка в параметрах',
            2: 'Неверный логин или пароль',
            3: 'Недостаточно средств',
            4: 'IP-адрес заблокирован',
            5: 'Неверный формат даты',
            6: 'Сообщение запрещено',
            7: 'Неверный формат номера',
            8: 'Сообщение не может быть доставлено',
            9: 'Дублирующий запрос',
        };
        return errors[code] || 'Неизвестная ошибка';
    }
}

export const smsProvider = new SmscProvider();

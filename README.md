# 961.kz - Полная документация

## Содержание
1. [Обзор проекта](#обзор-проекта)
2. [Быстрый старт](#быстрый-старт)
3. [Архитектура](#архитектура)
4. [База данных](#база-данных)
5. [API эндпоинты](#api-эндпоинты)
6. [SMSC.kz интеграция](#smsc-интеграция)
7. [Деплой](#деплой)
8. [Безопасность](#безопасность)

---

## Обзор проекта

961.kz - платформа для электронного подписания документов с подтверждением по SMS-коду.

**Основной флоу:**
1. Менеджер создает заявку, загружает PDF, вводит данные клиента
2. Система отправляет SMS со ссылкой на подписание
3. Клиент открывает ссылку, просматривает документ
4. Клиент нажимает "Подписать", получает SMS с кодом
5. Клиент вводит код - документ подписан
6. Система генерирует PDF со штампом и QR-кодом для верификации

---

## Быстрый старт

### Требования
- Docker & Docker Compose
- Node.js 20+ (для локальной разработки)

### Запуск через Docker (рекомендуется)

```bash
# 1. Клонируйте репозиторий
cd signdoc_961

# 2. Скопируйте и заполните .env
cp .env.example .env
# Отредактируйте .env: добавьте SMSC_LOGIN, SMSC_PASSWORD, JWT_SECRET

# 3. Запустите все сервисы
docker-compose up -d

# 4. Примените миграции базы данных
docker-compose exec backend npx prisma migrate deploy

# 5. Заполните начальными данными
docker-compose exec backend npx tsx prisma/seed.ts
```

Приложение доступно:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **PostgreSQL**: localhost:5432

### Локальная разработка

```bash
# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run dev

# Frontend (в другом терминале)
cd frontend
npm install
npm run dev
```

### Учетные данные по умолчанию
- **Admin**: admin@961.kz / admin123
- **Manager**: manager@961.kz / manager123

---

## Архитектура

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Frontend    │────▶│     Backend     │────▶│   PostgreSQL    │
│   (React+Vite)  │     │  (Node/Express) │     │                 │
│     nginx       │     │   + Prisma ORM  │     │  Prisma Schema  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │    SMSC.kz      │
                        │   SMS Gateway   │
                        └─────────────────┘
```

**Технологии:**
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL 16
- **SMS**: SMSC.kz API
- **PDF**: pdf-lib + qrcode

---

## База данных

### Схема Prisma

```prisma
// Основные сущности:
- Organization  - организация (мульти-тенант)
- User          - пользователь (admin/manager)
- Client        - клиент (подписант)
- Request       - заявка на подписание
- Document      - загруженный PDF документ
- DocumentVersion - версии документа (original/signed)
- OtpCode       - одноразовые коды
- AuditLog      - журнал действий
- Settings      - настройки организации
```

### Миграции

```bash
# Создать новую миграцию
npx prisma migrate dev --name add_feature

# Применить миграции (продакшен)
npx prisma migrate deploy

# Сбросить БД (только разработка!)
npx prisma migrate reset
```

---

## API эндпоинты

### Авторизация

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/auth/login | Вход (email, password) |
| POST | /api/auth/logout | Выход |
| GET | /api/auth/me | Текущий пользователь |

### Заявки (требуют JWT)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/requests | Список заявок |
| POST | /api/requests | Создать заявку (multipart/form-data) |
| GET | /api/requests/:id | Детали заявки |
| POST | /api/requests/:id/resend | Повторить SMS |
| PUT | /api/requests/:id/cancel | Отменить заявку |
| GET | /api/requests/:id/document | Скачать оригинал PDF |
| GET | /api/requests/:id/signed-document | Скачать подписанный PDF |

### Клиенты (требуют JWT)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /api/clients | Список клиентов |
| POST | /api/clients | Добавить клиента |
| GET | /api/clients/:id | Детали клиента |

### Публичное подписание

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /sign/:token | Информация о заявке |
| GET | /sign/:token/document | Просмотр PDF |
| POST | /sign/:token/send-code | Отправить OTP |
| POST | /sign/:token/verify | Проверить OTP и подписать |

### Верификация

| Метод | Путь | Описание |
|-------|------|----------|
| GET | /verify/:displayId | Проверить подпись по REQ-ID |

---

## SMSC интеграция

### Настройка

В `.env`:
```
SMSC_LOGIN=ваш_логин
SMSC_PASSWORD=ваш_пароль
SMSC_SENDER=961kz
```

> ⚠️ Sender name должен быть зарегистрирован в личном кабинете SMSC.kz

### Использование API

```typescript
// backend/src/services/sms.service.ts
import { smsProvider } from '../services/sms.service.js';

// Отправить SMS
const result = await smsProvider.send('+77070001234', 'Ваш код: 123456');

if (result.success) {
  console.log('SMS отправлено, ID:', result.messageId);
} else {
  console.error('Ошибка:', result.error);
}

// Узнать стоимость
const cost = await smsProvider.getCost('+77070001234', 'Текст сообщения');
console.log('Стоимость:', cost?.cost, 'Частей:', cost?.parts);
```

### Шаблоны SMS

Редактируются в настройках:
- **Ссылка**: `Подпишите документ: {link}`
- **Код**: `Код подтверждения: {code}`

### Коды ошибок SMSC.kz

| Код | Описание |
|-----|----------|
| 1 | Ошибка в параметрах |
| 2 | Неверный логин/пароль |
| 3 | Недостаточно средств |
| 4 | IP заблокирован |
| 5 | Неверный формат даты |
| 6 | Сообщение запрещено |
| 7 | Неверный формат номера |
| 8 | Не может быть доставлено |
| 9 | Дублирующий запрос |

---

## Деплой

### Docker Compose (продакшен)

```yaml
# docker-compose.prod.yml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    # ... volumes для persistence

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://...
      JWT_SECRET: ${JWT_SECRET}
      # ... SMSC credentials

  frontend:
    build: ./frontend
    ports:
      - "443:443"
    # ... SSL certs
```

### HTTPS (обязательно для продакшена)

Используйте Caddy, Traefik или nginx с Let's Encrypt:

```nginx
server {
    listen 443 ssl http2;
    server_name 961.kz;

    ssl_certificate /etc/letsencrypt/live/961.kz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/961.kz/privkey.pem;

    # ... остальная конфигурация
}
```

---

## Безопасность

### Чеклист

- [x] JWT авторизация с истечением
- [x] Хэширование паролей (bcrypt, cost 12)
- [x] Хэширование OTP кодов
- [x] Rate limiting на OTP эндпоинты
- [x] CORS только для разрешенных доменов
- [x] Helmet security headers
- [x] Аудит логирование
- [x] Нормализация телефонов (защита от инъекций)

### Рекомендации для продакшена

1. **JWT_SECRET**: минимум 32 случайных символа
2. **HTTPS**: обязательно для всех эндпоинтов
3. **Firewall**: ограничьте доступ к PostgreSQL
4. **Бэкапы**: настройте pg_dump по расписанию
5. **Мониторинг**: подключите Sentry или аналог

---

## Troubleshooting

### SMS не отправляется

1. Проверьте баланс в SMSC.kz
2. Убедитесь, что Sender зарегистрирован
3. Проверьте формат номера (+77xxxxxxxxx)
4. Посмотрите логи: `docker-compose logs backend`

### PDF не генерируется

1. Проверьте права на папку uploads
2. Убедитесь, что оригинал PDF существует
3. Проверьте логи на ошибки pdf-lib

### База данных не подключается

1. Проверьте, что postgres контейнер running
2. Убедитесь в корректности DATABASE_URL
3. Попробуйте `docker-compose down -v && docker-compose up -d`

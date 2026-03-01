# 🚀 Деплой Contract 961 на Ubuntu VPS

## Требования к серверу
- Ubuntu 22.04+
- 1 vCPU, 1 GB RAM минимум
- Домен (например `contract.961.kz`), направленный на IP сервера

---

## Шаг 1. Подготовка сервера

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем необходимые пакеты
sudo apt install -y git curl nginx certbot python3-certbot-nginx
```

## Шаг 2. Установка Docker

```bash
# Удаляем старые версии
sudo apt remove -y docker docker-engine docker.io containerd runc

# Добавляем репозиторий Docker
curl -fsSL https://get.docker.com | sudo sh

# Добавляем пользователя в группу docker (чтобы не писать sudo)
sudo usermod -aG docker $USER

# Устанавливаем docker compose plugin
sudo apt install -y docker-compose-plugin

# Перелогиниваемся (чтобы группа применилась)
exit
# Заходим заново через SSH

# Проверяем
docker --version
docker compose version
```

## Шаг 3. Клонирование проекта

```bash
cd /opt
sudo mkdir -p contract961
sudo chown $USER:$USER contract961
cd contract961

# Клонируем (замените URL на свой репозиторий)
git clone <YOUR_REPO_URL> .

# Или копируем файлы через scp:
# scp -r ./signdoc_961/* user@server:/opt/contract961/
```

## Шаг 4. Настройка .env

```bash
cp .env.example .env
nano .env
```

**Заполните обязательные поля:**

```env
# ----- Database -----
POSTGRES_USER=signdoc
POSTGRES_PASSWORD=ВАШ_СЛОЖНЫЙ_ПАРОЛЬ_БД
POSTGRES_DB=signdoc_961
DATABASE_URL=postgresql://signdoc:ВАШ_СЛОЖНЫЙ_ПАРОЛЬ_БД@postgres:5432/signdoc_961?schema=public

# ----- JWT -----
# Сгенерируйте: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Или: openssl rand -hex 64
JWT_SECRET=ВСТАВЬТЕ_СГЕНЕРИРОВАННЫЙ_КЛЮЧ
JWT_EXPIRES_IN=7d

# ----- SMSC.kz -----
SMSC_LOGIN=ваш_логин
SMSC_PASSWORD=ваш_пароль
SMSC_SENDER=961kz

# ----- URLs (ваш домен) -----
FRONTEND_URL=https://contract.961.kz
PUBLIC_URL=https://contract.961.kz
```

## Шаг 5. Запуск Docker контейнеров

```bash
# Собираем и запускаем
docker compose up -d --build

# Ждём ~30 секунд, проверяем статусы
docker compose ps

# Все 3 контейнера должны быть Up:
# signdoc_db        Up (healthy)
# signdoc_backend   Up
# signdoc_frontend  Up
```

## Шаг 6. Инициализация базы данных

```bash
# Создаём таблицы
docker compose exec backend npx prisma db push

# Заполняем начальными данными (admin пользователь)
docker compose exec backend npx tsx prisma/seed.ts

# Должно вывести:
# 🌱 Seeding database...
# ✅ Organization created: 961.kz
# ✅ Admin user created: admin@961.kz
# ✅ Settings created
# 🎉 Seeding complete!
```

> ⚠️ **ВАЖНО**: Если видите ошибку `organizations does not exist`, значит шаг `prisma db push` не выполнился. Повторите его. Если ошибка `EACCES: permission denied`, пересоберите контейнер: `docker compose down && docker compose up -d --build`

## Шаг 7. Настройка Nginx + SSL

```bash
# Копируем конфигурацию nginx
sudo cp nginx-ssl.conf /etc/nginx/sites-available/contract.961.kz

# Активируем
sudo ln -s /etc/nginx/sites-available/contract.961.kz /etc/nginx/sites-enabled/

# Удаляем дефолтный конфиг (если есть)
sudo rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию
sudo nginx -t

# Перезагружаем nginx
sudo systemctl reload nginx
```

### Получаем SSL сертификат (Let's Encrypt):

```bash
sudo certbot --nginx -d contract.961.kz

# Следуйте инструкциям:
# - Введите email
# - Согласитесь с условиями
# - Выберите redirect HTTP → HTTPS (рекомендуется)

# Проверяем автообновление
sudo certbot renew --dry-run
```

## Шаг 8. Проверка

```bash
# Локально на сервере
curl -I http://localhost:8080

# С браузера
# https://contract.961.kz — должен открыться логин
# Логин: admin@961.kz
# Пароль: admin123
```

---

## ⚠️ Docker Compose: порт 8080

Nginx на хосте проксирует на `127.0.0.1:8080`,
поэтому в `docker-compose.yml` фронтенд должен слушать порт **8080**:

```yaml
frontend:
  ports:
    - "8080:80"   # <-- НЕ 80:80, а 8080:80
```

Это нужно потому что порт 80 на хосте уже занят nginx (для SSL).

---

## 📋 Полезные команды

```bash
# Логи
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Перезапуск
docker compose restart backend

# Пересборка после изменений в коде
docker compose up -d --build

# Статус
docker compose ps

# Бэкап базы данных
docker compose exec postgres pg_dump -U signdoc signdoc_961 > backup_$(date +%Y%m%d).sql

# Восстановление бэкапа
cat backup_20260302.sql | docker compose exec -T postgres psql -U signdoc signdoc_961

# Обновление кода
git pull
docker compose up -d --build
docker compose exec backend npx prisma db push  # если были изменения схемы
```

## 🔐 Безопасность

```bash
# Настроить файрвол
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP (для Let's Encrypt)
sudo ufw allow 443   # HTTPS
sudo ufw enable

# НЕ открывайте порт 5432 (PostgreSQL) наружу!
# НЕ открывайте порт 3000 (backend) наружу!
# НЕ открывайте порт 8080 наружу!
```

## 🔄 Автозапуск при перезагрузке

Docker с `restart: unless-stopped` автоматически поднимет контейнеры.
Убедитесь что Docker запускается при старте системы:

```bash
sudo systemctl enable docker
```

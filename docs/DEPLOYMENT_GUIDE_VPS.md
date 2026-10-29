# PANDUAN DEPLOYMENT SENTANU ERP KE VPS LINUX (UBUNTU 22.04 / 24.04 LTS)

## 📌 Target Spesifikasi VPS
- **Provider**: Hostinger KVM / BiznetGio / IDCloudHost
- **Spesifikasi**: 2 vCPU, 4–8 GB RAM, 50 GB SSD NVMe
- **OS**: Ubuntu 22.04 / 24.04 LTS

---

## 🛠️ Langkah 1: Install Dependency & Service Utama

```bash
# Update System
sudo apt update && sudo apt upgrade -y

# Install Nginx, PostgreSQL 16, Redis, Supervisor, Git, Unzip
sudo apt install -y nginx postgresql postgresql-contrib redis-server supervisor git unzip curl

# Install PHP 8.3 & Ekstensi Laravel
sudo apt install -y php8.3-fpm php8.3-cli php8.3-pgsql php8.3-curl php8.3-mbstring php8.3-xml php8.3-zip php8.3-redis php8.3-intl

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

---

## 🐘 Langkah 2: Setup Database PostgreSQL 16

```bash
sudo -u postgres psql -c "CREATE DATABASE sentanu_erp;"
sudo -u postgres psql -c "CREATE USER sentanu_user WITH PASSWORD 'REDACTED_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE sentanu_erp TO sentanu_user;"
```

---

## ⚙️ Langkah 3: Deployment Backend Laravel 11

```bash
cd /var/www
sudo git clone https://github.com/galiiih/SentanuJaya.git sentanu-erp
cd sentanu-erp/backend

# Install dependencies
composer install --no-dev --optimize-autoloader

# Copy & Setup Environment
cp .env.example .env
nano .env
```

Isi konfigurasi `.env`:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://erp.sentanujaya.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=sentanu_erp
DB_USERNAME=sentanu_user
DB_PASSWORD=REDACTED_PASSWORD

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
```

```bash
# Generate Key & Migrate Database
php artisan key:generate
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 🎨 Langkah 4: Deployment Frontend React (Vite Build)

```bash
cd /var/www/sentanu-erp/frontend
npm install
npm run build
```
Hasil kompilasi static files di `/var/www/sentanu-erp/frontend/dist` akan diserve oleh Nginx.

---

## 🌐 Langkah 5: Konfigurasi Nginx Server Block

Buat file `/etc/nginx/sites-available/sentanu-erp`:
```nginx
server {
    listen 80;
    server_name erp.sentanujaya.com;
    root /var/www/sentanu-erp/frontend/dist;

    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sentanu-erp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 Langkah 6: Install SSL HTTPS (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d erp.sentanujaya.com
```

---

## 🔄 Langkah 7: Setup Queue Worker via Supervisor

Buat file `/etc/supervisor/conf.d/sentanu-worker.conf`:
```ini
[program:sentanu-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/sentanu-erp/backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/sentanu-erp/backend/storage/logs/worker.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start sentanu-worker:*
```

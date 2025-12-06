FROM php:8.2-fpm

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    curl \
    libzip-dev \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    libicu-dev

# Install PHP extensions required by Laravel
RUN docker-php-ext-install pdo pdo_mysql mbstring exif pcntl bcmath intl zip

# Configure and install opcache separately
RUN docker-php-ext-configure opcache --enable-opcache
RUN docker-php-ext-install opcache

# Install Composer
COPY --from=composer:2.6 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

COPY . .

RUN composer install --no-dev --optimize-autoloader --no-interaction

# Install Node.js 18 and npm
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

RUN npm install
RUN npm run build

# Laravel optimization caches
RUN php artisan config:cache
RUN php artisan route:cache
RUN php artisan view:cache

EXPOSE 80

CMD ["php-fpm", "-F"]

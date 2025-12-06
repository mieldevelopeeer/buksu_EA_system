# Use official PHP image with extensions we need
FROM php:8.2-fpm

# Install system packages
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    curl \
    libicu-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    libzip-dev

# Install composer
COPY --from=composer:2.6 /usr/bin/composer /usr/bin/composer

# Set work directory
WORKDIR /var/www

# Copy app files
COPY . .

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader

# Install Node (for Vite)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
RUN apt-get install -y nodejs

# Build frontend
RUN npm install
RUN npm run build

# Laravel optimizations
RUN php artisan config:cache
RUN php artisan route:cache
RUN php artisan view:cache

# Expose port (Render sets $PORT)
EXPOSE 80

# Start PHP-FPM on the correct port
CMD ["php-fpm", "-F"]

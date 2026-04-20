# Стадия 1: Сборка React приложения
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json (package-lock.json опционально)
COPY package*.json ./
RUN npm install

# Копируем исходный код и собираем
COPY . .
RUN npm run build

# Стадия 2: Сервер Nginx для отдачи статики
FROM nginx:alpine

# Копируем собранные файлы из стадии builder
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем кастомную конфигурацию Nginx (опционально)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
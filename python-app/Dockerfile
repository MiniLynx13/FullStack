FROM python:3.12-slim

WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
	gcc \
	libjpeg-dev \
	zlib1g-dev \
	curl \
	&& rm -rf /var/lib/apt/lists/*

# Копируем зависимости и устанавливаем их
COPY req.txt .
RUN pip install --no-cache-dir -r req.txt

# Копируем исходный код
COPY . .

# Создаем папку для базы данных
RUN mkdir -p /app/data

# Открываем порт
EXPOSE 8000

# Команда запуска
CMD ["python", "main.py"]
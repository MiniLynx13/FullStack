import os
from dotenv import load_dotenv

# Загружаем .env.test если в тестовом режиме
if os.environ.get('ENVIRONMENT') == 'test':
    load_dotenv('.env.test')
else:
    load_dotenv()

# Database
DATABASE_PATH = os.getenv('DATABASE_PATH', 'app.db')

# MinIO Configuration
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'grant_access')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'ai_food_analysing')
MINIO_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME', 'ingredients')
MINIO_SECURE = os.getenv('MINIO_SECURE', 'False').lower() == 'true'

# Ollama Configuration
OLLAMA_HOST = os.getenv('OLLAMA_HOST', 'http://localhost:11434')

# Token Configuration
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv('ACCESS_TOKEN_EXPIRE_MINUTES', 15))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv('REFRESH_TOKEN_EXPIRE_DAYS', 7))

# CORS
CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

# Server
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 8000))

ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
IS_PRODUCTION = ENVIRONMENT == 'production'
BASE_URL = os.getenv('BASE_URL', 'http://localhost:3000')  # Для продакшена
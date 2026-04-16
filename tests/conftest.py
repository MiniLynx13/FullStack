# Общий конфигурационный файл для всех тестов
import os
import sys
import tempfile
import pytest
from typing import Generator

# Добавляем пути к python-app в sys.path для корректного импорта
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
python_app_path = os.path.join(project_root, 'python-app')

if python_app_path not in sys.path:
    sys.path.insert(0, python_app_path)


@pytest.fixture(scope="session")
def temp_db_file() -> Generator[str, None, None]:
    """Создает временный файл для тестовой БД"""
    temp_db = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    temp_path = temp_db.name
    temp_db.close()
    
    yield temp_path
    
    if os.path.exists(temp_path):
        os.unlink(temp_path)


@pytest.fixture
def mock_env_vars():
    """Мок для переменных окружения"""
    original_env = os.environ.copy()
    
    # Устанавливаем тестовые переменные
    os.environ['DATABASE_PATH'] = ':memory:'
    os.environ['MINIO_ENDPOINT'] = 'localhost:9000'
    os.environ['MINIO_ACCESS_KEY'] = 'test_access'
    os.environ['MINIO_SECRET_KEY'] = 'test_secret'
    os.environ['MINIO_BUCKET_NAME'] = 'test_bucket'
    os.environ['MINIO_SECURE'] = 'false'
    os.environ['OLLAMA_HOST'] = 'http://localhost:11434'
    os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'] = '15'
    os.environ['REFRESH_TOKEN_EXPIRE_DAYS'] = '7'
    os.environ['CORS_ORIGINS'] = 'http://localhost:3000'
    os.environ['ENVIRONMENT'] = 'test'
    
    yield
    
    os.environ.clear()
    os.environ.update(original_env)
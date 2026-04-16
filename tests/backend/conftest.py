import pytest
import sqlite3
import os
import sys
import tempfile
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

# Получаем корневую директорию проекта
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PYTHON_APP_DIR = os.path.join(ROOT_DIR, 'python-app')

# Добавляем python-app в путь
if PYTHON_APP_DIR not in sys.path:
    sys.path.insert(0, PYTHON_APP_DIR)

# Устанавливаем переменные окружения ДО импорта app
os.environ['ENVIRONMENT'] = 'test'
os.environ['MINIO_ENDPOINT'] = 'localhost:9000'
os.environ['MINIO_ACCESS_KEY'] = 'test_access'
os.environ['MINIO_SECRET_KEY'] = 'test_secret'
os.environ['MINIO_BUCKET_NAME'] = 'test_bucket'
os.environ['MINIO_SECURE'] = 'false'
os.environ['OLLAMA_HOST'] = 'http://localhost:11434'
os.environ['ACCESS_TOKEN_EXPIRE_MINUTES'] = '15'
os.environ['REFRESH_TOKEN_EXPIRE_DAYS'] = '7'
os.environ['CORS_ORIGINS'] = 'http://localhost:3000'

# Создаем временную директорию для тестовой БД
TEST_DB_DIR = tempfile.mkdtemp()
TEST_DB_PATH = os.path.join(TEST_DB_DIR, 'test.db')
os.environ['DATABASE_PATH'] = TEST_DB_PATH

# Импортируем app после установки переменных
from main import app
from app.db import get_db_connection, init_db


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Настройка тестовой БД на уровне сессии"""
    print(f"\n=== Setting up test database at {TEST_DB_PATH} ===")
    
    # Принудительно вызываем init_db
    init_db()
    
    # Проверяем, что таблицы созданы
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    table_names = [t[0] for t in tables]
    print(f"Tables created: {table_names}")
    
    conn.close()
    
    if 'users' not in table_names:
        raise RuntimeError("Database tables were not created properly")
    
    print("=== Database setup complete ===\n")
    
    yield
    
    # Очистка после всех тестов
    print(f"\n=== Cleaning up database file {TEST_DB_PATH} ===")
    conn = get_db_connection()
    conn.close()
    if os.path.exists(TEST_DB_PATH):
        os.unlink(TEST_DB_PATH)
    os.rmdir(TEST_DB_DIR)
    print("=== Cleanup complete ===\n")


@pytest.fixture(scope="function")
def client(setup_database):
    """Тестовый клиент FastAPI"""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def test_user(client):
    """Создает тестового пользователя и возвращает токены"""
    import time
    
    unique_suffix = str(int(time.time() * 1000))
    username = f"testuser_{unique_suffix}"
    email = f"test_{unique_suffix}@example.com"
    password = "testpass123"
    
    print(f"Creating test user: {username}")
    
    # Регистрация пользователя
    register_response = client.post("/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    
    if register_response.status_code != 200:
        print(f"Registration failed: {register_response.status_code} - {register_response.text}")
        pytest.fail(f"Registration failed: {register_response.text}")
    
    # Логин
    login_response = client.post("/login", json={
        "username": username,
        "password": password
    })
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code} - {login_response.text}")
        pytest.fail(f"Login failed: {login_response.text}")
    
    data = login_response.json()
    print(f"User created successfully: {username}")
    
    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "user": data["user"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"}
    }


@pytest.fixture(scope="function")
def test_admin(client):
    """Создает тестового администратора"""
    import time
    
    unique_suffix = str(int(time.time() * 1000))
    username = f"adminuser_{unique_suffix}"
    email = f"admin_{unique_suffix}@example.com"
    password = "adminpass123"
    
    print(f"Creating admin user: {username}")
    
    # Создаем пользователя
    register_response = client.post("/register", json={
        "username": username,
        "email": email,
        "password": password
    })
    
    if register_response.status_code != 200:
        pytest.fail(f"Registration failed: {register_response.text}")
    
    # Повышаем роль до admin напрямую в БД
    conn = get_db_connection()
    conn.execute("UPDATE users SET role = 'admin' WHERE username = ?", (username,))
    conn.commit()
    conn.close()
    
    # Логин
    login_response = client.post("/login", json={
        "username": username,
        "password": password
    })
    
    if login_response.status_code != 200:
        pytest.fail(f"Login failed: {login_response.text}")
    
    data = login_response.json()
    print(f"Admin user created successfully: {username}")
    
    return {
        "access_token": data["access_token"],
        "refresh_token": data["refresh_token"],
        "user": data["user"],
        "headers": {"Authorization": f"Bearer {data['access_token']}"}
    }


@pytest.fixture
def mock_ollama():
    """Мок для Ollama API"""
    with patch('app.funcs.call_ollama_with_retry') as mock_call:
        # Создаем синхронную функцию, которая возвращает асинхронный результат
        async def mock_async(*args, **kwargs):
            return {
                'message': {
                    'content': '{"ingredients": ["tomato", "cheese", "flour"]}'
                }
            }
        mock_call.side_effect = mock_async
        yield mock_call


__all__ = ['client', 'test_user', 'test_admin', 'mock_ollama', 'get_db_connection']
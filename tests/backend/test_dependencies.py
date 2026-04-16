# tests/backend/test_dependencies.py
import pytest
import sys
import os
import time

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PYTHON_APP_DIR = os.path.join(ROOT_DIR, 'python-app')
if PYTHON_APP_DIR not in sys.path:
    sys.path.insert(0, PYTHON_APP_DIR)

from app.db import get_db_connection


class TestDependencies:
    """Тесты зависимостей и middleware"""
    
    def test_protected_route_requires_auth(self, client):
        """Защищенный маршрут требует авторизации"""
        response = client.get("/me")
        assert response.status_code == 401
    
    def test_banned_user_cannot_access_protected_routes(self, client):
        """Забаненный пользователь не имеет доступа"""
        unique_suffix = str(int(time.time() * 1000))
        username = f"banneduser_{unique_suffix}"
        
        # Создаем пользователя
        register_response = client.post("/register", json={
            "username": username,
            "email": f"{username}@test.com",
            "password": "pass123"
        })
        assert register_response.status_code == 200
        
        # Баним пользователя
        conn = get_db_connection()
        conn.execute("UPDATE users SET role = 'banned' WHERE username = ?", (username,))
        conn.commit()
        conn.close()
        
        # Логин
        login_response = client.post("/login", json={
            "username": username,
            "password": "pass123"
        })
        
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Тестируем эндпоинт, который использует require_not_banned
        # /medical-data использует require_not_banned
        response = client.get("/medical-data", headers=headers)
        # Забаненный пользователь должен получить 403
        assert response.status_code == 403, f"Expected 403, got {response.status_code}. Response: {response.text}"
        assert "заблокирован" in response.json()["detail"]
    
    def test_invalid_token_returns_401(self, client):
        """Недействительный токен возвращает 401"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = client.get("/me", headers=headers)
        assert response.status_code == 401
    
    def test_missing_token_returns_401(self, client):
        """Отсутствие токена возвращает 401"""
        response = client.get("/me")
        assert response.status_code == 401
import pytest
from datetime import datetime, timedelta
from freezegun import freeze_time

class TestAuth:
    """Тесты аутентификации и управления пользователями"""
    
    def test_register_success(self, client):
        """Успешная регистрация"""
        response = client.post("/register", json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Пользователь успешно зарегистрирован"
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "new@example.com"
        assert "id" in data["user"]
    
    def test_register_duplicate_username(self, client, test_user):
        """Регистрация с существующим username"""
        # test_user уже имеет уникальное имя, используем его
        existing_username = test_user["user"]["username"]
        response = client.post("/register", json={
            "username": existing_username,
            "email": "another@example.com",
            "password": "password123"
        })
        assert response.status_code == 400
        assert "уже существует" in response.json()["detail"]
    
    def test_register_duplicate_email(self, client, test_user):
        """Регистрация с существующим email"""
        existing_email = test_user["user"]["email"]
        response = client.post("/register", json={
            "username": "anotheruser",
            "email": existing_email,
            "password": "password123"
        })
        assert response.status_code == 400
        assert "уже существует" in response.json()["detail"]
    
    def test_login_success(self, client, test_user):
        """Успешный вход"""
        # Используем данные из test_user
        response = client.post("/login", json={
            "username": test_user["user"]["username"],
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["username"] == test_user["user"]["username"]
    
    def test_login_wrong_password(self, client, test_user):
        """Вход с неверным паролем"""
        response = client.post("/login", json={
            "username": test_user["user"]["username"],
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "Неверное имя пользователя или пароль" in response.json()["detail"]
    
    def test_login_nonexistent_user(self, client):
        """Вход с несуществующим пользователем"""
        response = client.post("/login", json={
            "username": "nonexistent",
            "password": "password"
        })
        assert response.status_code == 401
    
    def test_get_current_user(self, client, test_user):
        """Получение информации о текущем пользователе"""
        response = client.get("/me", headers=test_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == test_user["user"]["username"]
        assert data["email"] == test_user["user"]["email"]
    
    def test_get_current_user_unauthorized(self, client):
        """Доступ без авторизации"""
        response = client.get("/me")
        assert response.status_code == 401
    
    def test_logout(self, client, test_user):
        """Выход из системы"""
        response = client.post("/logout", headers=test_user["headers"])
        assert response.status_code == 200
        assert response.json()["message"] == "Успешный выход из системы"
        
        # После выхода токен должен быть недействителен
        response = client.get("/me", headers=test_user["headers"])
        assert response.status_code == 401
    
    def test_refresh_token(self, client, test_user):
        """Обновление токенов"""
        response = client.post("/refresh-token", 
                              headers={"Authorization": f"Bearer {test_user['refresh_token']}"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["access_token"] != test_user["access_token"]
    
    def test_refresh_token_invalid(self, client):
        """Обновление с недействительным refresh токеном"""
        response = client.post("/refresh-token", 
                              headers={"Authorization": "Bearer invalid_token"})
        assert response.status_code == 401


class TestProfile:
    """Тесты управления профилем"""
    
    def test_update_profile_username(self, client, test_user):
        """Обновление имени пользователя"""
        response = client.post("/update-profile", 
                              headers=test_user["headers"],
                              json={"username": "updateduser"})
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "updateduser"
    
    def test_update_profile_email(self, client, test_user):
        """Обновление email"""
        response = client.post("/update-profile",
                              headers=test_user["headers"],
                              json={"email": "newemail@example.com"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "newemail@example.com"
    
    def test_update_profile_duplicate_username(self, client, test_user, test_admin):
        """Обновление на существующий username"""
        # Пытаемся обновить на имя админа
        response = client.post("/update-profile",
                              headers=test_user["headers"],
                              json={"username": test_admin["user"]["username"]})
        assert response.status_code == 400
        assert "уже занято" in response.json()["detail"]
    
    def test_change_password_success(self, client, test_user):
        """Успешная смена пароля"""
        response = client.post("/change-password",
                              headers=test_user["headers"],
                              json={
                                  "old_password": "testpass123",
                                  "new_password": "newpass456",
                                  "confirm_password": "newpass456"
                              })
        assert response.status_code == 200
        assert response.json()["message"] == "Пароль успешно изменен"
        
        # Проверяем вход с новым паролем
        login_response = client.post("/login", json={
            "username": test_user["user"]["username"],
            "password": "newpass456"
        })
        assert login_response.status_code == 200
    
    def test_change_password_wrong_old(self, client, test_user):
        """Смена пароля с неверным старым паролем"""
        response = client.post("/change-password",
                              headers=test_user["headers"],
                              json={
                                  "old_password": "wrongpass",
                                  "new_password": "newpass456",
                                  "confirm_password": "newpass456"
                              })
        assert response.status_code == 400
        assert "Неверный старый пароль" in response.json()["detail"]
    
    def test_change_password_mismatch(self, client, test_user):
        """Смена пароля с несовпадающими новыми паролями"""
        response = client.post("/change-password",
                              headers=test_user["headers"],
                              json={
                                  "old_password": "testpass123",
                                  "new_password": "newpass456",
                                  "confirm_password": "different"
                              })
        assert response.status_code == 400
        assert "не совпадают" in response.json()["detail"]
    
    def test_delete_account(self, client, test_user):
        """Удаление аккаунта"""
        response = client.delete("/delete-account", headers=test_user["headers"])
        assert response.status_code == 200
        assert response.json()["message"] == "Аккаунт успешно удален"
        
        # После удаления вход невозможен
        login_response = client.post("/login", json={
            "username": test_user["user"]["username"],
            "password": "testpass123"
        })
        assert login_response.status_code == 401
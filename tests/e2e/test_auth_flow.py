import pytest
import requests


class TestAuthFlow:
    """E2E тесты авторизации"""
    
    def test_register_and_login(self, page, backend_url):
        """Полный цикл регистрации и входа"""
        # Переходим на страницу авторизации
        page.goto("http://localhost:3000/authorisation")
        
        # Переключаемся на регистрацию
        page.click("text=Регистрация")
        
        # Заполняем форму регистрации
        page.fill("input[name='username']", "e2e_newuser")
        page.fill("input[name='email']", "e2e_new@test.com")
        page.fill("input[name='password']", "testpass123")
        page.fill("input[name='confirmPassword']", "testpass123")
        
        # Отправляем форму
        page.click("button:has-text('Зарегистрироваться')")
        
        # Ждем редирект в личный кабинет
        page.wait_for_url("**/user", timeout=10000)
        assert page.url.endswith("/user")
        
        # Проверяем, что отображается имя пользователя
        assert page.text_content("text=Имя пользователя:") is not None
    
    def test_login_with_existing_user(self, page):
        """Вход существующего пользователя"""
        page.goto("http://localhost:3000/authorisation")
        
        # Заполняем форму входа
        page.fill("input[name='username']", "e2e_test_user")
        page.fill("input[name='password']", "testpass123")
        
        # Отправляем форму
        page.click("button:has-text('Войти')")
        
        # Ждем редирект
        page.wait_for_url("**/user", timeout=10000)
        assert page.url.endswith("/user")
    
    def test_logout(self, auth_page):
        """Выход из системы"""
        # Нажимаем кнопку выхода
        auth_page.click("button:has-text('Выйти')")
        
        # Проверяем, что попали на главную
        auth_page.wait_for_url("**/authorisation", timeout=10000)
        assert auth_page.url.endswith("/authorisation")
    
    def test_protected_route_redirects_to_login(self, page):
        """Защищенный маршрут перенаправляет на логин"""
        page.goto("http://localhost:3000/user")
        
        # Должны быть перенаправлены на страницу авторизации
        page.wait_for_url("**/authorisation", timeout=10000)
        assert page.url.endswith("/authorisation")
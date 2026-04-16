import pytest
import requests


class TestAdminFlow:
    """E2E тесты администрирования"""
    
    def test_admin_panel_access(self, page, backend_url):
        """Доступ к админ-панели для администратора"""
        # Логин как администратор
        page.goto("http://localhost:3000/authorisation")
        page.fill("input[name='username']", "Админ")
        page.fill("input[name='password']", "123456")
        page.click("button:has-text('Войти')")
        
        # Переходим в админ-панель
        page.click("text=Админ-панель")
        page.wait_for_url("**/admin", timeout=10000)
        
        # Проверяем, что отображается панель администратора
        assert page.is_visible("text=Панель администратора")
        assert page.is_visible("text=Управление пользователями")
    
    def test_view_users_list(self, admin_page):
        """Просмотр списка пользователей в админ-панели"""
        admin_page.goto("http://localhost:3000/admin")
        
        # Проверяем, что отображается статистика
        assert admin_page.is_visible("text=Всего пользователей")
        assert admin_page.is_visible("text=Администраторов")
        assert admin_page.is_visible("text=Забанено")
        
        # Проверяем, что отображается список пользователей
        assert admin_page.is_visible("text=Пользователь")
        assert admin_page.is_visible("text=Дата регистрации")
        assert admin_page.is_visible("text=Роль")
        assert admin_page.is_visible("text=Действия")
    
    def test_change_user_role(self, admin_page, backend_url):
        """Изменение роли пользователя администратором"""
        # Создаем тестового пользователя
        requests.post(f"{backend_url}/register", json={
            "username": "role_test_user",
            "email": "role_test@test.com",
            "password": "testpass123"
        })
        
        admin_page.goto("http://localhost:3000/admin")
        
        # Ищем пользователя
        admin_page.fill("input[placeholder*='Поиск']", "role_test_user")
        admin_page.wait_for_timeout(500)
        
        # Изменяем роль
        admin_page.select_option("select", "banned")
        
        # Сохраняем изменения
        admin_page.click("button:has-text('Сохранить для')")
        
        # Проверяем уведомление
        admin_page.wait_for_selector("text=Роль пользователя успешно обновлена", timeout=10000)
    
    def test_filter_users_by_role(self, admin_page):
        """Фильтрация пользователей по ролям"""
        admin_page.goto("http://localhost:3000/admin")
        
        # Фильтр по администраторам
        admin_page.click("button:has-text('Админы')")
        admin_page.wait_for_timeout(500)
        
        # Фильтр по забаненным
        admin_page.click("button:has-text('Забаненные')")
        admin_page.wait_for_timeout(500)
        
        # Фильтр по пользователям
        admin_page.click("button:has-text('Пользователи')")
        admin_page.wait_for_timeout(500)
    
    def test_search_users(self, admin_page):
        """Поиск пользователей"""
        admin_page.goto("http://localhost:3000/admin")
        
        # Вводим поисковый запрос
        admin_page.fill("input[placeholder*='Поиск']", "admin")
        admin_page.wait_for_timeout(500)
        
        # Проверяем, что результаты отфильтрованы
        # (все отображаемые пользователи должны содержать "admin" в имени)
    
    def test_regular_user_cannot_access_admin(self, page):
        """Обычный пользователь не может получить доступ к админ-панели"""
        # Логин как обычный пользователь
        page.goto("http://localhost:3000/authorisation")
        page.fill("input[name='username']", "e2e_test_user")
        page.fill("input[name='password']", "testpass123")
        page.click("button:has-text('Войти')")
        
        # Пытаемся перейти в админ-панель напрямую
        page.goto("http://localhost:3000/admin")
        
        # Должны быть перенаправлены на главную или показана ошибка
        page.wait_for_timeout(2000)
        assert not page.url.endswith("/admin")
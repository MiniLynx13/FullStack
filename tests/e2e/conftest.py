import pytest
import requests
from playwright.sync_api import sync_playwright


@pytest.fixture(scope="session")
def backend_url():
    """URL бэкенда для E2E тестов"""
    return "http://localhost:8000"


@pytest.fixture(scope="session")
def frontend_url():
    """URL фронтенда для E2E тестов"""
    return "http://localhost:3000"


@pytest.fixture(scope="session")
def playwright_instance():
    """Playwright экземпляр"""
    with sync_playwright() as p:
        yield p


@pytest.fixture(scope="session")
def browser(playwright_instance):
    """Браузер для E2E тестов"""
    browser = playwright_instance.chromium.launch(headless=True)
    yield browser
    browser.close()


@pytest.fixture
def page(browser, frontend_url):
    """Страница для тестов"""
    context = browser.new_context()
    page = context.new_page()
    page.goto(frontend_url)
    yield page
    context.close()


@pytest.fixture
def auth_page(page, backend_url):
    """Страница с авторизованной сессией"""
    # Логин через API
    response = requests.post(f"{backend_url}/login", json={
        "username": "e2e_test_user",
        "password": "testpass123"
    })
    
    if response.status_code == 200:
        data = response.json()
        # Сохраняем токены в localStorage
        page.goto("http://localhost:3000")
        page.evaluate(f"""
            localStorage.setItem('auth_token', '{data['access_token']}');
            localStorage.setItem('refresh_token', '{data['refresh_token']}');
        """)
        page.reload()
        return page
    
    # Если пользователь не существует, создаем
    requests.post(f"{backend_url}/register", json={
        "username": "e2e_test_user",
        "email": "e2e@test.com",
        "password": "testpass123"
    })
    
    response = requests.post(f"{backend_url}/login", json={
        "username": "e2e_test_user",
        "password": "testpass123"
    })
    data = response.json()
    page.evaluate(f"""
        localStorage.setItem('auth_token', '{data['access_token']}');
        localStorage.setItem('refresh_token', '{data['refresh_token']}');
    """)
    page.reload()
    return page

@pytest.fixture
def admin_page(page, backend_url):
    """Страница с авторизованным администратором"""
    # Логинимся как администратор
    page.goto("http://localhost:3000/authorisation")
    page.fill("input[name='username']", "Админ")
    page.fill("input[name='password']", "123456")
    page.click("button:has-text('Войти')")
    page.wait_for_url("**/user", timeout=10000)
    return page
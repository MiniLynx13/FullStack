import pytest
import os


class TestAnalysisFlow:
    """E2E тесты анализа изображений"""
    
    def test_upload_and_analyze_image(self, auth_page):
        """Загрузка и анализ изображения"""
        # Переходим на страницу анализа
        auth_page.click("text=Аллергены по фото")
        auth_page.wait_for_url("**/photo", timeout=10000)
        
        # Загружаем тестовое изображение
        test_image_path = os.path.join(os.path.dirname(__file__), "fixtures", "test_food.jpg")
        if os.path.exists(test_image_path):
            auth_page.set_input_files("input[type='file']", test_image_path)
            
            # Нажимаем кнопку анализа
            auth_page.click("button:has-text('Анализировать изображение')")
            
            # Ждем результатов
            auth_page.wait_for_selector("text=Результаты анализа", timeout=30000)
            
            # Проверяем, что результаты отображаются
            assert auth_page.is_visible("text=Ингредиенты:")
    
    def test_save_analysis_to_history(self, auth_page):
        """Сохранение анализа в историю"""
        # Переходим на страницу анализа
        auth_page.goto("http://localhost:3000/photo")
        
        # Загружаем изображение
        test_image_path = os.path.join(os.path.dirname(__file__), "fixtures", "test_food.jpg")
        if os.path.exists(test_image_path):
            auth_page.set_input_files("input[type='file']", test_image_path)
            auth_page.click("button:has-text('Анализировать изображение')")
            
            # Ждем результаты
            auth_page.wait_for_selector("text=Результаты анализа", timeout=30000)
            
            # Сохраняем анализ
            auth_page.click("button:has-text('Сохранить результат')")
            
            # Проверяем уведомление об успехе
            auth_page.wait_for_selector("text=Анализ успешно сохранен", timeout=10000)
    
    def test_view_analysis_history(self, auth_page):
        """Просмотр истории анализов"""
        auth_page.goto("http://localhost:3000/photo")
        
        # Проверяем, что блок истории отображается
        assert auth_page.is_visible("text=История анализов")
        
        # Если есть анализы, проверяем навигацию
        if auth_page.is_visible("text=Анализ 1 из"):
            # Проверяем стрелки навигации
            assert auth_page.is_visible("button[aria-label='Предыдущий анализ']")
            assert auth_page.is_visible("button[aria-label='Следующий анализ']")
    
    def test_filter_analyses_by_safety(self, auth_page):
        """Фильтрация анализов по безопасности"""
        auth_page.goto("http://localhost:3000/photo")
        
        # Нажимаем фильтр "Безопасные"
        auth_page.click("button:has-text('Безопасные')")
        
        # Проверяем, что фильтр активен
        assert auth_page.get_attribute("button:has-text('Безопасные')", "aria-pressed") == "true"
        
        # Нажимаем фильтр "С предупреждениями"
        auth_page.click("button:has-text('С предупреждениями')")
    
    def test_delete_analysis(self, auth_page):
        """Удаление анализа из истории"""
        auth_page.goto("http://localhost:3000/photo")
        
        # Если есть анализы, удаляем первый
        if auth_page.is_visible("button:has-text('Удалить')"):
            # Нажимаем кнопку удаления
            auth_page.click("button:has-text('Удалить')")
            
            # Подтверждаем удаление в модальном окне
            auth_page.click("button:has-text('Удалить')")
            
            # Проверяем уведомление
            auth_page.wait_for_selector("text=Анализ успешно удален", timeout=10000)
    
    def test_reanalyze_saved_analysis(self, auth_page):
        """Перепроверка сохраненного анализа"""
        auth_page.goto("http://localhost:3000/photo")
        
        # Если есть анализы, нажимаем перепроверку
        if auth_page.is_visible("button:has-text('Перепроверить')"):
            auth_page.click("button:has-text('Перепроверить')")
            
            # Ждем уведомление
            auth_page.wait_for_selector("text=Анализ успешно перепроверен", timeout=15000)
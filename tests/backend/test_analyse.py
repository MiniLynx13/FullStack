import pytest
import io
from unittest.mock import patch

class TestAnalyse:
    """Тесты анализа изображений"""
    
    def test_analyze_image_unauthorized(self, client):
        """Анализ без авторизации"""
        fake_image = io.BytesIO(b"fake image data")
        response = client.post("/analyze-image",
                              files={"image": ("test.jpg", fake_image, "image/jpeg")})
        assert response.status_code == 401
    
    def test_analyze_image_success(self, client, test_user, mock_ollama):
        """Успешный анализ изображения"""
        # Создаем реальное PNG изображение 1x1 пиксель
        import base64
        # 1x1 red pixel PNG
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
        fake_image = io.BytesIO(png_data)
        
        response = client.post(
            "/analyze-image",
            headers=test_user["headers"],
            files={"image": ("test.png", fake_image, "image/png")}
        )
        
        # Проверяем результат
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        data = response.json()
        assert "ingredients" in data
        assert "warnings" in data
    
    def test_analyze_image_invalid_format(self, client, test_user):
        """Анализ с неверным форматом файла"""
        fake_file = io.BytesIO(b"not an image")
        response = client.post("/analyze-image",
                              headers=test_user["headers"],
                              files={"image": ("test.txt", fake_file, "text/plain")})
        
        assert response.status_code == 400
        assert "Неподдерживаемый тип файла" in response.json()["detail"]
    
    def test_save_analysis(self, client, test_user):
        """Сохранение анализа"""
        # Создаем реальное PNG изображение
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
        fake_image = io.BytesIO(png_data)
        
        response = client.post("/save-analysis",
                              headers=test_user["headers"],
                              files={"image": ("test.png", fake_image, "image/png")},
                              data={
                                  "analysis_result": '{"ingredients": ["test1", "test2"], "warnings": []}',
                                  "ingredients_count": "2",
                                  "warnings_count": "0"
                              })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        data = response.json()
        assert data["ingredients_count"] == 2
        assert data["warnings_count"] == 0
        assert "id" in data
    
    def test_get_saved_analyses(self, client, test_user):
        """Получение сохраненных анализов"""
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
        fake_image = io.BytesIO(png_data)
        
        # Сначала сохраняем анализ
        client.post("/save-analysis",
                   headers=test_user["headers"],
                   files={"image": ("test.png", fake_image, "image/png")},
                   data={
                       "analysis_result": '{"ingredients": ["test"], "warnings": []}',
                       "ingredients_count": "1",
                       "warnings_count": "0"
                   })
        
        response = client.get("/saved-analyses", headers=test_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert "analyses" in data
        assert len(data["analyses"]) >= 1
    
    def test_filter_analyses_safe_only(self, client, test_user):
        """Фильтрация анализов - только безопасные"""
        response = client.get("/filter/saved-analyses?show_safe=true&show_warnings=false",
                             headers=test_user["headers"])
        assert response.status_code == 200
    
    def test_filter_analyses_warnings_only(self, client, test_user):
        """Фильтрация анализов - только с предупреждениями"""
        response = client.get("/filter/saved-analyses?show_safe=false&show_warnings=true",
                             headers=test_user["headers"])
        assert response.status_code == 200
    
    def test_delete_analysis(self, client, test_user):
        """Удаление анализа"""
        import base64
        png_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
        fake_image = io.BytesIO(png_data)
        
        # Сохраняем анализ
        save_response = client.post("/save-analysis",
                                   headers=test_user["headers"],
                                   files={"image": ("test.png", fake_image, "image/png")},
                                   data={
                                       "analysis_result": '{"ingredients": ["test"], "warnings": []}',
                                       "ingredients_count": "1",
                                       "warnings_count": "0"
                                   })
        assert save_response.status_code == 200
        analysis_id = save_response.json()["id"]
        
        # Удаляем
        response = client.delete(f"/saved-analyses/{analysis_id}",
                                headers=test_user["headers"])
        assert response.status_code == 200
        assert response.json()["message"] == "Анализ успешно удален"
import pytest


class TestMedicalData:
    """Тесты медицинских данных"""
    
    def test_get_medical_data_empty(self, client, test_user):
        """Получение медицинских данных (пустых)"""
        response = client.get("/medical-data", headers=test_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == test_user["user"]["id"]
        assert data["contraindications"] is None
        assert data["allergens"] is None
    
    def test_save_medical_data(self, client, test_user):
        """Сохранение медицинских данных"""
        response = client.post("/medical-data",
                              headers=test_user["headers"],
                              json={
                                  "contraindications": "diabetes hypertension",
                                  "allergens": "peanuts shellfish"
                              })
        assert response.status_code == 200
        data = response.json()
        assert data["contraindications"] == "diabetes hypertension"
        assert data["allergens"] == "peanuts shellfish"
    
    def test_get_medical_data_after_save(self, client, test_user):
        """Получение сохраненных медицинских данных"""
        # Сначала сохраняем
        client.post("/medical-data",
                   headers=test_user["headers"],
                   json={
                       "contraindications": "diabetes",
                       "allergens": "milk eggs"
                   })
        
        # Затем получаем
        response = client.get("/medical-data", headers=test_user["headers"])
        assert response.status_code == 200
        data = response.json()
        assert data["contraindications"] == "diabetes"
        assert data["allergens"] == "milk eggs"
    
    def test_update_medical_data(self, client, test_user):
        """Обновление медицинских данных"""
        # Первое сохранение
        client.post("/medical-data",
                   headers=test_user["headers"],
                   json={"contraindications": "old", "allergens": "old"})
        
        # Обновление
        response = client.post("/medical-data",
                              headers=test_user["headers"],
                              json={"contraindications": "new", "allergens": "new"})
        assert response.status_code == 200
        data = response.json()
        assert data["contraindications"] == "new"
        assert data["allergens"] == "new"
import pytest


class TestAdmin:
    """Тесты административной панели"""
    
    def test_admin_access_denied_for_user(self, client, test_user):
        """Обычный пользователь не имеет доступа к админ-панели"""
        response = client.get("/admin/users", headers=test_user["headers"])
        assert response.status_code == 403
    
    def test_admin_get_users(self, client, test_admin):
        """Администратор получает список пользователей"""
        response = client.get("/admin/users", headers=test_admin["headers"])
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert len(data["users"]) >= 1
    
    def test_admin_update_user_role(self, client, test_admin, test_user):
        """Администратор изменяет роль пользователя"""
        user_id = test_user["user"]["id"]
        response = client.post("/admin/update-user-role",
                              headers=test_admin["headers"],
                              json={
                                  "user_id": user_id,
                                  "new_role": "banned"
                              })
        assert response.status_code == 200
        assert response.json()["new_role"] == "banned"
    
    def test_admin_cannot_change_own_role(self, client, test_admin):
        """Администратор не может изменить свою роль"""
        admin_id = test_admin["user"]["id"]
        response = client.post("/admin/update-user-role",
                              headers=test_admin["headers"],
                              json={
                                  "user_id": admin_id,
                                  "new_role": "user"
                              })
        assert response.status_code == 400
        assert "Нельзя изменить собственную роль" in response.json()["detail"]
    
    def test_admin_delete_user(self, client, test_admin, test_user):
        """Администратор удаляет пользователя"""
        user_id = test_user["user"]["id"]
        response = client.delete(f"/admin/users/{user_id}", 
                                headers=test_admin["headers"])
        assert response.status_code == 200
        assert "успешно удален" in response.json()["message"]
    
    def test_admin_cannot_delete_self(self, client, test_admin):
        """Администратор не может удалить себя"""
        admin_id = test_admin["user"]["id"]
        response = client.delete(f"/admin/users/{admin_id}",
                                headers=test_admin["headers"])
        assert response.status_code == 400
        assert "Нельзя удалить собственный аккаунт" in response.json()["detail"]
    
    def test_filter_users_by_role(self, client, test_admin):
        """Фильтрация пользователей по роли"""
        response = client.get("/admin/filter/users?roles=admin",
                             headers=test_admin["headers"])
        assert response.status_code == 200
        data = response.json()
        for user in data["users"]:
            assert user["role"] == "admin"
    
    def test_search_users(self, client, test_admin):
        """Поиск пользователей по имени"""
        response = client.get("/admin/filter/users?search=admin",
                             headers=test_admin["headers"])
        assert response.status_code == 200
        data = response.json()
        assert len(data["users"]) >= 1
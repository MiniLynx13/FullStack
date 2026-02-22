from fastapi import APIRouter, Depends, HTTPException, status
from ..models import UpdateUserRole, UserRole
from ..db import get_db_connection
from ..dependencies import require_admin
from ..minio import delete_image_from_minio

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users")
async def get_all_users(admin = Depends(require_admin)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('''
        SELECT id, username, email, role, created_at 
        FROM users 
        ORDER BY created_at DESC
    ''')
    
    users = cur.fetchall()
    conn.close()
    
    return {
        "users": [
            {
                "id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role'],
                "created_at": user['created_at']
            }
            for user in users
        ]
    }

@router.post("/update-user-role")
async def update_user_role(
    role_data: UpdateUserRole,
    admin = Depends(require_admin)
):
    # Запрещаем админу менять свою собственную роль
    if role_data.user_id == admin['id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя изменить собственную роль"
        )
    
    # Проверяем валидность новой роли
    if role_data.new_role not in [role.value for role in UserRole]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Недопустимая роль. Допустимые роли: {', '.join([role.value for role in UserRole])}"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем существование пользователя
    cur.execute('SELECT id, username FROM users WHERE id = ?', (role_data.user_id,))
    target_user = cur.fetchone()
    
    if not target_user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Обновляем роль
    cur.execute(
        'UPDATE users SET role = ? WHERE id = ?',
        (role_data.new_role, role_data.user_id)
    )
    
    conn.commit()
    conn.close()
    
    return {
        "message": f"Роль пользователя {target_user['username']} изменена на {role_data.new_role}",
        "user_id": role_data.user_id,
        "new_role": role_data.new_role
    }

@router.delete("/users/{user_id}")
async def delete_user_by_admin(
    user_id: int,
    admin = Depends(require_admin)
):
    # Запрещаем админу удалять самого себя
    if user_id == admin['id']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нельзя удалить собственный аккаунт"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем существование пользователя
    cur.execute('SELECT username FROM users WHERE id = ?', (user_id,))
    target_user = cur.fetchone()
    
    if not target_user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    # Удаляем изображения пользователя из Minio
    cur.execute('SELECT image_path FROM saved_analyses WHERE user_id = ?', (user_id,))
    saved_images = cur.fetchall()
    
    for img in saved_images:
        delete_image_from_minio(img['image_path'])
    
    # Удаляем все данные пользователя
    cur.execute('DELETE FROM saved_analyses WHERE user_id = ?', (user_id,))
    cur.execute('DELETE FROM user_medical_data WHERE user_id = ?', (user_id,))
    cur.execute('DELETE FROM user_tokens WHERE user_id = ?', (user_id,))
    cur.execute('DELETE FROM users WHERE id = ?', (user_id,))
    
    conn.commit()
    conn.close()
    
    return {"message": f"Пользователь {target_user['username']} успешно удален"}
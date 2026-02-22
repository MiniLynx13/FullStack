from fastapi import APIRouter, Depends, HTTPException, status
from ..models import UpdateProfileData, ChangePasswordData
from ..db import get_db_connection
from ..funcs import hash_password, get_user_by_token
from ..dependencies import require_not_banned

router = APIRouter(prefix="", tags=["user"])

@router.post("/update-profile")
async def update_profile(
    profile_data: UpdateProfileData,
    user = Depends(require_not_banned)
):  
    # Проверяем, что есть хотя бы одно поле для обновления
    if profile_data.username is None and profile_data.email is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Не указаны данные для обновления"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Проверяем, что новые username и email не заняты другими пользователями
        if profile_data.username is not None and profile_data.username.strip():
            username = profile_data.username.strip()
            cur.execute('SELECT id FROM users WHERE username = ? AND id != ?',
                       (username, user['id']))
            if cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Имя пользователя уже занято"
                )
        
        if profile_data.email is not None and profile_data.email.strip():
            email = profile_data.email.strip()
            cur.execute('SELECT id FROM users WHERE email = ? AND id != ?',
                       (email, user['id']))
            if cur.fetchone():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email уже занят"
                )
        
        # Собираем поля для обновления
        update_fields = []
        update_values = []
        
        if profile_data.username is not None and profile_data.username.strip():
            update_fields.append('username = ?')
            update_values.append(profile_data.username.strip())
        
        if profile_data.email is not None and profile_data.email.strip():
            update_fields.append('email = ?')
            update_values.append(profile_data.email.strip())
        
        # Если после очистки полей нечего обновлять
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не указаны валидные данные для обновления"
            )
        
        update_values.append(user['id'])
        
        # Обновляем данные пользователя
        update_query = f'UPDATE users SET {", ".join(update_fields)} WHERE id = ?'
        cur.execute(update_query, update_values)
        
        # Получаем обновленные данные пользователя
        cur.execute(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            (user['id'],)
        )
        
        updated_user = cur.fetchone()
        conn.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении профиля: {str(e)}"
        )
    finally:
        conn.close()
    
    return {
        "id": updated_user['id'],
        "username": updated_user['username'],
        "email": updated_user['email'],
        "created_at": updated_user['created_at']
    }

@router.post("/change-password")
async def change_password(
    password_data: ChangePasswordData,
    user = Depends(require_not_banned)
):
    # Проверяем совпадение паролей
    if password_data.new_password != password_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новые пароли не совпадают"
        )
    
    # Проверяем длину нового пароля
    if len(password_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Новый пароль должен содержать минимум 6 символов"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем старый пароль
    old_password_hash = hash_password(password_data.old_password)
    cur.execute(
        'SELECT id FROM users WHERE id = ? AND password_hash = ?',
        (user['id'], old_password_hash)
    )
    
    if not cur.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неверный старый пароль"
        )
    
    # Обновляем пароль
    new_password_hash = hash_password(password_data.new_password)
    cur.execute(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        (new_password_hash, user['id'])
    )
    
    conn.commit()
    conn.close()
    
    return {"message": "Пароль успешно изменен"}

@router.delete("/delete-account")
async def delete_account(user = Depends(require_not_banned)):
    from ..minio import delete_image_from_minio
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    user_id = user['id']
    
    try:
        cur.execute('SELECT image_path FROM saved_analyses WHERE user_id = ?', (user_id,))
        saved_images = cur.fetchall()
        
        for img in saved_images:
            delete_image_from_minio(img['image_path'])
        
        cur.execute('DELETE FROM saved_analyses WHERE user_id = ?', (user_id,))
        cur.execute('DELETE FROM user_medical_data WHERE user_id = ?', (user_id,))
        cur.execute('DELETE FROM user_tokens WHERE user_id = ?', (user_id,))
        cur.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        conn.commit()
        print(f"Аккаунт пользователя {user_id} удален со всеми связанными данными")
        
    except Exception as e:
        conn.rollback()
        conn.close()
        print(f"Ошибка при удалении аккаунта: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении аккаунта: {str(e)}"
        )
    
    conn.close()
    return {"message": "Аккаунт успешно удален"}
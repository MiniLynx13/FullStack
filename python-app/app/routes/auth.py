from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from ..models import UserRegister, UserLogin, UserResponse
from ..db import get_db_connection
from ..funcs import hash_password, generate_token_pair_with_conn, get_user_by_token
from ..dependencies import require_auth

router = APIRouter(prefix="", tags=["auth"])
security = HTTPBearer()

@router.post("/register")
async def register(user_data: UserRegister):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем, существует ли пользователь
    cur.execute('SELECT id FROM users WHERE username = ? OR email = ?', 
                (user_data.username, user_data.email))
    existing_user = cur.fetchone()
    
    if existing_user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем или email уже существует"
        )
    
    # Хешируем пароль и создаем пользователя
    password_hash = hash_password(user_data.password)
    
    cur.execute(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        (user_data.username, user_data.email, password_hash)
    )
    
    user_id = cur.lastrowid
    
    cur.execute(
        'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
        (user_id,)
    )
    
    new_user = cur.fetchone()
    conn.commit()
    conn.close()
    
    return {
        "message": "Пользователь успешно зарегистрирован", 
        "user": {
            "id": new_user['id'],
            "username": new_user['username'],
            "email": new_user['email'],
            "role": new_user['role'],
            "created_at": new_user['created_at']
        }
    }

@router.post("/login")
async def login(login_data: UserLogin):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Ищем пользователя
    password_hash = hash_password(login_data.password)
    cur.execute(
        'SELECT id, username, email, role, created_at FROM users WHERE username = ? AND password_hash = ?',
        (login_data.username, password_hash)
    )
    
    user = cur.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль"
        )
    
    # Удаляем старые токены пользователя
    cur.execute('DELETE FROM user_tokens WHERE user_id = ?', (user['id'],))
    
    # Генерируем пару токенов
    token_pair = generate_token_pair_with_conn(conn, user['id'])
    
    conn.commit()
    conn.close()
    
    return {
        "access_token": token_pair['access_token'],
        "refresh_token": token_pair['refresh_token'],
        "token_type": token_pair['token_type'],
        "user": {
            "id": user['id'],
            "username": user['username'],
            "email": user['email'],
            "role": user['role'],
            "created_at": user['created_at']
        }
    }

@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    user = Depends(require_auth)
):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Удаляем все токены пользователя
    cur.execute('DELETE FROM user_tokens WHERE user_id = ?', (user['id'],))
    conn.commit()
    conn.close()
    
    return {"message": "Успешный выход из системы"}

@router.get("/me")
async def get_current_user(user = Depends(require_auth)):
    return UserResponse(
        id=user['id'],
        username=user['username'],
        email=user['email'],
        role=user['role'],
        created_at=user['created_at']
    )
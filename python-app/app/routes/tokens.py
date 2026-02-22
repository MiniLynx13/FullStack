from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from datetime import datetime
from ..db import get_db_connection, cleanup_expired_tokens
from ..funcs import generate_token_pair_with_conn

router = APIRouter(prefix="", tags=["tokens"])
security = HTTPBearer()

@router.post("/refresh-token")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Обновляет пару токенов по refresh токену"""
    refresh_token = credentials.credentials
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем refresh токен
    cur.execute('''
        SELECT u.id, u.username, u.email, u.created_at 
        FROM users u 
        JOIN user_tokens ut ON u.id = ut.user_id 
        WHERE ut.token = ? AND ut.expires_at > ? AND ut.token_type = ?
    ''', (refresh_token, datetime.now().isoformat(), 'refresh'))
    
    user = cur.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный или просроченный refresh токен"
        )
    
    # Удаляем только использованный refresh токен
    cur.execute('DELETE FROM user_tokens WHERE token = ?', (refresh_token,))
    
    # Генерируем новую пару токенов
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
            "created_at": user['created_at']
        }
    }

@router.post("/cleanup-tokens")
async def cleanup_tokens():
    """Принудительная очистка просроченных токенов"""
    cleaned_count = cleanup_expired_tokens()
    return {"message": f"Удалено {cleaned_count} просроченных токенов"}
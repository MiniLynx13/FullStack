import hashlib
import secrets
from datetime import datetime, timedelta
from .db import get_db_connection
from .config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS

def hash_password(password: str) -> str:
    """Хеширование пароля"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    """Генерация токена"""
    return secrets.token_hex(32)

def generate_token_pair_with_conn(conn, user_id: int):
    """Генерация пары токенов с использованием существующего соединения"""
    cur = conn.cursor()
    
    access_token = generate_token()
    refresh_token = generate_token()
    
    access_expires_at = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_expires_at = datetime.now() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Сохраняем оба токена
    cur.execute(
        'INSERT INTO user_tokens (user_id, token, expires_at, token_type) VALUES (?, ?, ?, ?)',
        (user_id, access_token, access_expires_at.isoformat(), 'access')
    )
    cur.execute(
        'INSERT INTO user_tokens (user_id, token, expires_at, token_type) VALUES (?, ?, ?, ?)',
        (user_id, refresh_token, refresh_expires_at.isoformat(), 'refresh')
    )
    
    return {
        'access_token': access_token,
        'refresh_token': refresh_token,
        'token_type': 'bearer'
    }

def get_user_by_token(token: str, token_type: str = 'access'):
    """Получение пользователя по токену"""
    from .db import get_db_connection, cleanup_expired_tokens
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Очищаем просроченные токены в этом же соединении
    cur.execute('DELETE FROM user_tokens WHERE expires_at <= ?', 
                (datetime.now().isoformat(),))
    
    deleted_count = cur.rowcount
    if deleted_count > 0:
        print(f"Удалено {deleted_count} просроченных токенов")
    
    # Проверяем токен
    cur.execute('''
        SELECT u.id, u.username, u.email, u.role, u.created_at 
        FROM users u 
        JOIN user_tokens ut ON u.id = ut.user_id 
        WHERE ut.token = ? AND ut.expires_at > ? AND ut.token_type = ?
    ''', (token, datetime.now().isoformat(), token_type))
    
    user = cur.fetchone()
    conn.commit()
    conn.close()
    
    return user

def parse_medical_text(text: str) -> list:
    """Парсит текст медицинских данных в список"""
    import re
    if not text:
        return []
    return [item.strip().lower() for item in re.split(r'[,;.\s\n]+', text) if item.strip()]
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .funcs import get_user_by_token

security = HTTPBearer()

def require_auth(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Проверяет, что пользователь авторизован"""
    user = get_user_by_token(credentials.credentials, 'access')
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация"
        )
    
    return user

def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Проверяет, что пользователь является администратором"""
    user = get_user_by_token(credentials.credentials, 'access')
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация"
        )
    
    if user['role'] != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Доступ запрещен. Требуются права администратора"
        )
    
    return user

def require_not_banned(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Проверяет, что пользователь не забанен"""
    user = get_user_by_token(credentials.credentials, 'access')
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Требуется авторизация"
        )
    
    if user['role'] == 'banned':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ваш аккаунт заблокирован. Обратитесь к администратору"
        )
    
    return user
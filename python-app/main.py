import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib
import secrets
from datetime import datetime, timedelta
import os
from typing import Optional

app = FastAPI()

# Настройки CORS
origins = [
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Подключение к базе данных
def get_db_connection():
    return psycopg2.connect(
        host="localhost",
        database="users",
        user="admin",
        password="MiniLynx8",
        cursor_factory=RealDictCursor
    )

# Модели Pydantic
class Response(BaseModel):
    phrase: str

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Инициализация базы данных
def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Создание таблицы пользователей
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы токенов
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            token VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )
    ''')
    
    conn.commit()
    cur.close()
    conn.close()

# Хеширование пароля
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Генерация токена
def generate_token() -> str:
    return secrets.token_hex(32)

# Получение пользователя по токену
def get_user_by_token(token: str):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('''
        SELECT u.id, u.username, u.email, u.created_at 
        FROM users u 
        JOIN user_tokens ut ON u.id = ut.user_id 
        WHERE ut.token = %s AND ut.expires_at > %s
    ''', (token, datetime.now()))
    
    user = cur.fetchone()
    cur.close()
    conn.close()
    
    return user

@app.on_event("startup")
async def startup_event():
    init_db()

# Регистрация пользователя
@app.post("/register")
async def register(user_data: UserRegister):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем, существует ли пользователь
    cur.execute('SELECT id FROM users WHERE username = %s OR email = %s', 
                (user_data.username, user_data.email))
    existing_user = cur.fetchone()
    
    if existing_user:
        cur.close()
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким именем или email уже существует"
        )
    
    # Хешируем пароль и создаем пользователя
    password_hash = hash_password(user_data.password)
    
    cur.execute(
        'INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s) RETURNING id, username, email, created_at',
        (user_data.username, user_data.email, password_hash)
    )
    
    new_user = cur.fetchone()
    conn.commit()
    cur.close()
    conn.close()
    
    return {"message": "Пользователь успешно зарегистрирован", "user": new_user}

# Авторизация пользователя
@app.post("/login")
async def login(login_data: UserLogin):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Ищем пользователя
    password_hash = hash_password(login_data.password)
    cur.execute(
        'SELECT id, username, email, created_at FROM users WHERE username = %s AND password_hash = %s',
        (login_data.username, password_hash)
    )
    
    user = cur.fetchone()
    
    if not user:
        cur.close()
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль"
        )
    
    # Генерируем токен
    token = generate_token()
    expires_at = datetime.now() + timedelta(days=7)
    
    # Сохраняем токен в базе
    cur.execute(
        'INSERT INTO user_tokens (user_id, token, expires_at) VALUES (%s, %s, %s)',
        (user['id'], token, expires_at)
    )
    
    conn.commit()
    cur.close()
    conn.close()
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user['id'],
            username=user['username'],
            email=user['email'],
            created_at=user['created_at'].isoformat()
        )
    )

# Получение информации о текущем пользователе
@app.get("/me")
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
    return UserResponse(
        id=user['id'],
        username=user['username'],
        email=user['email'],
        created_at=user['created_at'].isoformat()
    )

# Выход из системы
@app.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM user_tokens WHERE token = %s', (credentials.credentials,))
    conn.commit()
    cur.close()
    conn.close()
    
    return {"message": "Успешный выход из системы"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
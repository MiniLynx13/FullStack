import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import sqlite3
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

# Подключение к SQLite базе данных
def get_db_connection():
    conn = sqlite3.connect('app.db')
    conn.row_factory = sqlite3.Row  # Чтобы получать результаты как словари
    return conn

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

class MedicalData(BaseModel):
    contraindications: Optional[str] = None
    allergens: Optional[str] = None

class MedicalDataResponse(BaseModel):
    user_id: int
    contraindications: Optional[str] = None
    allergens: Optional[str] = None
    updated_at: str

# Инициализация базы данных
def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Создание таблицы пользователей
    cur.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Создание таблицы токенов
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            token VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL
        )
    ''')
    
    # Создание таблицы медицинских данных
    cur.execute('''
        CREATE TABLE IF NOT EXISTS user_medical_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE REFERENCES users(id),
            contraindications TEXT,
            allergens TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
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
        WHERE ut.token = ? AND ut.expires_at > ?
    ''', (token, datetime.now().isoformat()))
    
    user = cur.fetchone()
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
        'SELECT id, username, email, created_at FROM users WHERE id = ?',
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
            "created_at": new_user['created_at']
        }
    }

# Авторизация пользователя
@app.post("/login")
async def login(login_data: UserLogin):
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Ищем пользователя
    password_hash = hash_password(login_data.password)
    cur.execute(
        'SELECT id, username, email, created_at FROM users WHERE username = ? AND password_hash = ?',
        (login_data.username, password_hash)
    )
    
    user = cur.fetchone()
    
    if not user:
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
        'INSERT INTO user_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        (user['id'], token, expires_at.isoformat())
    )
    
    conn.commit()
    conn.close()
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user['id'],
            username=user['username'],
            email=user['email'],
            created_at=user['created_at']
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
        created_at=user['created_at']
    )

# Получение медицинских данных пользователя
@app.get("/medical-data")
async def get_medical_data(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute(
        'SELECT user_id, contraindications, allergens, updated_at FROM user_medical_data WHERE user_id = ?',
        (user['id'],)
    )
    
    medical_data = cur.fetchone()
    conn.close()
    
    if medical_data:
        return MedicalDataResponse(
            user_id=medical_data['user_id'],
            contraindications=medical_data['contraindications'],
            allergens=medical_data['allergens'],
            updated_at=medical_data['updated_at']
        )
    else:
        return MedicalDataResponse(
            user_id=user['id'],
            contraindications=None,
            allergens=None,
            updated_at=datetime.now().isoformat()
        )

# Сохранение медицинских данных пользователя
@app.post("/medical-data")
async def save_medical_data(
    medical_data: MedicalData,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Проверяем, существует ли запись для пользователя
    cur.execute(
        'SELECT id FROM user_medical_data WHERE user_id = ?',
        (user['id'],)
    )
    
    existing_data = cur.fetchone()
    
    if existing_data:
        # Обновляем существующую запись
        cur.execute(
            '''UPDATE user_medical_data 
               SET contraindications = ?, allergens = ?, updated_at = CURRENT_TIMESTAMP 
               WHERE user_id = ?''',
            (medical_data.contraindications, medical_data.allergens, user['id'])
        )
    else:
        # Создаем новую запись
        cur.execute(
            '''INSERT INTO user_medical_data (user_id, contraindications, allergens) 
               VALUES (?, ?, ?)''',
            (user['id'], medical_data.contraindications, medical_data.allergens)
        )
    
    conn.commit()
    
    # Получаем обновленные данные
    cur.execute(
        'SELECT user_id, contraindications, allergens, updated_at FROM user_medical_data WHERE user_id = ?',
        (user['id'],)
    )
    
    updated_data = cur.fetchone()
    conn.close()
    
    return MedicalDataResponse(
        user_id=updated_data['user_id'],
        contraindications=updated_data['contraindications'],
        allergens=updated_data['allergens'],
        updated_at=updated_data['updated_at']
    )

# Выход из системы
@app.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM user_tokens WHERE token = ?', (credentials.credentials,))
    conn.commit()
    conn.close()
    
    return {"message": "Успешный выход из системы"}

@app.get("/")
async def root():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
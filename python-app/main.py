import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import base64
from PIL import Image
import ollama
import json
import traceback
import re
import io
from minio import Minio
from minio.error import S3Error
import uuid
import asyncio

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

# Настройки Minio
MINIO_ENDPOINT = "localhost:9000"
MINIO_ACCESS_KEY = "grant_access"
MINIO_SECRET_KEY = "ai_food_analysing"
MINIO_BUCKET_NAME = "ingredients"

# Инициализация клиента Minio
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

# Создание bucket если не существует
def create_bucket_if_not_exists():
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET_NAME):
            minio_client.make_bucket(MINIO_BUCKET_NAME)
            print(f"Bucket '{MINIO_BUCKET_NAME}' создан")
    except Exception as e:
        print(f"Ошибка при создании bucket: {e}")

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

class UpdateProfileData(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None

class ChangePasswordData(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str

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

class SaveAnalysisRequest(BaseModel):
    analysis_result: Dict[str, Any]
    ingredients_count: int
    warnings_count: int

class SavedAnalysis(BaseModel):
    id: int
    user_id: int
    image_path: str
    analysis_result: Dict[str, Any]
    created_at: str
    ingredients_count: int
    warnings_count: int
    ref_count: int = 1
    original_analysis_id: Optional[int] = None
    is_reanalysis: Optional[bool] = False

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
    
    # Создание таблицы сохраненных анализов
    cur.execute('''
        CREATE TABLE IF NOT EXISTS saved_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER REFERENCES users(id),
            image_path TEXT NOT NULL,
            analysis_result TEXT NOT NULL,
            ingredients_count INTEGER DEFAULT 0,
            warnings_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    ''')

    cur.execute('CREATE INDEX IF NOT EXISTS idx_original_analysis ON saved_analyses(original_analysis_id)')
    
    conn.commit()
    conn.close()

# Очистка просроченных токенов
def cleanup_expired_tokens():
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('DELETE FROM user_tokens WHERE expires_at <= ?', 
                (datetime.now().isoformat(),))
    
    deleted_count = cur.rowcount
    conn.commit()
    conn.close()
    
    if deleted_count > 0:
        print(f"Удалено {deleted_count} просроченных токенов")
    
    return deleted_count

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
    
    # Сначала очищаем просроченные токены
    cleanup_expired_tokens()
    
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
    create_bucket_if_not_exists()
    # Очищаем просроченные токены при запуске приложения
    cleaned_count = cleanup_expired_tokens()
    print(f"При запуске удалено {cleaned_count} просроченных токенов")

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

# Обновление профиля пользователя
@app.post("/update-profile")
async def update_profile(
    profile_data: UpdateProfileData,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
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
    
    return UserResponse(
        id=updated_user['id'],
        username=updated_user['username'],
        email=updated_user['email'],
        created_at=updated_user['created_at']
    )

# Смена пароля
@app.post("/change-password")
async def change_password(
    password_data: ChangePasswordData,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
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

# Удаление аккаунта
@app.delete("/delete-account")
async def delete_account(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    user_id = user['id']
    
    try:
        cur.execute('SELECT image_path FROM saved_analyses WHERE user_id = ?', (user_id,))
        saved_images = cur.fetchall()
        
        for img in saved_images:
            try:
                minio_client.remove_object(MINIO_BUCKET_NAME, img['image_path'])
                print(f"Изображение удалено из Minio: {img['image_path']}")
            except Exception as e:
                print(f"Ошибка при удалении изображения из Minio: {e}")
        
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
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при удалении аккаунта: {str(e)}"
        )
    
    conn.close()
    
    return {"message": "Аккаунт успешно удален"}

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
    credentials: HTTPAuthorizationCredentials = Depends(security),
    background_tasks: BackgroundTasks = BackgroundTasks()
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

    try:
        background_tasks.add_task(reanalyze_all_saved_analyses, user['id'])
    except Exception as e:
        print(f"Ошибка при инициации пересмотра анализов: {e}")
    
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

# Эндпоинт для принудительной очистки просроченных токенов
@app.post("/cleanup-tokens")
async def cleanup_tokens():
    cleaned_count = cleanup_expired_tokens()
    return {"message": f"Удалено {cleaned_count} просроченных токенов"}

@app.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
    # Получаем медицинские данные пользователя
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute(
        'SELECT contraindications, allergens FROM user_medical_data WHERE user_id = ?',
        (user['id'],)
    )
    medical_data = cur.fetchone()
    conn.close()
    
    # Проверяем файл
    if not image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл не предоставлен"
        )
    
    # Проверяем тип файла
    allowed_content_types = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp']
    if image.content_type not in allowed_content_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неподдерживаемый тип файла. Разрешены: {', '.join(allowed_content_types)}"
        )
    
    try:
        # Читаем данные изображения
        image_data = await image.read()
        
        if len(image_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Файл пустой"
            )
        
        # Проверяем размер файла (максимум 10MB)
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Размер файла превышает 10MB"
            )
        
        # Проверяем, что это валидное изображение
        try:
            with Image.open(io.BytesIO(image_data)) as img:
                img.verify()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Некорректный формат изображения: {str(e)}"
            )
        
        # Конвертируем изображение в base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Создаем асинхронную функцию для вызова Ollama
        async def call_ollama(img_base64: str):
            """Асинхронный вызов Ollama с обработкой ошибок"""
            prompt = """Analyze this image and list all ingredients you can identify or assume in JSON format. 
            Use this exact structure: {"ingredients": ["ingredient1", "ingredient2", ...]}
            Be fast and concise."""
            
            def sync_ollama():
                return ollama.chat(
                    model='qwen3-vl:4b',
                    messages=[
                        {
                            'role': 'user',
                            'content': prompt,
                            'images': [img_base64]
                        }
                    ],
                    options={
                        'num_timeout': 420 # 7 минут в секундах
                    }
                )
            
            # Запускаем синхронную функцию в отдельном потоке
            response = await asyncio.to_thread(sync_ollama)
            return response
        
        # Отправляем запрос к Ollama с timeout
        try:
            # Используем asyncio.wait_for для установки таймаута
            response = await asyncio.wait_for(
                call_ollama(image_base64),
                timeout=430  # 7 минут
            )
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Анализ превысил максимальное время ожидания (8 минут)"
            )
        except Exception as e:
            print(f"Ollama error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка при обращении к модели AI: {str(e)}"
            )
        
        # Извлекаем JSON из ответа
        content = response['message']['content']
        print(f"Ollama response: {content}")
        
        # Пытаемся найти JSON в ответе
        json_match = re.search(r'\{[^{}]*\{.*\}[^{}]*\}|\{.*\}', content, re.DOTALL)
        ingredients_list = []
        
        if json_match:
            json_str = json_match.group()
            try:
                # Очищаем JSON строку
                json_str = re.sub(r'```json|```', '', json_str).strip()
                ingredients_data = json.loads(json_str)
                ingredients_list = ingredients_data.get('ingredients', [])
                if not isinstance(ingredients_list, list):
                    ingredients_list = [str(ingredients_list)]
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                # Если не удалось распарсить JSON, извлекаем ингредиенты другим способом
                ingredients_list = [line.strip() for line in content.split('\n') 
                                  if line.strip() and not line.strip().startswith('{') 
                                  and not line.strip().startswith('}')]
        else:
            # Если JSON не найден, пытаемся извлечь ингредиенты по строкам
            ingredients_list = [line.strip() for line in content.split('\n') 
                              if line.strip() and len(line.strip()) > 3]
        
        # Если список пустой, используем весь контент как один ингредиент
        if not ingredients_list:
            ingredients_list = [content.strip()]
        
        # Очищаем ингредиенты от лишних символов
        cleaned_ingredients = []
        for ingredient in ingredients_list:
            if ingredient and isinstance(ingredient, str):
                # Убираем маркеры списка, кавычки и лишние пробелы
                clean_ingredient = re.sub(r'^[\-\*•\d\.\s"\']+|[\-\*•\d\.\s"\']+$', '', ingredient)
                if clean_ingredient and len(clean_ingredient) > 1:
                    cleaned_ingredients.append(clean_ingredient)
        
        if not cleaned_ingredients:
            cleaned_ingredients = ["Не удалось определить ингредиенты"]
        
        # Проверяем на аллергены если есть медицинские данные
        allergens = []
        contraindications = []
        
        if medical_data:
            if medical_data['allergens']:
                allergens = [a.strip().lower() for a in re.split(r'[,;.\s\n]+', medical_data['allergens']) if a.strip()]
            if medical_data['contraindications']:
                contraindications = [c.strip().lower() for c in re.split(r'[,;.\s\n]+', medical_data['contraindications']) if c.strip()]
        
        # Анализируем ингредиенты на наличие аллергенов
        analyzed_ingredients = []
        warnings = []
        
        for ingredient in cleaned_ingredients:
            ingredient_lower = ingredient.lower()
            is_allergen = False
            is_contraindication = False
            
            # Проверяем на аллергены
            for allergen in allergens:
                if allergen and allergen in ingredient_lower:
                    is_allergen = True
                    break
            
            # Проверяем на противопоказания
            for contra in contraindications:
                if contra and contra in ingredient_lower:
                    is_contraindication = True
                    break
            
            analyzed_ingredients.append({
                'name': ingredient,
                'is_allergen': is_allergen,
                'is_contraindication': is_contraindication
            })
            
            if is_allergen:
                warnings.append(f"Аллерген обнаружен: {ingredient}")
            if is_contraindication:
                warnings.append(f"Противопоказание: {ingredient}")
        
        return {
            "ingredients": analyzed_ingredients,
            "warnings": warnings,
            "original_response": content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка при обработке изображения: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обработке изображения: {str(e)}"
        )

# Сохранение анализа изображения
@app.post("/save-analysis")
async def save_analysis(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    image: UploadFile = File(...),
    analysis_result: str = Form(...),
    ingredients_count: str = Form(...),
    warnings_count: str = Form(...)
):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
    try:
        # Парсим analysis_result из JSON строки
        analysis_result_dict = json.loads(analysis_result)
        
        # Проверяем файл
        if not image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Файл не предоставлен"
            )
        
        # Читаем данные изображения
        image_data = await image.read()
        
        if len(image_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Файл пустой"
            )
        
        # Генерируем уникальное имя для файла
        file_extension = image.filename.split('.')[-1] if '.' in image.filename else 'jpg'
        unique_filename = f"{user['id']}_{uuid.uuid4().hex}.{file_extension}"
        minio_path = f"user_{user['id']}/{unique_filename}"
        
        # Сохраняем изображение в Minio
        try:
            minio_client.put_object(
                MINIO_BUCKET_NAME,
                minio_path,
                io.BytesIO(image_data),
                length=len(image_data),
                content_type=image.content_type
            )
        except S3Error as e:
            print(f"Ошибка Minio: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при сохранении изображения"
            )
        
        # Сохраняем запись в базу данных
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute('''
            INSERT INTO saved_analyses 
            (user_id, image_path, analysis_result, ingredients_count, warnings_count)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            user['id'],
            minio_path,
            json.dumps(analysis_result_dict),
            int(ingredients_count),
            int(warnings_count)
        ))
        
        analysis_id = cur.lastrowid
        conn.commit()
        
        # Получаем сохраненную запись
        cur.execute('''
            SELECT id, user_id, image_path, analysis_result, 
                   ingredients_count, warnings_count, created_at
            FROM saved_analyses 
            WHERE id = ?
        ''', (analysis_id,))
        
        saved_analysis = cur.fetchone()
        conn.close()
        
        # Генерируем временную ссылку на изображение
        image_url = minio_client.presigned_get_object(
            MINIO_BUCKET_NAME,
            minio_path,
            expires=timedelta(hours=1)
        )
        
        return {
            "id": saved_analysis['id'],
            "user_id": saved_analysis['user_id'],
            "image_url": image_url,
            "analysis_result": json.loads(saved_analysis['analysis_result']),
            "ingredients_count": saved_analysis['ingredients_count'],
            "warnings_count": saved_analysis['warnings_count'],
            "created_at": saved_analysis['created_at']
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Некорректный формат JSON в analysis_result: {str(e)}"
        )
    except Exception as e:
        print(f"Ошибка при сохранении анализа: {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при сохранении анализа: {str(e)}"
        )

# Получение сохраненных анализов пользователя
@app.get("/saved-analyses")
async def get_saved_analyses(credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = get_user_by_token(credentials.credentials)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный или просроченный токен"
        )
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    cur.execute('''
        SELECT id, user_id, image_path, analysis_result, 
               ingredients_count, warnings_count, created_at
        FROM saved_analyses 
        WHERE user_id = ?
        ORDER BY created_at DESC
    ''', (user['id'],))
    
    saved_analyses = cur.fetchall()
    conn.close()
    
    results = []
    for analysis in saved_analyses:
        # Генерируем временную ссылку на изображение
        try:
            image_url = minio_client.presigned_get_object(
                MINIO_BUCKET_NAME,
                analysis['image_path'],
                expires=timedelta(hours=1)
            )
        except Exception as e:
            print(f"Ошибка при генерации ссылки: {e}")
            image_url = None
        
        results.append({
            "id": analysis['id'],
            "user_id": analysis['user_id'],
            "image_url": image_url,
            "analysis_result": json.loads(analysis['analysis_result']),
            "ingredients_count": analysis['ingredients_count'],
            "warnings_count": analysis['warnings_count'],
            "created_at": analysis['created_at']
        })
    
    return {"analyses": results}

# Эндпоинт для пересмотра анализа с медицинскими данными
@app.post("/reanalyze-analysis/{analysis_id}")
async def reanalyze_saved_analysis(
    analysis_id: int,
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
    
    # Получаем сохраненный анализ
    cur.execute('''
        SELECT id, user_id, analysis_result, warnings_count
        FROM saved_analyses 
        WHERE id = ? AND user_id = ?
    ''', (analysis_id, user['id']))
    
    analysis = cur.fetchone()
    
    if not analysis:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анализ не найден"
        )
    
    # Получаем текущие медицинские данные пользователя
    cur.execute(
        'SELECT contraindications, allergens FROM user_medical_data WHERE user_id = ?',
        (user['id'],)
    )
    medical_data = cur.fetchone()
    
    # Парсим старый результат анализа
    try:
        old_result = json.loads(analysis['analysis_result'])
    except json.JSONDecodeError:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный формат данных анализа"
        )
    
    # Извлекаем аллергены и противопоказания из медицинских данных
    allergens = []
    contraindications = []
    
    if medical_data:
        if medical_data['allergens']:
            allergens = [a.strip().lower() for a in re.split(r'[,;.\s\n]+', medical_data['allergens']) if a.strip()]
        if medical_data['contraindications']:
            contraindications = [c.strip().lower() for c in re.split(r'[,;.\s\n]+', medical_data['contraindications']) if c.strip()]
    
    # Анализируем ингредиенты заново с новыми медицинскими данными
    new_ingredients = []
    new_warnings = []
    new_warnings_count = 0
    
    for ingredient_data in old_result.get('ingredients', []):
        ingredient_name = ingredient_data.get('name', '')
        ingredient_lower = ingredient_name.lower()
        
        is_allergen = False
        is_contraindication = False
        
        # Проверяем на аллергены
        for allergen in allergens:
            if allergen and allergen in ingredient_lower:
                is_allergen = True
                break
        
        # Проверяем на противопоказания
        for contra in contraindications:
            if contra and contra in ingredient_lower:
                is_contraindication = True
                break
        
        new_ingredients.append({
            'name': ingredient_name,
            'is_allergen': is_allergen,
            'is_contraindication': is_contraindication
        })
        
        if is_allergen:
            new_warnings.append(f"Аллерген обнаружен: {ingredient_name}")
            new_warnings_count += 1
        if is_contraindication:
            new_warnings.append(f"Противопоказание: {ingredient_name}")
            new_warnings_count += 1
    
    # Обновляем анализ в базе
    new_result = {
        "ingredients": new_ingredients,
        "warnings": new_warnings,
        "original_response": old_result.get('original_response', 'Перепроверено с обновленными медицинскими данными')
    }
    
    cur.execute('''
        UPDATE saved_analyses 
        SET analysis_result = ?, warnings_count = ?
        WHERE id = ?
    ''', (json.dumps(new_result), new_warnings_count, analysis_id))
    
    conn.commit()
    
    # Получаем обновленный анализ с изображением
    cur.execute('''
        SELECT id, user_id, image_path, analysis_result, 
               ingredients_count, warnings_count, created_at
        FROM saved_analyses 
        WHERE id = ?
    ''', (analysis_id,))
    
    updated_analysis = cur.fetchone()
    
    # Генерируем временную ссылку на изображение
    try:
        image_url = minio_client.presigned_get_object(
            MINIO_BUCKET_NAME,
            updated_analysis['image_path'],
            expires=timedelta(hours=1)
        )
    except Exception as e:
        print(f"Ошибка при генерации ссылки: {e}")
        image_url = None
    
    result = {
        "id": updated_analysis['id'],
        "user_id": updated_analysis['user_id'],
        "image_url": image_url,
        "analysis_result": json.loads(updated_analysis['analysis_result']),
        "ingredients_count": updated_analysis['ingredients_count'],
        "warnings_count": updated_analysis['warnings_count'],
        "created_at": updated_analysis['created_at'],
        "message": "Анализ успешно перепроверен с обновленными медицинскими данными"
    }
    
    conn.close()
    return result

async def reanalyze_all_saved_analyses(user_id: int):
    """Пересматривает все сохраненные анализы пользователя"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Получаем медицинские данные пользователя
        cur.execute(
            'SELECT contraindications, allergens FROM user_medical_data WHERE user_id = ?',
            (user_id,)
        )
        medical_data = cur.fetchone()
        
        if not medical_data:
            print(f"У пользователя {user_id} нет медицинских данных")
            return
        
        # Получаем все сохраненные анализы пользователя
        cur.execute('''
            SELECT id, analysis_result 
            FROM saved_analyses 
            WHERE user_id = ?
        ''', (user_id,))
        
        analyses = cur.fetchall()
        
        # Извлекаем аллергены и противопоказания
        allergens = []
        contraindications = []
        
        if medical_data['allergens']:
            allergens = [a.strip().lower() for a in re.split(r'[,;.\s\n]+', medical_data['allergens']) if a.strip()]
        if medical_data['contraindications']:
            contraindications = [c.strip().lower() for c in re.split(r'[,;.\s\n]+', medical_data['contraindications']) if c.strip()]
        
        # Пересматриваем каждый анализ
        for analysis in analyses:
            try:
                old_result = json.loads(analysis['analysis_result'])
                
                new_ingredients = []
                new_warnings = []
                new_warnings_count = 0
                
                # Анализируем ингредиенты с новыми медицинскими данными
                for ingredient_data in old_result.get('ingredients', []):
                    ingredient_name = ingredient_data.get('name', '')
                    ingredient_lower = ingredient_name.lower()
                    
                    is_allergen = False
                    is_contraindication = False
                    
                    # Проверяем на аллергены
                    for allergen in allergens:
                        if allergen and allergen in ingredient_lower:
                            is_allergen = True
                            break
                    
                    # Проверяем на противопоказания
                    for contra in contraindications:
                        if contra and contra in ingredient_lower:
                            is_contraindication = True
                            break
                    
                    new_ingredients.append({
                        'name': ingredient_name,
                        'is_allergen': is_allergen,
                        'is_contraindication': is_contraindication
                    })
                    
                    if is_allergen:
                        new_warnings.append(f"Аллерген обнаружен: {ingredient_name}")
                        new_warnings_count += 1
                    if is_contraindication:
                        new_warnings.append(f"Противопоказание: {ingredient_name}")
                        new_warnings_count += 1
                
                # Обновляем анализ в базе
                new_result = {
                    "ingredients": new_ingredients,
                    "warnings": new_warnings,
                    "original_response": old_result.get('original_response', 
                                                        'Перепроверено с обновленными медицинскими данными')
                }
                
                cur.execute('''
                    UPDATE saved_analyses 
                    SET analysis_result = ?, warnings_count = ?
                    WHERE id = ?
                ''', (json.dumps(new_result), new_warnings_count, analysis['id']))
                
            except Exception as e:
                print(f"Ошибка при пересмотре анализа {analysis['id']}: {e}")
                continue
        
        conn.commit()
        print(f"Пересмотрено {len(analyses)} анализов для пользователя {user_id}")
        
    except Exception as e:
        print(f"Ошибка в reanalyze_all_saved_analyses: {e}")
    finally:
        conn.close()

# Эндпоинт для удаления анализа
@app.delete("/saved-analyses/{analysis_id}")
async def delete_saved_analysis(
    analysis_id: int,
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
    
    # Получаем анализ с путем к изображению
    cur.execute('''
        SELECT id, user_id, image_path 
        FROM saved_analyses 
        WHERE id = ? AND user_id = ?
    ''', (analysis_id, user['id']))
    
    analysis = cur.fetchone()
    
    if not analysis:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Анализ не найден"
        )
    
    # Удаляем анализ из базы
    cur.execute('DELETE FROM saved_analyses WHERE id = ?', (analysis_id,))
    
    # Удаляем изображение из Minio
    try:
        minio_client.remove_object(MINIO_BUCKET_NAME, analysis['image_path'])
        print(f"Изображение удалено из Minio: {analysis['image_path']}")
    except Exception as e:
        print(f"Ошибка при удалении изображения из Minio: {e}")
    
    conn.commit()
    conn.close()
    
    return {"message": "Анализ успешно удален"}

@app.get("/")
async def root():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
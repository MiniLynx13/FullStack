import uvicorn
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import sqlite3
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional
import base64
from PIL import Image
import ollama
import json
import traceback
import re
import io

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
        
        # Подготавливаем промпт
        prompt = """Analyze this image and list all ingredients you can identify or assume in JSON format. Use this exact structure: {"ingredients": ["ingredient1", "ingredient2", ...]}"""
        
        # Отправляем запрос к Ollama
        try:
            response = ollama.chat(
                model='qwen3-vl:4b',
                messages=[
                    {
                        'role': 'user',
                        'content': prompt,
                        'images': [image_base64]
                    }
                ],
                options={
                    'timeout': 300000 # 5 минут в миллисекундах
                }
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

@app.get("/")
async def root():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
import hashlib
import secrets
from datetime import datetime, timedelta
from .db import get_db_connection
from .config import ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
import json
import re
import asyncio
import ollama
from PIL import Image
import io
import base64

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

def parse_bool_param(value: str) -> bool:
    """Парсит строковое значение в булево"""
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ('true', '1', 'yes', 'on')
    return bool(value)

async def compress_image(image_data: bytes, max_size: int = 500, quality: int = 85) -> bytes:
    """
    Сжимает изображение, сохраняя пропорции и формат
    
    Args:
        image_data: исходные байты изображения
        max_size: максимальный размер по длинной стороне (пиксели)
        quality: качество JPEG сжатия (1-100)
    
    Returns:
        сжатые байты изображения
    """
    try:
        # Открываем изображение
        img = Image.open(io.BytesIO(image_data))
        
        # Сохраняем исходный формат
        original_format = img.format
        
        # Получаем размеры
        width, height = img.size
        
        # Вычисляем новые размеры с сохранением пропорций
        if width > height:
            new_width = max_size
            new_height = int(height * (max_size / width))
        else:
            new_height = max_size
            new_width = int(width * (max_size / height))
        
        # Изменяем размер
        img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Определяем формат для сохранения
        # Для PNG нужно сохранять без потерь, но можно конвертировать в JPEG если нет прозрачности
        save_format = original_format if original_format else 'JPEG'
        
        # Для PNG с прозрачностью сохраняем как PNG
        if save_format == 'PNG' and img_resized.mode == 'RGBA':
            output_buffer = io.BytesIO()
            img_resized.save(output_buffer, format='PNG', optimize=True)
            return output_buffer.getvalue()
        
        # Для остальных - JPEG с указанным качеством
        output_buffer = io.BytesIO()
        
        # Конвертируем RGBA в RGB для JPEG
        if img_resized.mode == 'RGBA' and save_format == 'JPEG':
            # Создаем белый фон
            background = Image.new('RGB', img_resized.size, (255, 255, 255))
            background.paste(img_resized, mask=img_resized.split()[3])
            img_resized = background
        
        img_resized.save(
            output_buffer, 
            format='JPEG' if save_format != 'PNG' else save_format,
            quality=quality,
            optimize=True
        )
        
        compressed_data = output_buffer.getvalue()
        
        # Логируем результат сжатия
        original_size_kb = len(image_data) / 1024
        compressed_size_kb = len(compressed_data) / 1024
        compression_ratio = (1 - len(compressed_data) / len(image_data)) * 100
        
        print(f"Изображение сжато: {original_size_kb:.1f}KB -> {compressed_size_kb:.1f}KB "
              f"(сжатие {compression_ratio:.1f}%, размер {new_width}x{new_height})")
        
        return compressed_data
        
    except Exception as e:
        print(f"Ошибка при сжатии изображения: {e}")
        # В случае ошибки возвращаем исходное изображение
        return image_data

def clean_ingredient_name(ingredient: str) -> str:
    """Очищает название ингредиента от лишних символов"""
    # Убираем маркеры списка, кавычки и лишние пробелы
    clean = re.sub(r'^[\-\*•\d\.\s"\']+|[\-\*•\d\.\s"\']+$', '', ingredient)
    return clean.strip() if clean and len(clean) > 1 else ingredient

def parse_ollama_response(content: str) -> list:
    """Парсинг ответа Ollama с обработкой разных форматов"""
    
    # Пытаемся найти JSON в ответе
    json_match = re.search(r'\{[^{}]*\{.*\}[^{}]*\}|\{.*\}', content, re.DOTALL)
    
    if json_match:
        json_str = json_match.group()
        try:
            # Очищаем JSON строку
            json_str = re.sub(r'```json|```', '', json_str).strip()
            ingredients_data = json.loads(json_str)
            ingredients_list = ingredients_data.get('ingredients', [])
            if isinstance(ingredients_list, list):
                # Очищаем каждый ингредиент
                cleaned = []
                for ing in ingredients_list:
                    if ing and isinstance(ing, str):
                        clean_name = clean_ingredient_name(ing)
                        if clean_name:
                            cleaned.append(clean_name)
                if cleaned:
                    return cleaned
        except json.JSONDecodeError:
            pass
    
    # Fallback: разбиваем по строкам
    ingredients = []
    for line in content.split('\n'):
        line = line.strip()
        if not line:
            continue
        
        # Пропускаем JSON-подобные строки
        if line.startswith('{') or line.startswith('}'):
            continue
        
        clean = clean_ingredient_name(line)
        if clean and len(clean) > 2 and not clean.startswith('{'):
            ingredients.append(clean)
    
    return ingredients

async def call_ollama_with_retry(image_base64: str, original_image_data: bytes) -> dict:
    """Вызов Ollama с повторными попытками и прогрессивным сжатием"""
    
    async def async_ollama_call(current_image_base64: str):
        """Асинхронная функция для вызова Ollama через asyncio.to_thread"""
        prompt = """Analyze this image and list all ingredients you can identify or assume in JSON format. 
        Use this exact structure: {"ingredients": ["ingredient1", "ingredient2", ...]}
        Be fast and concise."""
        
        print(f"  -> Отправка запроса к Ollama...")
        import time
        start_time = time.time()
        
        # ollama.chat() синхронный, поэтому запускаем в потоке
        result = await asyncio.to_thread(
            ollama.chat,
            model='qwen3-vl:4b',
            messages=[
                {
                    'role': 'user',
                    'content': prompt,
                    'images': [current_image_base64]
                }
            ],
            options={'num_timeout': 300}
        )
        
        elapsed = time.time() - start_time
        print(f"  -> Ollama ответил за {elapsed:.1f} секунд")
        return result
    
    last_error = None
    current_image_base64 = image_base64
    current_image_data = original_image_data

    for attempt in range(3):
        try:
            print(f"Ollama attempt {attempt + 1}/3")
            
            if attempt == 1:
                print("  -> Сжатие изображения до 1000px (вторая попытка)")
                compressed_data = await compress_image(current_image_data, max_size=1000, quality=85)
                current_image_base64 = base64.b64encode(compressed_data).decode('utf-8')
                current_image_data = compressed_data
                
            elif attempt == 2:
                print("  -> Сжатие изображения до 500px (третья попытка)")
                compressed_data = await compress_image(current_image_data, max_size=500, quality=80)
                current_image_base64 = base64.b64encode(compressed_data).decode('utf-8')
                current_image_data = compressed_data

            print(f"  -> Вызов Ollama (таймаут 330 сек)...")
            # Здесь async_ollama_call - корутина, которую мы ожидаем
            response = await asyncio.wait_for(
                async_ollama_call(current_image_base64),
                timeout=330
            )
            
            content = response.get('message', {}).get('content', '')
            if not content:
                raise ValueError("Empty response from Ollama")
            
            print(f"  -> Успешно! Длина ответа: {len(content)} символов")
            print(f"  -> Содержимое ответа (первые 200 символов): {content[:200]}")
            return response
            
        except asyncio.TimeoutError:
            last_error = f"Timeout on attempt {attempt + 1}"
            print(f"  -> Ollama timeout, retry {attempt + 1}/3")
            if attempt < 2:
                await asyncio.sleep(2)
                
        except Exception as e:
            last_error = str(e)
            print(f"  -> Ollama error on attempt {attempt + 1}: {e}")
            import traceback
            traceback.print_exc()
            if attempt < 2:
                await asyncio.sleep(2)
    
    raise Exception(f"Ollama failed after 3 attempts: {last_error}")

async def analyze_image_with_fallback(image_base64: str, original_image_data: bytes) -> dict:
    """
    Анализ изображения с graceful degradation:
    - Сначала пытается вызвать Ollama (с retry)
    - При ошибке возвращает fallback ответ
    """
    try:
        # Пытаемся вызвать Ollama
        response = await call_ollama_with_retry(image_base64, original_image_data)
        content = response['message']['content']
        print(f"Ollama response received, length: {len(content)}")
        
        # Парсим ответ
        ingredients_list = parse_ollama_response(content)
        
        if not ingredients_list:
            raise ValueError("No ingredients extracted from Ollama response")
        
        return {
            "ingredients": ingredients_list,
            "warnings": [],
            "original_response": content,
            "source": "ollama"
        }
        
    except Exception as e:
        print(f"Ollama analysis failed, using fallback: {e}")
        
        # FALLBACK: возвращаем заглушку
        return {
            "ingredients": [
                "Не удалось определить ингредиенты"
            ],
            "warnings": [
                "⚠️ Сервис анализа временно недоступен. Пожалуйста, попробуйте позже."
            ],
            "original_response": f"Analysis service unavailable: {str(e)}",
            "source": "fallback",
            "error": str(e)
        }
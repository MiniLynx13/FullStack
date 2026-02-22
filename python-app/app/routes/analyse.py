from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from datetime import timedelta
import io
import json
import traceback
import re
import asyncio
from PIL import Image
import base64
import ollama

from ..db import get_db_connection
from ..minio import minio_client, save_image_to_minio, get_image_url, delete_image_from_minio
from ..dependencies import require_not_banned
from ..funcs import parse_medical_text
from ..analyse_utils import reanalyze_all_saved_analyses
from ..config import MINIO_BUCKET_NAME

router = APIRouter(prefix="", tags=["analyse"])

@router.post("/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    user = Depends(require_not_banned)
):
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
            allergens = parse_medical_text(medical_data['allergens'])
            contraindications = parse_medical_text(medical_data['contraindications'])
        
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

@router.post("/save-analysis")
async def save_analysis(
    user = Depends(require_not_banned),
    image: UploadFile = File(...),
    analysis_result: str = Form(...),
    ingredients_count: str = Form(...),
    warnings_count: str = Form(...)
):
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
        
        # Сохраняем изображение в Minio
        try:
            minio_path = save_image_to_minio(image_data, user['id'], image.filename, image.content_type)
        except Exception as e:
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
        image_url = get_image_url(minio_path)
        
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

@router.get("/saved-analyses")
async def get_saved_analyses(user = Depends(require_not_banned)):
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
        image_url = get_image_url(analysis['image_path'])
        
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

@router.post("/reanalyze-analysis/{analysis_id}")
async def reanalyze_saved_analysis(
    analysis_id: int,
    user = Depends(require_not_banned)
):
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
    allergens = parse_medical_text(medical_data['allergens'] if medical_data else None)
    contraindications = parse_medical_text(medical_data['contraindications'] if medical_data else None)
    
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
    image_url = get_image_url(updated_analysis['image_path'])
    
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

@router.delete("/saved-analyses/{analysis_id}")
async def delete_saved_analysis(
    analysis_id: int,
    user = Depends(require_not_banned)
):
    from ..minio import delete_image_from_minio
    
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
    delete_image_from_minio(analysis['image_path'])
    
    conn.commit()
    conn.close()
    
    return {"message": "Анализ успешно удален"}
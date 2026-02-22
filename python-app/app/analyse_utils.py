import json
import re
import traceback
from .db import get_db_connection
from .funcs import parse_medical_text

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
        allergens = parse_medical_text(medical_data['allergens'])
        contraindications = parse_medical_text(medical_data['contraindications'])
        
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
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime
from ..models import MedicalData, MedicalDataResponse
from ..db import get_db_connection
from ..dependencies import require_not_banned
from ..analyse_utils import reanalyze_all_saved_analyses

router = APIRouter(prefix="", tags=["medical"])

@router.get("/medical-data")
async def get_medical_data(user = Depends(require_not_banned)):
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

@router.post("/medical-data")
async def save_medical_data(
    medical_data: MedicalData,
    user = Depends(require_not_banned),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
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
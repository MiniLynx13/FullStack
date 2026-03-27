from minio import Minio
from minio.error import S3Error
from datetime import timedelta
import os
import base64
import io
from .config import (
    MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, 
    MINIO_BUCKET_NAME, MINIO_SECURE
)

# Флаг для fallback режима (если MinIO недоступен)
USE_FALLBACK_STORAGE = False

# Инициализация клиента Minio
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=MINIO_SECURE
)

def create_bucket_if_not_exists():
    """Создание bucket если не существует"""
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET_NAME):
            minio_client.make_bucket(MINIO_BUCKET_NAME)
            print(f"Bucket '{MINIO_BUCKET_NAME}' создан")
    except Exception as e:
        print(f"Ошибка при создании bucket: {e}")

def save_image_to_minio(image_data, user_id, filename, content_type):
    """Сохраняет изображение в Minio"""
    import uuid
    try:
        file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
        unique_filename = f"{user_id}_{uuid.uuid4().hex}.{file_extension}"
        minio_path = f"user_{user_id}/{unique_filename}"
        
        minio_client.put_object(
            MINIO_BUCKET_NAME,
            minio_path,
            io.BytesIO(image_data),
            length=len(image_data),
            content_type=content_type
        )
        return minio_path
        
    except Exception as e:
        print(f"MinIO error, using fallback storage: {e}")
        # Fallback: сохраняем локально
        fallback_dir = f"fallback_images/user_{user_id}"
        os.makedirs(fallback_dir, exist_ok=True)
        
        file_extension = filename.split('.')[-1] if '.' in filename else 'jpg'
        unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
        fallback_path = f"{fallback_dir}/{unique_filename}"
        
        with open(fallback_path, 'wb') as f:
            f.write(image_data)
        
        # Возвращаем путь с маркером fallback
        return f"fallback:{fallback_path}"

def get_image_url(minio_path, expires=timedelta(hours=1)):
    """Генерирует ссылку с поддержкой fallback"""
    if minio_path.startswith('fallback:'):
        # Fallback режим: возвращаем base64 или локальный путь
        local_path = minio_path.replace('fallback:', '')
        try:
            with open(local_path, 'rb') as f:
                image_data = f.read()
            return f"data:image/jpeg;base64,{base64.b64encode(image_data).decode()}"
        except Exception as e:
            print(f"Error reading fallback image: {e}")
            return None
    try:
        return minio_client.presigned_get_object(
            MINIO_BUCKET_NAME,
            minio_path,
            expires=expires
        )
    except Exception as e:
        print(f"Ошибка при генерации ссылки: {e}")
        return None

def delete_image_from_minio(minio_path):
    """Удаляет изображение из Minio"""
    try:
        minio_client.remove_object(MINIO_BUCKET_NAME, minio_path)
        print(f"Изображение удалено из Minio: {minio_path}")
        return True
    except Exception as e:
        print(f"Ошибка при удалении изображения из Minio: {e}")
        return False
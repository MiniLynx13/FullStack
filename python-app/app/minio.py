from minio import Minio
from minio.error import S3Error
from datetime import timedelta
import io
from .config import (
    MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, 
    MINIO_BUCKET_NAME, MINIO_SECURE
)

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

def get_image_url(minio_path, expires=timedelta(hours=1)):
    """Генерирует временную ссылку на изображение"""
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
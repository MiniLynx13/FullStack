import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import CORS_ORIGINS, HOST, PORT
from app.db import init_db, cleanup_expired_tokens
from app.minio import create_bucket_if_not_exists

from app.routes import auth, tokens, user, medical, analyse, admin

from app.seo import router as seo_router

app = FastAPI()

# Настройки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключаем роутеры
app.include_router(auth.router)
app.include_router(tokens.router)
app.include_router(user.router)
app.include_router(medical.router)
app.include_router(analyse.router)
app.include_router(admin.router)
app.include_router(seo_router)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    create_bucket_if_not_exists()
    # Очищаем просроченные токены при запуске приложения
    cleaned_count = cleanup_expired_tokens()
    print(f"При запуске удалено {cleaned_count} просроченных токенов")
    yield

@app.get("/")
async def root():
    return {"message": "Backend is running!"}

@app.get("/health")
async def health_check():
    """
    Healthcheck endpoint для Docker.
    Проверяет работоспособность сервиса и его зависимостей.
    """
    import requests
    from app.config import MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME, OLLAMA_HOST
    from minio import Minio
    from minio.error import S3Error
    
    health_status = {
        "status": "healthy",
        "checks": {}
    }
    is_healthy = True
    
    # 1. Проверка MinIO
    try:
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            secure=False
        )
        # Пытаемся получить список buckets (легковесная операция)
        buckets = minio_client.list_buckets()
        health_status["checks"]["minio"] = {"status": "up", "buckets_count": len(buckets)}
    except Exception as e:
        health_status["checks"]["minio"] = {"status": "down", "error": str(e)}
        is_healthy = False
    
    # 2. Проверка базы данных (опционально)
    try:
        from app.db import get_db_connection
        conn = get_db_connection()
        conn.execute("SELECT 1")
        conn.close()
        health_status["checks"]["database"] = {"status": "up"}
    except Exception as e:
        health_status["checks"]["database"] = {"status": "down", "error": str(e)}
        is_healthy = False
    
    if not is_healthy:
        health_status["status"] = "unhealthy"
        return JSONResponse(
            status_code=503,
            content=health_status
        )
    
    return health_status

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Страница не найдена"}
    )

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, HOST, PORT
from app.db import init_db, cleanup_expired_tokens
from app.minio import create_bucket_if_not_exists

from app.routes import auth, tokens, user, medical, analyse, admin

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

@app.on_event("startup")
async def startup_event():
    init_db()
    create_bucket_if_not_exists()
    # Очищаем просроченные токены при запуске приложения
    cleaned_count = cleanup_expired_tokens()
    print(f"При запуске удалено {cleaned_count} просроченных токенов")

@app.get("/")
async def root():
    return {"message": "Backend is running!"}

if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

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

memory_db = {
	"home": "Это будет главная страничка, домашняя. Наверное красивая.",
	"user": "Это будет страничка пользователья, где можно будет заполнить медицинские противопоказания и аллергены.",
	"authorisation": "Это будет страничка авторизации. Ничего такого.",
	"photo": "Это будет страничка с ИИ-шкой. Сюда можно будет загружать фото блюд и смотреть состав.",
	"calories": "Это будет страничка с калюкулятором для подсчёта калорий."
}

class Response(BaseModel):
    phrase: str

@app.get("/", response_model=Response)
async def get_phrase():
    phrase = memory_db.get("home", "Упс. Данные не были предоставлены.")
    return Response(phrase=phrase)

@app.get("/{page_name}", response_model=Response)
async def get_phrase(page_name: str):
    phrase = memory_db.get(page_name, "Упс. Данные не были предоставлены.")
    return Response(phrase=phrase)

if __name__ == "__main__":
	uvicorn.run(app, host="0.0.0.0", port=8000)
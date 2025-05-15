from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # 开发阶段 * 最简单
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskIn(BaseModel):
    question: str

@app.post("/ask")
async def ask(payload: AskIn):
    return {
        "answer": "A dummy answer with a citation [1].",
        "sources": [
            {"id": 1, "page": 2, "snippet": "Dummy snippet from page 2"}
        ],
    }

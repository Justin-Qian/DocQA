import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from typing import List
import json

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 接收前端发送的全文 original_text
class AskIn(BaseModel):
    question: str
    references: List[str]
    original_text: List[str]

@app.post("/ask")
async def ask(payload: AskIn):
    user_question = payload.question
    user_references = payload.references
    original_text = payload.original_text

    # 构建用户引用字符串
    user_references_text = "\n".join([f"- {ref}" for ref in user_references]) if user_references else "None"
    combined_text = "\n".join(original_text)

    user_prompt = (
        f"Context (the full passage provided by the user):\n{combined_text}\n\n"
        f"User selected references (use these to understand focus):\n{user_references_text}\n\n"
        f"Question:\n{user_question}"
    )

    messages = [
        {"role": "system", "content": "You are a helpful assistant. Answer questions based on the context and user's focus."},
        {"role": "user", "content": user_prompt}
    ]

    def gen():
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.4,
            stream=True
        )
        last_token = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                if token != last_token:
                    yield f"data: {json.dumps({'answer': token})}\n\n"
                    last_token = token

    return StreamingResponse(gen(), media_type="text/event-stream")

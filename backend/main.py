import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from typing import List

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class AskIn(BaseModel):
    question: str
    references: List[str]

# 你展示的原始内容作为上下文
BASE_CONTEXT = """
Plants need sunlight, water, air, and soil to grow well. Sunlight helps plants make their own food through a process called photosynthesis. This is how they turn light into energy.

Water is taken in by the roots and moves up through the plant to the leaves. Without enough water, a plant may wilt or stop growing.

Air gives plants carbon dioxide, which they use along with sunlight to make food. This is why plants are usually found in open spaces.

Soil supports the plant and gives it important nutrients like nitrogen and potassium. These nutrients help plants grow taller, greener, and stronger.

If a plant gets too little sunlight, or is in very dry soil, it may grow slowly or not at all. People often place their plants near windows or in gardens to give them what they need.
"""

@app.post("/ask")
async def ask(payload: AskIn):
    user_question = payload.question
    user_references = payload.references

    # 构建用户引用字符串
    user_references_text = "\n".join([f"- {ref}" for ref in user_references]) if user_references else "None"

    user_prompt = (
        f"Context:\n{BASE_CONTEXT}\n\n"
        f"User selected references (use these to understand focus):\n{user_references_text}\n\n"
        f"Question:\n{user_question}"
    )

    messages = [
        {"role": "system", "content": "You are a helpful assistant. Answer questions based on the context and user's focus."},
        {"role": "user", "content": user_prompt}
    ]

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=messages,
        temperature=0.4,
    )

    reply = response.choices[0].message.content

    return {
        "answer": reply
    }

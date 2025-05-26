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

ORIGINAL_TEXT = [
  "Plants need four important things to grow well: sunlight, water, air, and soil. These things work together to help the plant stay healthy, strong, and full of life. If one of them is missing, the plant might grow slowly or even stop growing. That's why people who care for plants need to understand what each part does.",
  "First, sunlight is like food for plants. Through a special process called photosynthesis, plants use sunlight to make energy. They take in the light with their leaves and turn it into food that helps them grow. Without enough sunlight, plants may become pale, weak, or small. That's why you often see plants placed near windows or growing outdoors where they can soak up the light.",
  "Next, plants need water, which they absorb through their roots. The water travels up through the plant's stem and reaches all parts of the plant, especially the leaves. Water helps carry nutrients and keeps the plant firm and upright. On hot or dry days, you may notice plants wilting or drooping—that's a sign they need water. Without enough, the plant can't grow properly and might even dry out.",
  "Air is just as important. Plants take in a gas from the air called carbon dioxide, which they also use during photosynthesis to make food. Without carbon dioxide, the plant wouldn't be able to complete this process. That's why most plants grow best in open spaces with fresh air, instead of in closed, stuffy places.",
  "Lastly, soil provides both support and nutrition. It holds the plant in place and is full of important minerals like nitrogen, potassium, and phosphorus. These nutrients help the plant grow taller, produce more leaves, and stay a healthy green color. Rich, healthy soil is one of the best things you can give a plant.",
  "When plants get enough sunlight, water, air, and nutrients from the soil, they can grow strong and healthy. But if even one of these is missing—too little light, dry soil, not enough air, or a lack of water—the plant may struggle. That's why people place their plants where they can get everything they need, whether it's a bright window, a well-watered garden, or a spot with fresh air and good soil."
]

@app.post("/ask")
async def ask(payload: AskIn):
    user_question = payload.question
    user_references = payload.references
    original_text = ORIGINAL_TEXT

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

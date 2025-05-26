import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from typing import List
import json

# === LangChain 相关 ===
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import FAISS

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

# 仅在启动时构建一次向量库
embeddings = OpenAIEmbeddings()
splitter = RecursiveCharacterTextSplitter(chunk_size=256, chunk_overlap=32)
docs = [
    doc for paragraph in ORIGINAL_TEXT for doc in splitter.create_documents([paragraph])
]
vector_store = FAISS.from_documents(docs, embeddings)

@app.post("/ask")
async def ask(payload: AskIn):
    user_question = payload.question
    user_references = payload.references

    # 1) 向量检索
    top_docs = vector_store.similarity_search(user_question, k=3)
    retrieved_context = "\n".join([
        f"[{idx+1}] {doc.page_content}" for idx, doc in enumerate(top_docs)
    ]) or "None"

    # 2) 构建 prompt
    user_references_text = (
        "\n".join([f"- {ref}" for ref in user_references]) if user_references else "None"
    )

    user_prompt = (
        "You are a helpful assistant. Answer the question based on the context. When you use information from the context, cite the corresponding number in square brackets, e.g., [1][2]. Do not invent citations.\n\n"
        f"Context from document (numbered for citation):\n{retrieved_context}\n\n"
        f"User selected references to emphasise (optional):\n{user_references_text}\n\n"
        f"Question:\n{user_question}"
    )

    # few-shot 示例（教模型正确引用编号）
    few_shot_messages = [
        {
            "role": "user",
            "content": (
                "Context (numbered for citation):\n"
                "[1] Photosynthesis is the process by which plants make food using sunlight.\n"
                "[2] Water is transported from roots to leaves through the xylem.\n"
                "[3] When plants get enough sunlight, water, air, and nutrients from the soil, they can grow strong and healthy.\n"
                "Question:\nExplain how plants obtain the resources needed for photosynthesis."
            )
        },
        {
            "role": "assistant",
            "content": (
                "Plants obtain the key ingredients for photosynthesis from different sources: they absorb sunlight with their leaves to capture energy.[1] Water is drawn up from the roots through the xylem to reach the leaves where photosynthesis occurs.[2]"
            )
        }
    ]

    messages = few_shot_messages + [
        {"role": "user", "content": user_prompt}
    ]

    def gen():
        # 先把检索到的文档片段发送给前端，type=context
        context_payload = {
            "type": "context",
            "top_docs": [d.page_content for d in top_docs]
        }
        yield f"data: {json.dumps(context_payload)}\n\n"

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.4,
            stream=True
        )

        # 处理 token
        last_token = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                if token != last_token:
                    yield f"data: {json.dumps({'type':'token','answer': token})}\n\n"
                    last_token = token

    return StreamingResponse(gen(), media_type="text/event-stream")

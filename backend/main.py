import os
from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from openai import OpenAI
from typing import List
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.embeddings import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import PyPDFLoader
import tempfile

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
embeddings = OpenAIEmbeddings()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

def process_pdf(file: UploadFile):
    """Process PDF file and return vectorstore"""
    # Save uploaded file to temporary file
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
        content = file.file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Load PDF
        loader = PyPDFLoader(tmp_path)
        pages = loader.load()

        # Split text into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=250,
            chunk_overlap=50,
            length_function=len,
        )
        chunks = text_splitter.split_documents(pages)

        # Create vector store
        return Chroma.from_documents(
            documents=chunks,
            embedding=embeddings,
        )
    finally:
        # Clean up temporary file
        os.unlink(tmp_path)

@app.post("/ask")
async def ask(
    file: UploadFile = File(...),
    question: str = Form(...)
):
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")

    try:
        # Process PDF and create vectorstore
        vectorstore = process_pdf(file)

        # Retrieve relevant documents
        docs = vectorstore.similarity_search(question, k=3)
        context = "\n".join([doc.page_content for doc in docs])

        # Build prompt
        system_prompt = (
            "You are a helpful assistant. Answer the question based on the provided context. "
            "If the answer cannot be found in the context, say so. "
            "Keep your answer concise and focused."
        )

        user_prompt = f"Context:\n{context}\n\nQuestion:\n{question}"

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.4,
        )

        return {
            "answer": response.choices[0].message.content,
            "sources": [{"id": i+1, "snippet": doc.page_content} for i, doc in enumerate(docs)]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"use client";
import { useState } from "react";
import AnswerRichText from "@/components/AnswerRichText";


interface AskResponse {
  answer: string;
  sources: Array<{ id: number; page: number; snippet: string }>;
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAsk() {
    if (!question) return;
    setLoading(true);
    const res = await fetch("http://127.0.0.1:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  return (
    <main className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold text-center">Doc Q&A Demo ✨</h1>

      <div className="space-y-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about the contract..."
          className="w-full rounded border px-3 py-2"
        />
        <button
          onClick={handleAsk}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded py-2 disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? "Loading…" : "Ask"}
        </button>
      </div>

      {data && (
        <div className="rounded border p-4">
          <AnswerRichText answer={data.answer} sources={data.sources} />
        </div>
      )}
    </main>
  );
}

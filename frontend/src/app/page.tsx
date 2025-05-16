"use client";
import { useState } from "react";
import AnswerRichText from "@/components/AnswerRichText";


interface AskResponse {
  answer: string;
  sources: Array<{ id: number; page: number; snippet: string }>;
}

const ORIGINAL_TEXT = [
  // 第一段
  "Plants need sunlight, water, air, and soil to grow well.",
  "Sunlight helps plants make their own food through a process called photosynthesis.",
  "This is how they turn light into energy.",

  // 第二段
  "Water is taken in by the roots and moves up through the plant to the leaves.",
  "Without enough water, a plant may wilt or stop growing.",

  // 第三段
  "Air gives plants carbon dioxide, which they use along with sunlight to make food.",
  "This is why plants are usually found in open spaces.",

  // 第四段
  "Soil supports the plant and gives it important nutrients like nitrogen and potassium.",
  "These nutrients help plants grow taller, greener, and stronger.",

  // 第五段
  "If a plant gets too little sunlight, or is in very dry soil, it may grow slowly or not at all.",
  "People often place their plants near windows or in gardens to give them what they need."
];

export default function Home() {
  const [question, setQuestion] = useState("");
  const [data, setData] = useState<AskResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState<string[]>([]);

  const handleReset = () => {
    setQuestion("");
    setData(null);
    setReferences([]);
  };

  // 处理文本选择和拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = e.currentTarget as HTMLElement;
    container.draggable = false;
  };

  const handleDragStart = (e: React.DragEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      e.dataTransfer.setData("text/plain", selection.toString().trim());
    }
  };

  const handleDeleteRef = (indexToDelete: number) => {
    setReferences(prev => prev.filter((_, index) => index !== indexToDelete));
  };

  async function handleAsk() {
    if (!question) return;
    setLoading(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        references
      }),
    });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-4">
        <h1 className="inline text-2xl font-bold">DocQA Demo 🌿</h1>
        <span className="ml-3 text-sm text-gray-500">by Yujia Qian</span>
      </div>
      {/* 上部分：原文内容 */}
      <div
        className="border p-4 rounded select-text mb-16"
        onMouseDown={handleMouseDown}
        onDragStart={handleDragStart}
      >
        {ORIGINAL_TEXT.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </div>

      {/* 中间：输入区域 */}
      <div className="flex flex-wrap gap-2 mb-2">
        {references.map((ref, index) => (
          <div key={index} className="relative group">
            <div className="relative">
              <button className="bg-gray-200 px-2 py-1 rounded text-sm inline-flex items-center">
                <span>ref {index + 1}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRef(index);
                  }}
                  className="w-0 group-hover:w-4 overflow-hidden transition-all duration-200
                           bg-gray-600 text-white rounded ml-1 h-4 flex items-center justify-center text-xs
                           opacity-0 group-hover:opacity-100 hover:bg-gray-700 cursor-pointer"
                >
                  ×
                </span>
              </button>
            </div>
            <div className="absolute left-0 bottom-full mb-2 p-2 bg-gray-100 text-black text-sm rounded shadow-lg
                          invisible group-hover:visible w-48 z-10 whitespace-pre-wrap">
              {ref}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1 group">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onDrop={(e) => {
              e.preventDefault();
              const text = e.dataTransfer.getData("text/plain");
              if (text) {
                setReferences(prev => [...prev, text]);
              }
            }}
            onDragOver={(e) => e.preventDefault()}
            placeholder="please ask me anything"
            className="w-full border p-2 rounded"
          />
          <span
            onClick={handleReset}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-0 group-hover:w-6 overflow-hidden
                     transition-all duration-200 bg-gray-600 text-white rounded h-6
                     flex items-center justify-center text-sm opacity-0 group-hover:opacity-100
                     hover:bg-gray-700 cursor-pointer"
          >
            ×
          </span>
        </div>
        <button
          onClick={handleAsk}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
        >
          {loading ? "Loading..." : "Ask"}
        </button>
      </div>

      {/* 下部分：回答区域 */}
      {data && (
        <div className="border p-4 rounded">
          <AnswerRichText
            answer={data.answer}
            sources={data.sources}
            onHighlight={(snippet) => {
              // 当鼠标悬停在引用上时，高亮对应的原文段落
              const paragraphs = document.querySelectorAll('p');
              paragraphs.forEach(p => {
                if (snippet && p.textContent?.includes(snippet)) {
                  p.classList.add('bg-yellow-100', 'font-bold', 'italic');
                } else {
                  p.classList.remove('bg-yellow-100', 'font-bold', 'italic');
                }
              });
            }}
          />
        </div>
      )}
    </main>
  );
}

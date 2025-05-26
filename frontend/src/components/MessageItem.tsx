import React from "react";
import CitationPopover from "./CitationPopover";

interface MessageItemProps {
  content: string;
  timestamp: string;
  isUser: boolean;
  retrieved?: string[];
  onHighlight: (snippet: string | null) => void;
}

export default function MessageItem({ content, timestamp, isUser, retrieved = [], onHighlight }: MessageItemProps) {

  const parts = content.split(/(\[\d+\])/g);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {/* 时间戳 */}
        <div className={`text-xs text-gray-500 mb-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {timestamp}
        </div>

        {/* 消息泡泡 */}
        <div className={`rounded-lg p-3 ${
          isUser
            ? 'bg-gray-600 text-white'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {retrieved.length > 0 ? (
            // 引用内容
            <div className="leading-7">
            {parts.map((part, idx) => {
              const m = part.match(/^\[(\d+)\]$/);
              if (!m) return part;

              const num = Number(m[1]);
              const snippet = retrieved[num - 1];
              if (!snippet) return part;

              return (
                <CitationPopover
                  key={idx}
                  num={num}
                  snippet={snippet}
                  onMouseEnter={() => onHighlight(snippet)}
                  onMouseLeave={() => onHighlight(null)}
                />
              );
            })}
          </div>
          ) : (
            // 普通文本
            <div className="whitespace-pre-wrap">{content}</div>
          )}
        </div>
      </div>
    </div>
  );
}

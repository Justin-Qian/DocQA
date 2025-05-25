interface MessageItemProps {
  content: string;
  timestamp: string;
  isUser: boolean;
}

export default function MessageItem({ content, timestamp, isUser }: MessageItemProps) {
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
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
}

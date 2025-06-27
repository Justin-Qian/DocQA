"use client";
import { useState, useEffect } from "react";
import { useAuth } from '@clerk/nextjs';
import MessageItem from "@/components/MessageItem";

interface Message {
  content: string;
  timestamp: string;
  isUser: boolean;
  retrieved?: string[]; // Retrieved document snippets, optional
}

const ORIGINAL_TEXT = [
  "Plants need four important things to grow well: sunlight, water, air, and soil. These things work together to help the plant stay healthy, strong, and full of life. If one of them is missing, the plant might grow slowly or even stop growing. That's why people who care for plants need to understand what each part does.",
  "First, sunlight is like food for plants. Through a special process called photosynthesis, plants use sunlight to make energy. They take in the light with their leaves and turn it into food that helps them grow. Without enough sunlight, plants may become pale, weak, or small. That's why you often see plants placed near windows or growing outdoors where they can soak up the light.",
  "Next, plants need water, which they absorb through their roots. The water travels up through the plant's stem and reaches all parts of the plant, especially the leaves. Water helps carry nutrients and keeps the plant firm and upright. On hot or dry days, you may notice plants wilting or drooping—that's a sign they need water. Without enough, the plant can't grow properly and might even dry out.",
  "Air is just as important. Plants take in a gas from the air called carbon dioxide, which they also use during photosynthesis to make food. Without carbon dioxide, the plant wouldn't be able to complete this process. That's why most plants grow best in open spaces with fresh air, instead of in closed, stuffy places.",
  "Lastly, soil provides both support and nutrition. It holds the plant in place and is full of important minerals like nitrogen, potassium, and phosphorus. These nutrients help the plant grow taller, produce more leaves, and stay a healthy green color. Rich, healthy soil is one of the best things you can give a plant.",
  "When plants get enough sunlight, water, air, and nutrients from the soil, they can grow strong and healthy. But if even one of these is missing—too little light, dry soil, not enough air, or a lack of water—the plant may struggle. That's why people place their plants where they can get everything they need, whether it's a bright window, a well-watered garden, or a spot with fresh air and good soil."
];

export default function Home() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);          // Whether request/stream is in progress
  const [isWaitingResponse, setIsWaitingResponse] = useState(false); // Waiting for first packet
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null); // For aborting requests
  const [question, setQuestion] = useState("");
  const [references, setReferences] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [highlightedSnippet, setHighlightedSnippet] = useState<string | null>(null);// Highlight document paragraphs

  useEffect(() => {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  // Highlight document paragraphs
  const handleHighlight = (snippet: string | null) => {
    setHighlightedSnippet(snippet);
  };

  const handleReset = () => {
    setQuestion("");
    setReferences([]);
  };

  // Handle text selection and drag
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

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  async function handleAsk() {
    if (!question) return;

    const userQuestion = question;
    const userReferences = references;

    // Add user message
    const userMessage: Message = {
      content: userQuestion,
      timestamp: formatTime(),
      isUser: true
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setIsWaitingResponse(true);
    // Clear input and reference tags
    setQuestion("");
    setReferences([]);

    // Create AbortController for cancelling requests
    const controller = new AbortController();
    setAbortCtrl(controller);

    try {
      // 🔑 Get Clerk authentication token
      const token = await getToken();

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` // 🔑 Add authentication header
        },
        body: JSON.stringify({
          question: userQuestion,
          references: userReferences
        }),
        signal: controller.signal
      });

      // 🔑 Check authentication status
      if (res.status === 401) {
        throw new Error("Authentication failed, please log in again");
      }

      // AI reply message not yet inserted, wait for first token to arrive before inserting
      let isFirstToken = true;
      let currentContextDocs: string[] = [];

      // Handle streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        if (value) {
          const chunk = decoder.decode(value);
          // Split by lines, each line is a complete SSE message
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6)); // remove "data: " (the first 6 characters)

              // Process retrieved snippets
              if (data.type === 'context') {
                if (Array.isArray(data.top_docs)) {
                  currentContextDocs = data.top_docs;
                }
              }
              // Process tokens
              else if (data.type === 'token' && data.answer) {
                if (isFirstToken) {
                  // First token: create system message and close loading
                  setMessages(prev => [
                    ...prev,
                    {
                      content: data.answer,
                      timestamp: formatTime(),
                      isUser: false,
                      retrieved: currentContextDocs
                    }
                  ]);
                  setIsWaitingResponse(false); // First packet received, hide animation
                  isFirstToken = false;
                } else {
                  // Subsequent tokens: append content to last message
                  setMessages(prev => {
                    const msgs = [...prev];
                    const last = msgs[msgs.length - 1];
                    msgs[msgs.length - 1] = {
                      ...last,
                      content: last.content + data.answer
                    };
                    return msgs;
                  });
                }
              }
            }
          }
        }
      }

    } catch (err: unknown) {
      const error = err as { name?: string; message?: string } | undefined;
      // If it's an AbortError caused by user cancellation, handle silently
      if (error?.name === 'AbortError') {
        // Already aborted by user, no need to show message
      } else {
        console.error('Error:', error);
        // Add error message
        const errorMessage: Message = {
          content: error?.message?.includes("Authentication")
            ? "Authentication failed, please log in again"
            : "Sorry, an error occurred while processing your question. Please try again later.",
          timestamp: formatTime(),
          isUser: false
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setLoading(false);
      setIsWaitingResponse(false);
      setAbortCtrl(null);
    }
  }

  // Abort current request
  const handleAbort = () => {
    if (abortCtrl) {
      abortCtrl.abort();
      setAbortCtrl(null);
    }
    setQuestion("");
    setReferences([]);
  };

  return (
    <main className="h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      <div className="h-full px-16 py-6 flex flex-col max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 overflow-hidden">
          {/* Left side: Reading area */}
          <div className="bg-white rounded-lg shadow-md flex flex-col overflow-hidden">
            <h2 className="text-xl font-semibold p-6 border-b-2 border-gray-300 flex-shrink-0">Document</h2>
            <div
              className="prose max-w-none select-text p-6 overflow-y-auto"
              onMouseDown={handleMouseDown}
              onDragStart={handleDragStart}
            >
              {ORIGINAL_TEXT.map((text, index) => {
                let className = "indent-8 mb-4";
                if (highlightedSnippet && text.includes(highlightedSnippet)) {
                  className += " bg-yellow-200 font-bold italic";
                }
                return (
                  <p key={index} className={className}>
                    {text}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Right side: Chat area */}
          <div className="bg-white rounded-lg shadow-md flex flex-col overflow-hidden">

            {/* Message list */}
            <div className="p-6 overflow-y-auto flex-1 messages-container">
              {messages.map((message, index) => (
                <MessageItem
                  key={index}
                  content={message.content}
                  timestamp={message.timestamp}
                  isUser={message.isUser}
                  retrieved={message.retrieved}
                  onHighlight={handleHighlight}
                />
              ))}
              {isWaitingResponse && (
                <div className="flex justify-start mb-4">
                  <div className="w-4 h-4 bg-gray-800 rounded-full animate-pulse" />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="p-6 border-t-2 border-gray-300 flex-shrink-0">
              {/* Reference tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {references.map((ref, index) => (
                  <div key={index} className="relative group">
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
                    <div className="absolute left-0 bottom-full mb-2 p-2 bg-gray-100 text-black text-sm rounded shadow-lg
                                  invisible group-hover:visible w-48 z-10 whitespace-pre-wrap">
                      {ref}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input field */}
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
                    onKeyDown={(e) => {
                      if (loading) {
                        e.preventDefault();
                        handleAbort();
                        return;
                      }
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAsk();
                      }
                    }}
                    placeholder="Type your question here..."
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
                  onClick={loading ? handleAbort : handleAsk}
                  className={`px-6 py-2 rounded text-white ${loading ? 'bg-red-400 hover:bg-red-500' : 'bg-slate-600 hover:bg-slate-700'}`}
                >
                  {loading ? "Stop" : "Ask"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

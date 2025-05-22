"use client";
import { useState, useEffect } from "react";

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<Array<{ id: number; snippet: string }>>([]);
  const [pdfUrl, setPdfUrl] = useState<string>('');

  // Load PDF when component mounts
  useEffect(() => {
    setPdfUrl('/sample.pdf');
  }, []);

  const handleAsk = async () => {
    if (!question) return;

    try {
      setLoading(true);

      // Get PDF file
      const pdfResponse = await fetch('/sample.pdf');
      const pdfBlob = await pdfResponse.blob();
      const pdfFile = new File([pdfBlob], 'sample.pdf', { type: 'application/pdf' });

      // Create FormData with both PDF and question
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('question', question);

      // Send request
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to process question');
      }

      const data = await response.json();
      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error processing your question');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="mb-4">
          <h1 className="inline text-2xl font-bold">DocQA Demo 🌿</h1>
          <span className="ml-3 text-sm text-gray-500">by Yujia Qian</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF Viewer */}
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Document</h2>
            <div className="h-[800px] overflow-hidden rounded-lg border">
              {pdfUrl && (
                <iframe
                  src={pdfUrl}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              )}
            </div>
          </div>

          {/* Q&A Section */}
          <div className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Ask a Question</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={handleAsk}
                  disabled={!question || loading}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? 'Processing...' : 'Ask Question'}
                </button>
              </div>
            </div>

            {/* Answer Display Section */}
            {answer && (
              <div className="p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Answer</h2>
                <p className="whitespace-pre-wrap">{answer}</p>

                {sources.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Reference Sources</h3>
                    <div className="space-y-2">
                      {sources.map((source) => (
                        <div key={source.id} className="p-3 bg-gray-50 rounded">
                          <p className="text-sm">{source.snippet}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

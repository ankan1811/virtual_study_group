import { useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Sparkles, PenTool } from "lucide-react";

interface WhiteboardElement {
  type: string;
  text?: string;
  width: number;
  height: number;
}

interface WhiteboardExplainPanelProps {
  elements: WhiteboardElement[];
}

interface QA {
  question: string;
  answer: string;
}

export default function WhiteboardExplainPanel({
  elements,
}: WhiteboardExplainPanelProps) {
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const explainWhiteboard = async (userQuestion?: string) => {
    if (elements.length === 0) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    const question = userQuestion?.trim() || undefined;

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/whiteboard-explain`,
        { elements, question },
        { headers: { Authorization: token || "" } }
      );
      setQaHistory((prev) => [
        ...prev,
        {
          question: question || "Explain this whiteboard",
          answer: res.data.explanation,
        },
      ]);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        50
      );
    } catch {
      setQaHistory((prev) => [
        ...prev,
        {
          question: question || "Explain this whiteboard",
          answer: "Could not analyze the whiteboard. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
      setCustomPrompt("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      explainWhiteboard(customPrompt);
    }
  };

  // Empty state
  if (elements.length === 0 && qaHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center bg-gray-50 p-4">
        <div className="p-4 bg-teal-50 rounded-2xl">
          <PenTool size={28} className="text-teal-400" />
        </div>
        <p className="text-sm text-gray-500 poppins-regular">
          Draw something on the whiteboard, then ask AI to explain it
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
      {/* Q&A History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {qaHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="p-4 bg-teal-50 rounded-2xl">
              <Sparkles size={28} className="text-teal-400" />
            </div>
            <p className="text-sm text-gray-500 poppins-regular">
              Click "Explain" or ask a question about your drawing
            </p>
          </div>
        )}
        {qaHistory.map((qa, i) => (
          <div key={i} className="space-y-2">
            {/* Question */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-teal-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-sm text-sm poppins-regular shadow-sm">
                {qa.question}
              </div>
            </div>
            {/* Answer */}
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] bg-white border border-gray-100 px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-sm text-gray-800 poppins-regular shadow-sm leading-relaxed">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={11} className="text-teal-500" />
                    <span className="text-[10px] font-semibold text-teal-500 poppins-semibold">
                      AI Whiteboard
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{qa.answer}</p>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
              <Loader2 size={14} className="animate-spin text-teal-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        {/* Quick explain button */}
        <button
          onClick={() => explainWhiteboard()}
          disabled={loading || elements.length === 0}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <Sparkles size={14} /> Explain This
            </>
          )}
        </button>
        {/* Custom question */}
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Ask about the drawing..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent poppins-regular"
          />
          <button
            onClick={() => explainWhiteboard(customPrompt)}
            disabled={!customPrompt.trim() || loading}
            className="p-2.5 rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  Sparkles,
  FileText,
  Save,
  Check,
  ExternalLink,
} from "lucide-react";

interface Message {
  msg: string;
  sentby: string;
}

interface QA {
  question: string;
  answer: string;
}

interface AiPanelProps {
  tab: "ai" | "summary";
  chatMessages: Message[];
  roomId: string;
}

// Web Speech API type shim
type SpeechRecognitionAny = any;

export default function AiPanel({ tab, chatMessages, roomId }: AiPanelProps) {
  const [input, setInput] = useState("");
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionAny>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SpeechRecognitionAPI: any =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const startListening = () => {
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const askQuestion = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/ask`,
        { question },
        { headers: { Authorization: token || "" } }
      );
      setQaHistory((prev) => [...prev, { question, answer: res.data.answer }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err: any) {
      setQaHistory((prev) => [
        ...prev,
        {
          question,
          answer:
            err.response?.data?.answer ||
            "AI is unavailable right now. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    if (chatMessages.length === 0) {
      setSummary("No chat messages to summarize yet.");
      return;
    }
    setSummaryLoading(true);
    setSavedUrl(null);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/summary`,
        { messages: chatMessages },
        { headers: { Authorization: token || "" } }
      );
      setSummary(res.data.summary);
    } catch (err: any) {
      setSummary(
        err.response?.data?.summary ||
          "Could not generate summary. Please try again."
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const saveSummaryToR2 = async () => {
    if (!summary || saving) return;
    setSaving(true);
    setSavedUrl(null);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/ai/save-summary`,
        { summary, roomId },
        { headers: { Authorization: token || "" } }
      );
      setSavedUrl(res.data.url);
    } catch {
      setSavedUrl(null);
      alert("Failed to save summary. Please check R2 configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  if (tab === "summary") {
    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
        <div className="flex-1 overflow-y-auto p-4">
          {summary ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-violet-100 rounded-lg">
                  <FileText size={14} className="text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-gray-800 poppins-semibold">
                  Session Summary
                </p>
              </div>
              <p className="text-sm text-gray-700 poppins-regular leading-relaxed whitespace-pre-line">
                {summary}
              </p>

              {/* Save to R2 + download link */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                {savedUrl ? (
                  <motion.a
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    href={savedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold poppins-semibold hover:bg-emerald-100 transition-colors border border-emerald-200"
                  >
                    <Check size={14} />
                    Saved! View Summary
                    <ExternalLink size={12} />
                  </motion.a>
                ) : (
                  <button
                    onClick={saveSummaryToR2}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save Summary
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <div className="p-4 bg-violet-50 rounded-2xl">
                <FileText size={28} className="text-violet-400" />
              </div>
              <p className="text-sm text-gray-500 poppins-regular">
                Generate a summary of the current study session chat
              </p>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {summaryLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Generate Summary
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // AI Doubt Solver tab
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {qaHistory.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="p-4 bg-indigo-50 rounded-2xl">
              <Sparkles size={28} className="text-indigo-400" />
            </div>
            <p className="text-sm text-gray-500 poppins-regular">
              Ask any study question — AI will answer
            </p>
          </div>
        )}
        {qaHistory.map((qa, i) => (
          <div key={i} className="space-y-2">
            {/* Question */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-indigo-600 text-white px-3.5 py-2.5 rounded-2xl rounded-br-sm text-sm poppins-regular shadow-sm">
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
                    <Sparkles size={11} className="text-indigo-500" />
                    <span className="text-[10px] font-semibold text-indigo-500 poppins-semibold">
                      AI Assistant
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
              <Loader2 size={14} className="animate-spin text-indigo-400" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-100 flex gap-2 items-center">
        {SpeechRecognitionAPI && (
          <button
            onClick={isListening ? stopListening : startListening}
            className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${
              isListening
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            title={isListening ? "Stop listening" : "Voice input"}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
          </button>
        )}
        <input
          type="text"
          placeholder="Ask a study question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent poppins-regular"
        />
        <button
          onClick={askQuestion}
          disabled={!input.trim() || loading}
          className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  Sparkles,
  BookOpen,
  Lightbulb,
  FlaskConical,
  Code2,
} from "lucide-react";
import Navbar from "../components/Navbar";

interface QA {
  question: string;
  answer: string;
}

type SpeechRecognitionAny = any;

const suggestions = [
  { icon: Code2, label: "Explain recursion with a simple example", color: "from-indigo-500 to-blue-500" },
  { icon: Lightbulb, label: "What is Big O notation?", color: "from-amber-500 to-orange-500" },
  { icon: FlaskConical, label: "Help me understand chemical bonding", color: "from-emerald-500 to-teal-500" },
  { icon: BookOpen, label: "Summarize the French Revolution", color: "from-rose-500 to-pink-500" },
];

export default function AskAiPage() {
  const [input, setInput] = useState("");
  const [qaHistory, setQaHistory] = useState<QA[]>([]);
  const [loading, setLoading] = useState(false);
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

  const askQuestion = async (questionOverride?: string) => {
    const question = (questionOverride || input).trim();
    if (!question || loading) return;
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-gray-50 dark:from-gray-950 dark:via-indigo-950/20 dark:to-gray-950 transition-colors">
      <Navbar />

      {/* Floating background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[8%] w-[400px] h-[400px] rounded-full bg-indigo-400/10 dark:bg-indigo-500/5 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -30, 25, 0], y: [0, 25, -35, 0], scale: [1, 0.9, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] right-[5%] w-[350px] h-[350px] rounded-full bg-violet-400/10 dark:bg-violet-500/5 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 20, -15, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[15%] left-[25%] w-[300px] h-[300px] rounded-full bg-purple-400/8 dark:bg-purple-500/5 blur-3xl"
        />
      </div>

      <main className="pt-20 px-4 pb-6 max-w-4xl mx-auto relative" style={{ height: "calc(100vh - 0.5rem)" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="flex flex-col h-full bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-gray-200/60 dark:border-white/10 shadow-2xl shadow-indigo-500/5 rounded-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Sparkles size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl poppins-bold text-gray-900 dark:text-white">
                  AI Study Assistant
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 poppins-regular">
                  Ask anything — get instant, clear explanations
                </p>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {qaHistory.length === 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center justify-center h-full gap-6"
              >
                {/* Empty state hero */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 flex items-center justify-center">
                    <Sparkles size={40} className="text-indigo-500 dark:text-indigo-400" />
                  </div>
                </motion.div>
                <div className="text-center">
                  <h2 className="text-lg poppins-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 mb-1">
                    What do you want to learn?
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular">
                    Ask a question or pick a topic below
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, type: "spring", damping: 28, stiffness: 220 }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => askQuestion(s.label)}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-shadow text-left group"
                    >
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        <s.icon size={16} className="text-white" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 poppins-medium group-hover:text-gray-900 dark:group-hover:text-white transition-colors line-clamp-2">
                        {s.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Q&A history */}
            {qaHistory.map((qa, i) => (
              <div key={i} className="space-y-3">
                {/* User question */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 220 }}
                  className="flex justify-end"
                >
                  <div className="max-w-[75%] bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm poppins-regular shadow-md shadow-indigo-500/15">
                    {qa.question}
                  </div>
                </motion.div>
                {/* AI answer */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 220, delay: 0.05 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[85%] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-gray-800 dark:text-gray-200 poppins-regular shadow-sm leading-relaxed">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <Sparkles size={10} className="text-white" />
                      </div>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 poppins-semibold">
                        AI Assistant
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{qa.answer}</p>
                  </div>
                </motion.div>
              </div>
            ))}

            {/* Typing indicator */}
            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 px-5 py-3.5 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 mr-1">
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                        <Sparkles size={10} className="text-white" />
                      </div>
                    </div>
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 rounded-full bg-indigo-400"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 rounded-full bg-indigo-400"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 rounded-full bg-indigo-400"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl">
            <div className="flex gap-2 items-center max-w-3xl mx-auto">
              {SpeechRecognitionAPI && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={isListening ? stopListening : startListening}
                  className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                    isListening
                      ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shadow-md shadow-red-500/10 ring-2 ring-red-300 dark:ring-red-800"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                  title={isListening ? "Stop listening" : "Voice input"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </motion.button>
              )}
              <input
                type="text"
                placeholder="Ask any study question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-600 focus:border-transparent poppins-regular placeholder-gray-400 dark:placeholder-gray-500 transition-all"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => askQuestion()}
                disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex-shrink-0"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

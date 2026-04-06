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
  Zap,
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
    <div className="min-h-screen bg-gray-950 transition-colors">
      <Navbar />

      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 30%, rgba(99,102,241,0.08) 0%, transparent 60%), " +
              "radial-gradient(ellipse at 80% 60%, rgba(139,92,246,0.06) 0%, transparent 50%), " +
              "radial-gradient(ellipse at 50% 90%, rgba(34,211,238,0.04) 0%, transparent 40%)",
          }}
        />
        <motion.div
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[8%] w-[400px] h-[400px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -30, 25, 0], y: [0, 25, -35, 0], scale: [1, 0.9, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] right-[5%] w-[350px] h-[350px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)" }}
        />
      </div>

      <main
        className="relative pt-20 px-4 pb-6 max-w-5xl mx-auto flex flex-col"
        style={{ height: "calc(100vh - 0.5rem)" }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 mb-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 0 24px rgba(99,102,241,0.35)",
              }}
            >
              <Sparkles size={20} className="text-white" />
            </div>
            <h1
              className="text-2xl poppins-bold"
              style={{
                background: "linear-gradient(135deg, #a5b4fc, #ffffff 60%, #c4b5fd)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              AI Study Assistant
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-[52px]">
            Ask anything — get instant, clear explanations
          </p>
        </motion.div>

        {/* Messages area */}
        <div
          className="flex-1 overflow-y-auto px-4 md:px-6 py-5 space-y-5 rounded-2xl scrollbar-thin scrollbar-thumb-gray-800"
          style={{
            background: qaHistory.length > 0 ? "rgba(255,255,255,0.02)" : "transparent",
            border: qaHistory.length > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}
        >
          {/* Empty state */}
          {qaHistory.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex flex-col items-center justify-center h-full"
            >
              {/* Decorative rings + floating icon */}
              <div className="relative mb-8">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {[120, 200, 280].map((size, i) => (
                    <motion.div
                      key={i}
                      animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                      transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
                      className="absolute rounded-full border border-dashed"
                      style={{
                        width: size,
                        height: size,
                        borderColor: `rgba(139,92,246,${0.08 - i * 0.02})`,
                      }}
                    />
                  ))}
                </div>

                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-block"
                >
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto"
                    style={{
                      background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
                      border: "1px solid rgba(99,102,241,0.2)",
                      boxShadow: "0 0 50px rgba(99,102,241,0.15)",
                    }}
                  >
                    <Sparkles size={36} className="text-violet-400" />
                  </div>
                </motion.div>
              </div>

              {/* Heading */}
              <h2
                className="text-xl poppins-bold mb-2"
                style={{
                  background: "linear-gradient(135deg, #a5b4fc, #ffffff 60%, #c4b5fd)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                What do you want to learn?
              </h2>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto text-center">
                Ask a question or pick a topic below
              </p>

              {/* Feature badges */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {[
                  { icon: Zap, label: "Instant answers" },
                  { icon: BookOpen, label: "Study help" },
                  { icon: Sparkles, label: "Any subject" },
                ].map((feat, i) => (
                  <motion.div
                    key={feat.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <feat.icon size={14} className="text-violet-400" />
                    <span className="text-xs text-gray-400 poppins-medium">{feat.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Suggestion chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, type: "spring", damping: 28, stiffness: 220 }}
                    whileHover={{ y: -6, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => askQuestion(s.label)}
                    className="relative group cursor-pointer rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <div className={`h-1 w-full bg-gradient-to-r ${s.color}`} />
                    <div className="flex items-center gap-3 px-4 py-3.5 text-left">
                      <div
                        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}
                        style={{ boxShadow: "0 0 16px rgba(99,102,241,0.2)" }}
                      >
                        <s.icon size={16} className="text-white" />
                      </div>
                      <span className="text-sm text-gray-300 poppins-medium group-hover:text-white transition-colors line-clamp-2">
                        {s.label}
                      </span>
                    </div>
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
                <div
                  className="max-w-[75%] px-4 py-3 rounded-2xl rounded-br-sm text-sm poppins-regular text-white shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    boxShadow: "0 0 20px rgba(99,102,241,0.25)",
                  }}
                >
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
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-gray-200 poppins-regular leading-relaxed"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                        boxShadow: "0 0 8px rgba(99,102,241,0.3)",
                      }}
                    >
                      <Sparkles size={10} className="text-white" />
                    </div>
                    <span className="text-[11px] poppins-semibold text-violet-400">
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
                <div
                  className="px-5 py-3.5 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center mr-1"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-violet-400"
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-violet-400"
                  />
                  <motion.span
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-violet-400"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 px-2 py-4">
          <div
            className="flex gap-2 items-center max-w-3xl mx-auto px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(24px)",
            }}
          >
            {SpeechRecognitionAPI && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={isListening ? stopListening : startListening}
                className="p-2.5 rounded-xl transition-all flex-shrink-0"
                style={{
                  background: isListening ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.06)",
                  border: isListening
                    ? "1px solid rgba(239,68,68,0.3)"
                    : "1px solid rgba(255,255,255,0.08)",
                  color: isListening ? "#f87171" : "rgba(255,255,255,0.4)",
                }}
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
              className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-100 focus:outline-none poppins-regular placeholder-gray-500"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => askQuestion()}
              disabled={!input.trim() || loading}
              className="p-2.5 rounded-xl text-white flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: !input.trim() || loading ? "none" : "0 0 16px rgba(99,102,241,0.3)",
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}

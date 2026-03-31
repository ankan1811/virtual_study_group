import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  FileText,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Users,
  PenTool,
  Sparkles,
  Send,
  AlertCircle,
  Download,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";

const API = import.meta.env.VITE_API_URL;

type SummaryType = "room" | "dm" | "whiteboard";

interface SummaryItem {
  _id: string;
  type: SummaryType;
  contextId: string;
  contextLabel: string;
  title: string;
  content: string;
  r2Key?: string;
  createdAt: string;
}

interface QaSource {
  _id: string;
  title: string;
  type: SummaryType;
  createdAt: string;
  score: number;
}

const subTabs: { key: SummaryType; label: string; icon: typeof MessageCircle }[] = [
  { key: "room", label: "Room Chat", icon: MessageCircle },
  { key: "dm", label: "DM Chat", icon: Users },
  { key: "whiteboard", label: "Whiteboard", icon: PenTool },
];

const typeBadgeColors: Record<SummaryType, string> = {
  room: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400",
  dm: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  whiteboard: "bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400",
};

const suggestions = [
  "What topics did I study this week?",
  "Summarize my recent sessions",
  "What questions came up in my last study session?",
];

export default function SummariesPage() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s: AuthState) => s.auth.isAuthenticated);

  const [activeTab, setActiveTab] = useState<SummaryType>("room");
  const [summaries, setSummaries] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Q&A state
  const [qaOpen, setQaOpen] = useState(false);
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);
  const [qaSources, setQaSources] = useState<QaSource[]>([]);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchSummaries(activeTab);
  }, [isAuthenticated, activeTab]);

  const fetchSummaries = async (type: SummaryType) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/ai/summaries?type=${type}`, {
        headers: { Authorization: token || "" },
      });
      setSummaries(res.data.summaries);
    } catch (err) {
      console.error("Failed to fetch summaries:", err);
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/ai/summaries/${id}`, {
        headers: { Authorization: token || "" },
      });
      setSummaries((prev) => prev.filter((s) => s._id !== id));
    } catch (err) {
      console.error("Failed to delete summary:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (id: string) => {
    setDownloadingId(id);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API}/ai/summaries/${id}/download`, {
        headers: { Authorization: token || "" },
      });
      if (res.data.url) {
        window.open(res.data.url, "_blank");
      }
    } catch (err) {
      console.error("Failed to download summary:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAskQuestion = async (question: string) => {
    if (!question.trim()) return;
    setQaLoading(true);
    setQaAnswer(null);
    setQaSources([]);
    setQaError(null);
    setQaQuestion(question);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API}/ai/summary-qa`,
        { question: question.trim() },
        { headers: { Authorization: token || "" } }
      );
      setQaAnswer(res.data.answer);
      setQaSources(res.data.sources || []);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        "Something went wrong. Please try again.";
      setQaError(msg);
    } finally {
      setQaLoading(false);
    }
  };

  const handleQaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAskQuestion(qaQuestion);
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white poppins-semibold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50">
              <FileText
                size={22}
                className="text-violet-600 dark:text-violet-400"
              />
            </div>
            Summaries
          </h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 poppins-regular">
            Your saved session summaries
          </p>
        </motion.div>

        {/* Q&A Panel */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="mb-5"
        >
          {/* Toggle bar */}
          <button
            onClick={() => setQaOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-200/60 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-700 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles
                size={16}
                className="text-violet-500 dark:text-violet-400"
              />
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300 poppins-semibold">
                Ask about your summaries
              </span>
            </div>
            {qaOpen ? (
              <ChevronUp
                size={16}
                className="text-violet-400 dark:text-violet-500"
              />
            ) : (
              <ChevronDown
                size={16}
                className="text-violet-400 dark:text-violet-500"
              />
            )}
          </button>

          {/* Expandable panel */}
          <AnimatePresence>
            {qaOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="mt-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  {/* Input */}
                  <form onSubmit={handleQaSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={qaQuestion}
                      onChange={(e) => setQaQuestion(e.target.value)}
                      placeholder="e.g., What did we discuss about React?"
                      disabled={qaLoading}
                      className="flex-1 px-3.5 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white poppins-regular placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-600 disabled:opacity-50 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={qaLoading || !qaQuestion.trim()}
                      className="px-3.5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold poppins-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      {qaLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </form>

                  {/* Suggestions */}
                  {!qaAnswer && !qaLoading && !qaError && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setQaQuestion(s);
                            handleAskQuestion(s);
                          }}
                          className="px-3 py-1.5 rounded-full text-[11px] font-medium poppins-medium bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-800/40 hover:bg-violet-100 dark:hover:bg-violet-950/60 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Loading */}
                  {qaLoading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 poppins-regular">
                      <Loader2 size={14} className="animate-spin" />
                      Searching your summaries...
                    </div>
                  )}

                  {/* Error */}
                  {qaError && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40"
                    >
                      <AlertCircle
                        size={14}
                        className="text-amber-500 mt-0.5 flex-shrink-0"
                      />
                      <p className="text-xs text-amber-700 dark:text-amber-400 poppins-regular">
                        {qaError}
                      </p>
                    </motion.div>
                  )}

                  {/* Answer */}
                  {qaAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4"
                    >
                      <p className="text-[13px] text-gray-700 dark:text-gray-300 poppins-regular whitespace-pre-line leading-relaxed">
                        {qaAnswer}
                      </p>

                      {/* Sources */}
                      {qaSources.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 poppins-semibold mb-1.5 tracking-wide">
                            Sources
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {qaSources.map((src) => (
                              <span
                                key={src._id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold poppins-semibold ${typeBadgeColors[src.type]}`}
                              >
                                {src.type === "room" ? (
                                  <MessageCircle size={10} />
                                ) : src.type === "dm" ? (
                                  <Users size={10} />
                                ) : (
                                  <PenTool size={10} />
                                )}
                                {src.title.length > 30
                                  ? src.title.slice(0, 30) + "..."
                                  : src.title}
                                <span className="opacity-60">
                                  {formatDate(src.createdAt)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sub-tabs */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-1 mb-5 p-1 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800"
        >
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold poppins-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 shadow-sm"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Summaries list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-violet-500" />
          </div>
        ) : summaries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <FileText
                size={28}
                className="text-gray-400 dark:text-gray-500"
              />
            </div>
            <p className="text-gray-500 dark:text-gray-400 poppins-regular text-sm">
              No {subTabs.find((t) => t.key === activeTab)?.label.toLowerCase()}{" "}
              summaries yet
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {summaries.map((s, i) => {
                const isExpanded = expandedId === s._id;
                return (
                  <motion.div
                    key={s._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="px-4 py-3.5 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full poppins-semibold ${typeBadgeColors[s.type]}`}
                          >
                            {s.type}
                          </span>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 poppins-regular">
                            {formatTime(s.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold truncate">
                          {s.title}
                        </h3>
                        {s.contextLabel && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 poppins-regular mt-0.5">
                            {s.contextLabel}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleDownload(s._id)}
                          disabled={downloadingId === s._id}
                          className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 text-gray-400 hover:text-violet-500 transition-colors disabled:opacity-40"
                          title="Download summary"
                        >
                          {downloadingId === s._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => toggleExpand(s._id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(s._id)}
                          disabled={deletingId === s._id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Delete summary"
                        >
                          {deletingId === s._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Preview / expanded content */}
                    <div className="px-4 pb-3.5">
                      <p
                        className={`text-[13px] text-gray-600 dark:text-gray-400 poppins-regular whitespace-pre-line ${
                          isExpanded ? "" : "line-clamp-3"
                        }`}
                      >
                        {s.content}
                      </p>
                      {!isExpanded && s.content.split("\n").length > 3 && (
                        <button
                          onClick={() => toggleExpand(s._id)}
                          className="text-[11px] text-violet-600 dark:text-violet-400 poppins-medium mt-1 hover:underline"
                        >
                          View full summary
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

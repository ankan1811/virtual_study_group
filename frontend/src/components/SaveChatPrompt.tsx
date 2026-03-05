import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Loader2 } from "lucide-react";

interface SaveChatPromptProps {
  isOpen: boolean;
  messageCount: number;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}

export default function SaveChatPrompt({
  isOpen,
  messageCount,
  onSave,
  onDiscard,
}: SaveChatPromptProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 22, stiffness: 200 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Card */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-80">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <MessageSquare size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 poppins-semibold">
                    Save your chat messages?
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 poppins-regular">
                    You have{" "}
                    <span className="font-medium text-indigo-600">
                      {messageCount}
                    </span>{" "}
                    {messageCount === 1 ? "message" : "messages"} from this
                    session
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Exit"
                  )}
                </button>
                <button
                  onClick={onDiscard}
                  disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium poppins-regular hover:bg-gray-200 transition-colors disabled:opacity-60"
                >
                  Exit without saving
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

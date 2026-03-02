import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch } from "react-redux";
import { getSocket } from "../utils/socketInstance";
import { addCompanion, removePendingRequest } from "../store/companionStore/companionSlice";
import axios from "axios";
import { UserPlus, X } from "lucide-react";

interface CompanionRequest {
  requesterId: string;
  requesterName: string;
}

export default function CompanionRequestOverlay() {
  const dispatch = useDispatch();
  const [queue, setQueue] = useState<CompanionRequest[]>([]);
  const current = queue[0] ?? null;

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleRequest = (data: CompanionRequest) => {
      setQueue((prev) => {
        const exists = prev.some((r) => r.requesterId === data.requesterId);
        return exists ? prev : [...prev, data];
      });
    };

    socket.on("companion:requestReceived", handleRequest);
    return () => {
      socket.off("companion:requestReceived", handleRequest);
    };
  }, []);

  const dismiss = () => setQueue((prev) => prev.slice(1));

  const handleAccept = async () => {
    if (!current) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/companion/accept`,
        { requesterId: current.requesterId },
        { headers: { Authorization: token || "" } }
      );
      const socket = getSocket();
      socket?.emit("companion:acceptNotify", { requesterId: current.requesterId });
      dispatch(addCompanion({ userId: current.requesterId, name: current.requesterName }));
      dispatch(removePendingRequest(current.requesterId));
    } catch (err) {
      console.error("Accept companion error:", err);
    }
    dismiss();
  };

  const handleDecline = async () => {
    if (!current) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/companion/decline`,
        { requesterId: current.requesterId },
        { headers: { Authorization: token || "" } }
      );
    } catch (err) {
      console.error("Decline companion error:", err);
    }
    dismiss();
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.requesterId}
          initial={{ opacity: 0, y: -80, x: "50%" }}
          animate={{ opacity: 1, y: 0, x: "50%" }}
          exit={{ opacity: 0, y: -80, x: "50%" }}
          transition={{ type: "spring", damping: 22, stiffness: 200 }}
          className="fixed top-20 right-1/2 z-[100] w-80"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-xl">
                    <UserPlus size={18} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 poppins-semibold">
                      Companion Request
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 poppins-regular">
                      <span className="font-medium text-emerald-600">{current.requesterName}</span>
                      {" "}wants to be your study companion
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDecline}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAccept}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity"
                >
                  Accept
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium poppins-regular hover:bg-gray-200 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

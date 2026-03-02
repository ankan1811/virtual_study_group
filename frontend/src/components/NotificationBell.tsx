import React, { useEffect, useRef, useState } from "react";
import { Bell, UserPlus, UserCheck, DoorOpen, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { AuthState } from "../store/authStore/store";
import {
  AppNotification,
  setNotifications,
  addNotification,
  markOneRead,
  markAllReadLocal,
  removeNotification,
} from "../store/notificationStore/notificationSlice";
import { getSocket } from "../utils/socketInstance";

const API = import.meta.env.VITE_API_URL as string;

function typeIcon(type: AppNotification["type"]) {
  if (type === "companion_request")
    return <UserPlus size={14} className="text-emerald-600" />;
  if (type === "companion_accepted")
    return <UserCheck size={14} className="text-indigo-600" />;
  return <DoorOpen size={14} className="text-violet-600" />;
}

function typeBg(type: AppNotification["type"]) {
  if (type === "companion_request") return "bg-emerald-100 dark:bg-emerald-900/40";
  if (type === "companion_accepted") return "bg-indigo-100 dark:bg-indigo-900/40";
  return "bg-violet-100 dark:bg-violet-900/40";
}

function typeLabel(n: AppNotification) {
  if (n.type === "companion_request")
    return (
      <>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{n.fromUserName}</span>
        {" sent you a companion request"}
      </>
    );
  if (n.type === "companion_accepted")
    return (
      <>
        <span className="font-semibold text-gray-800 dark:text-gray-200">{n.fromUserName}</span>
        {" accepted your companion request"}
      </>
    );
  return (
    <>
      <span className="font-semibold text-gray-800 dark:text-gray-200">{n.fromUserName}</span>
      {" invited you to their study room"}
    </>
  );
}

export default function NotificationBell() {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = useSelector((s: AuthState) => s.auth.isAuthenticated);
  const items = useSelector((s: AuthState) => s.notification.items);
  const unread = items.filter((n) => !n.read).length;

  // Fetch on mount / auth change
  useEffect(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("token");
    axios
      .get(`${API}/notifications`, { headers: { Authorization: token || "" } })
      .then((res) => dispatch(setNotifications(res.data.notifications)))
      .catch(() => {});
  }, [isAuthenticated]);

  // Real-time new notification via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif: AppNotification) => dispatch(addNotification(notif));
    socket.on("notification:new", handler);
    return () => { socket.off("notification:new", handler); };
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    dispatch(markOneRead(id));
    const token = localStorage.getItem("token");
    await axios
      .patch(`${API}/notifications/${id}/read`, {}, { headers: { Authorization: token || "" } })
      .catch(() => {});
  };

  const handleMarkAll = async () => {
    dispatch(markAllReadLocal());
    const token = localStorage.getItem("token");
    await axios
      .patch(`${API}/notifications/read-all`, {}, { headers: { Authorization: token || "" } })
      .catch(() => {});
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    dispatch(removeNotification(id));
    const token = localStorage.getItem("token");
    await axios
      .delete(`${API}/notifications/${id}`, { headers: { Authorization: token || "" } })
      .catch(() => {});
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <Bell size={20} className="text-gray-700 dark:text-gray-200" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] font-bold px-1 leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ type: "spring", damping: 24, stiffness: 300 }}
            className="absolute right-0 top-12 z-50 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            {/* Header */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold">
                Notifications
                {unread > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                    {unread} new
                  </span>
                )}
              </span>
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors poppins-regular"
                >
                  <Check size={12} />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700/50">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
                  <Bell size={28} className="mb-2 opacity-30" />
                  <p className="text-xs poppins-regular">No notifications yet</p>
                </div>
              ) : (
                items.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => !notif.read && handleMarkRead(notif._id)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors group
                      ${notif.read
                        ? "hover:bg-gray-50 dark:hover:bg-gray-700/30"
                        : "bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                      }`}
                  >
                    {/* Icon */}
                    <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${typeBg(notif.type)}`}>
                      {typeIcon(notif.type)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600 dark:text-gray-400 poppins-regular leading-snug">
                        {typeLabel(notif)}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 poppins-regular">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>

                    {/* Unread dot + delete */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                      )}
                      <button
                        onClick={(e) => handleDelete(e, notif._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-center">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 poppins-regular">
                  Notifications auto-delete after 10 days
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

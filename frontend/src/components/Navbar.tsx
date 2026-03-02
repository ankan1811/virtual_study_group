import React, { useState } from "react";
import Logo from "../assets/logo.svg";
import { Link, useLocation } from "react-router-dom";
import {
  LogIn,
  LogOut,
  Home,
  Video,
  Bot,
  Mail,
  X,
  Menu,
  ChevronRight,
  DoorOpen,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AuthState } from "../store/authStore/store";
import { logout } from "../store/authStore/authSlice";
import { enterRoom } from "../store/RoomStore/roomSlice";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { title: "Home", path: "/home", icon: Home },
  { title: "My Room", path: "/room/call", icon: DoorOpen },
  { title: "Streaming", path: "/stream", icon: Video },
  { title: "Ask AI", path: "/ask", icon: Bot },
  { title: "Contact us", path: "/contact", icon: Mail },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const isAuthenticated = useSelector(
    (state: AuthState) => state.auth.isAuthenticated
  );
  const user = useSelector((state: AuthState) => state.auth.user);

  const close = () => setIsOpen(false);

  const handleNavClick = (path: string) => {
    if (path === "/room/call" && user?.roomId) {
      dispatch(enterRoom({ roomId: user.roomId, isOwner: true }));
    }
    close();
  };

  return (
    <>
      {/* Floating menu toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
      >
        <Menu size={22} className="text-gray-700" />
      </button>

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            key="sidebar"
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed left-0 top-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Decorative gradient strip at top */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <img alt="Logo" src={Logo} className="h-8" />
              <button
                onClick={close}
                aria-label="Close menu"
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav label */}
            <p className="px-5 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 poppins-semibold">
              Navigation
            </p>

            {/* Nav items */}
            <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={isAuthenticated ? item.path : "/login"}
                    onClick={() => handleNavClick(item.path)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group poppins-regular text-sm font-medium
                      ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-indigo-700"
                      }`}
                  >
                    <span
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="flex-1">{item.title}</span>
                    <ChevronRight
                      size={14}
                      className={`transition-opacity text-indigo-400 ${
                        isActive ? "opacity-100" : "opacity-0 group-hover:opacity-60"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-gray-100 bg-gray-50/60">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    dispatch(logout());
                    close();
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all duration-150 group poppins-regular text-sm font-medium"
                >
                  <span className="p-1.5 rounded-lg bg-red-50 text-red-400 group-hover:bg-red-100 transition-colors">
                    <LogOut size={16} />
                  </span>
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={close}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all duration-150 group poppins-regular text-sm font-medium"
                >
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                    <LogIn size={16} />
                  </span>
                  Login
                </Link>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

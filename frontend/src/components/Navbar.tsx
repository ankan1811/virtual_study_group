import { useState } from "react";
import Logo from "../assets/logo.svg";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LogIn,
  LogOut,
  Home,
  Bot,
  Mail,
  X,
  Menu,
  ChevronRight,
  DoorOpen,
  MessageCircle,
  Moon,
  Sun,
  User,
  Settings,
  BookOpen,
  Headphones,
  FileText,
  Mic2,
  Clock,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { AuthState } from "../store/authStore/store";
import { logout } from "../store/authStore/authSlice";
import { enterRoom } from "../store/RoomStore/roomSlice";
import { motion, AnimatePresence } from "framer-motion";
import { useDarkMode } from "../utils/useDarkMode";
import { disconnectSocket } from "../utils/socketInstance";
import { getAvatarById } from "../utils/avatars";
import NotificationBell from "./NotificationBell";

const navItems = [
  { title: "Home", path: "/home", icon: Home },
  { title: "Chats", path: "/chats", icon: MessageCircle },
  { title: "Summaries", path: "/summaries", icon: FileText },
  { title: "Sessions", path: "/sessions", icon: Clock },
  { title: "My Room", path: "/room/call", icon: DoorOpen },
  { title: "Ask AI", path: "/ask", icon: Bot },
  { title: "Study Radio", path: "/radio", icon: Headphones },
  { title: "Podcasts", path: "/podcasts", icon: Mic2 },
  { title: "Contact us", path: "/contact", icon: Mail },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggle: toggleDark } = useDarkMode();
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

  const getInitials = (name: string) =>
    name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const userAvatar = user?.avatar ? getAvatarById(user.avatar) : null;

  return (
    <>
      {/* Floating menu toggle + dark mode toggle */}
      <div className="fixed top-3 left-0 w-16 z-50 flex flex-col items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <Menu size={22} className="text-gray-700 dark:text-gray-200" />
        </button>
        <button
          onClick={toggleDark}
          aria-label="Toggle dark mode"
          className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {isDark ? (
            <Sun size={20} className="text-amber-400" />
          ) : (
            <Moon size={20} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* ── Notification bell + profile avatar — top right ──────────────────── */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <NotificationBell />
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${userAvatar ? userAvatar.gradient : "from-indigo-500 to-violet-600"} flex items-center justify-center ${userAvatar ? "text-xl" : "text-white text-sm font-bold poppins-semibold"} shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 ring-2 ring-white/20 dark:ring-white/10`}
            >
              {userAvatar ? userAvatar.emoji : getInitials(user.name)}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {showProfile && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfile(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -8 }}
                    transition={{ type: "spring", damping: 24, stiffness: 300 }}
                    className="absolute right-0 top-12 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 w-56 overflow-hidden"
                  >
                    <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />

                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${userAvatar ? userAvatar.gradient : "from-indigo-500 to-violet-600"} flex items-center justify-center ${userAvatar ? "text-lg" : "text-white text-xs font-bold poppins-semibold"} flex-shrink-0`}>
                          {userAvatar ? userAvatar.emoji : getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 poppins-semibold truncate">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 poppins-regular">
                            Student
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div className="py-1.5">
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate("/profile");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors poppins-regular"
                      >
                        <User size={15} className="text-gray-400" />
                        My Profile
                      </button>
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate("/settings");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors poppins-regular"
                      >
                        <Settings size={15} className="text-gray-400" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          if (user.roomId) {
                            dispatch(enterRoom({ roomId: user.roomId, isOwner: true }));
                            navigate("/room/call");
                          }
                          setShowProfile(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors poppins-regular"
                      >
                        <DoorOpen size={15} className="text-gray-400" />
                        My Room
                      </button>
                      <button
                        onClick={() => {
                          setShowProfile(false);
                          navigate("/ask");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors poppins-regular"
                      >
                        <BookOpen size={15} className="text-gray-400" />
                        Ask AI
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 dark:border-gray-700 py-1.5">
                      <button
                        onClick={() => {
                          localStorage.removeItem("token");
                          disconnectSocket();
                          dispatch(logout());
                          setShowProfile(false);
                          navigate("/login");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors poppins-regular"
                      >
                        <LogOut size={15} />
                        Logout
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <Link
            to="/login"
            className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <LogIn size={18} className="text-gray-500 dark:text-gray-400" />
          </Link>
        )}
      </div>

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
            className="fixed left-0 top-0 h-full w-72 bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Decorative gradient strip at top */}
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <img alt="Logo" src={Logo} className="h-8 dark:invert" />
              <button
                onClick={close}
                aria-label="Close menu"
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav label */}
            <p className="px-5 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 poppins-semibold">
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
                          ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-indigo-700 dark:hover:text-indigo-400"
                      }`}
                  >
                    <span
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive
                          ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="flex-1">{item.title}</span>
                    <ChevronRight
                      size={14}
                      className={`transition-opacity text-indigo-400 ${
                        isActive
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-60"
                      }`}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Dark mode toggle in sidebar */}
            <div className="px-3 py-2">
              <button
                onClick={toggleDark}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 group poppins-regular text-sm font-medium"
              >
                <span className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                </span>
                <span className="flex-1">
                  {isDark ? "Light Mode" : "Dark Mode"}
                </span>
              </button>
            </div>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/60">
              {isAuthenticated ? (
                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    disconnectSocket();
                    dispatch(logout());
                    close();
                    navigate("/login");
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-150 group poppins-regular text-sm font-medium"
                >
                  <span className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                    <LogOut size={16} />
                  </span>
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={close}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all duration-150 group poppins-regular text-sm font-medium"
                >
                  <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors">
                    <LogIn size={16} />
                  </span>
                  Login / Register
                </Link>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}

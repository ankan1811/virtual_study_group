import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Moon,
  Sun,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Globe,
  Monitor,
  Shield,
  Palette,
  Info,
  ChevronRight,
  ExternalLink,
  Heart,
  User as UserIcon,
  LogOut as LogOutIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";
import { logout } from "../store/authStore/authSlice";
import { useDarkMode } from "../utils/useDarkMode";
import { disconnectSocket } from "../utils/socketInstance";

/* ── animation constants ── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", damping: 28, stiffness: 220 },
  },
};

/* ── sub-components ── */

interface SettingToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  accentColor?: string;
  accentGlow?: string;
  iconBg?: string;
  iconText?: string;
}

function SettingToggle({
  icon,
  label,
  description,
  enabled,
  onToggle,
  accentColor,
  accentGlow,
  iconBg,
  iconText,
}: SettingToggleProps) {
  return (
    <motion.div variants={cardVariants} className="flex items-center justify-between py-4 group">
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            iconBg || "bg-gray-100 dark:bg-gray-800"
          } ${iconText || "text-gray-500"}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 poppins-semibold">
            {label}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular mt-0.5">
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-[52px] h-7 rounded-full transition-all flex-shrink-0 ml-3 ${
          enabled ? accentColor || "bg-indigo-500" : "bg-gray-200 dark:bg-gray-700"
        }`}
        style={{
          boxShadow: enabled
            ? `0 0 12px ${accentGlow || "rgba(99,102,241,0.35)"}`
            : "none",
        }}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md ${
            enabled ? "left-[24px]" : "left-0.5"
          }`}
        />
      </button>
    </motion.div>
  );
}

interface SettingLinkProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
  external?: boolean;
  iconBg?: string;
  iconText?: string;
}

function SettingLink({
  icon,
  label,
  description,
  onClick,
  external,
  iconBg,
  iconText,
}: SettingLinkProps) {
  return (
    <motion.button
      variants={cardVariants}
      onClick={onClick}
      className="flex items-center justify-between py-4 w-full text-left group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            iconBg || "bg-gray-100 dark:bg-gray-800"
          } ${iconText || "text-gray-500"}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 poppins-semibold">
            {label}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular mt-0.5">
            {description}
          </p>
        </div>
      </div>
      {external ? (
        <ExternalLink
          size={16}
          className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-3"
        />
      ) : (
        <ChevronRight
          size={16}
          className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-3"
        />
      )}
    </motion.button>
  );
}

/* ── main page ── */

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (s: AuthState) => s.auth.isAuthenticated
  );
  const { isDark, toggle: toggleDark } = useDarkMode();

  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  useEffect(() => {
    if (!isAuthenticated && !localStorage.getItem("token")) {
      navigate("/login");
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    disconnectSocket();
    dispatch(logout());
    navigate("/login");
  };

  const featurePills = [
    {
      icon: <Palette size={13} />,
      label: "Appearance",
      classes:
        "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300",
    },
    {
      icon: <Bell size={13} />,
      label: "Alerts",
      classes:
        "bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300",
    },
    {
      icon: <Shield size={13} />,
      label: "Privacy",
      classes:
        "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* ── animated ambient blobs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)",
          }}
        />
        <motion.div
          animate={{ x: [0, -25, 20, 0], y: [0, 20, -30, 0] }}
          transition={{ duration: 23, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -left-40 w-[550px] h-[550px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0) 70%)",
          }}
        />
        <motion.div
          animate={{ x: [0, 20, -15, 0], y: [0, -15, 25, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/3 w-[450px] h-[450px] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0) 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* ── back button ── */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-8 poppins-regular"
        >
          <ArrowLeft size={16} /> Back to Home
        </motion.button>

        {/* ── header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3.5 mb-3">
            {/* icon box with pulse glow */}
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="absolute inset-0 rounded-xl"
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  zIndex: -1,
                }}
              />
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  boxShadow: "0 0 24px rgba(99,102,241,0.35)",
                }}
              >
                <SettingsIcon size={22} />
              </div>
            </div>

            <div>
              <h1
                className="text-2xl poppins-bold"
                style={{
                  background: isDark
                    ? "linear-gradient(135deg, #e0e7ff, #ffffff 50%, #c4b5fd)"
                    : "linear-gradient(135deg, #312e81, #4f46e5 50%, #6d28d9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Settings
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular">
                Fine-tune your experience
              </p>
            </div>
          </div>

          {/* feature pills */}
          <div className="flex items-center gap-2 mt-4">
            {featurePills.map((pill, i) => (
              <motion.div
                key={pill.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs poppins-regular ${pill.classes}`}
              >
                {pill.icon}
                {pill.label}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── section cards ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* ── Appearance ── */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all"
          >
            <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="pt-5 pb-3 px-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <Palette size={15} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest poppins-semibold">
                Appearance
              </h2>
            </div>
            <div className="px-5 pb-2">
              <SettingToggle
                icon={isDark ? <Moon size={18} /> : <Sun size={18} />}
                label="Dark Mode"
                description={isDark ? "Dark theme is active" : "Light theme is active"}
                enabled={isDark}
                onToggle={toggleDark}
                accentColor="bg-indigo-500"
                accentGlow="rgba(99,102,241,0.35)"
                iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                iconText="text-indigo-500 dark:text-indigo-400"
              />
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <SettingLink
                icon={<Monitor size={18} />}
                label="Display"
                description="Font size and density preferences"
                onClick={() => {}}
                iconBg="bg-indigo-100 dark:bg-indigo-900/50"
                iconText="text-indigo-500 dark:text-indigo-400"
              />
            </div>
          </motion.div>

          {/* ── Notifications ── */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-amber-200 dark:hover:border-amber-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all"
          >
            <div className="h-[3px] bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="pt-5 pb-3 px-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Bell size={15} className="text-amber-500 dark:text-amber-400" />
              </div>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest poppins-semibold">
                Notifications
              </h2>
            </div>
            <div className="px-5 pb-2">
              <SettingToggle
                icon={notifications ? <Bell size={18} /> : <BellOff size={18} />}
                label="Push Notifications"
                description="Companion requests and invites"
                enabled={notifications}
                onToggle={() => setNotifications(!notifications)}
                accentColor="bg-amber-500"
                accentGlow="rgba(245,158,11,0.35)"
                iconBg="bg-amber-100 dark:bg-amber-900/50"
                iconText="text-amber-500 dark:text-amber-400"
              />
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <SettingToggle
                icon={soundEffects ? <Volume2 size={18} /> : <VolumeX size={18} />}
                label="Sound Effects"
                description="Message and notification sounds"
                enabled={soundEffects}
                onToggle={() => setSoundEffects(!soundEffects)}
                accentColor="bg-amber-500"
                accentGlow="rgba(245,158,11,0.35)"
                iconBg="bg-amber-100 dark:bg-amber-900/50"
                iconText="text-amber-500 dark:text-amber-400"
              />
            </div>
          </motion.div>

          {/* ── General ── */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all"
          >
            <div className="h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="pt-5 pb-3 px-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Globe size={15} className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest poppins-semibold">
                General
              </h2>
            </div>
            <div className="px-5 pb-2">
              <SettingLink
                icon={<Globe size={18} />}
                label="Language"
                description="English (US)"
                onClick={() => {}}
                iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                iconText="text-emerald-500 dark:text-emerald-400"
              />
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <SettingLink
                icon={<Shield size={18} />}
                label="Privacy & Security"
                description="Manage your data and privacy"
                onClick={() => {}}
                iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                iconText="text-emerald-500 dark:text-emerald-400"
              />
            </div>
          </motion.div>

          {/* ── About ── */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -3 }}
            className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-sky-200 dark:hover:border-sky-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all"
          >
            <div className="h-[3px] bg-gradient-to-r from-sky-500 to-blue-500" />
            <div className="pt-5 pb-3 px-5 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center">
                <Info size={15} className="text-sky-500 dark:text-sky-400" />
              </div>
              <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest poppins-semibold">
                About
              </h2>
            </div>
            <div className="px-5 pb-2">
              <SettingLink
                icon={<Info size={18} />}
                label="Version"
                description="Virtual Study Group v1.0.0"
                iconBg="bg-sky-100 dark:bg-sky-900/50"
                iconText="text-sky-500 dark:text-sky-400"
              />
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <SettingLink
                icon={<UserIcon size={18} />}
                label="Created by"
                description="Ankan Pal"
                onClick={() => window.open("https://ankanpal.com", "_blank")}
                external
                iconBg="bg-sky-100 dark:bg-sky-900/50"
                iconText="text-sky-500 dark:text-sky-400"
              />
            </div>
          </motion.div>

          {/* ── Account actions ── */}
          <motion.div variants={cardVariants} className="md:col-span-2 space-y-3 pt-2">
            {isAuthenticated && (
              <>
                <motion.button
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/profile")}
                  className="w-full py-3.5 rounded-2xl text-sm poppins-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: isDark
                      ? "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))"
                      : "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))",
                    border: isDark
                      ? "1px solid rgba(99,102,241,0.3)"
                      : "1px solid rgba(99,102,241,0.2)",
                    color: isDark ? "#a5b4fc" : "#4f46e5",
                  }}
                >
                  <UserIcon size={16} /> Edit Profile
                </motion.button>
                <motion.button
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="w-full py-3.5 rounded-2xl text-sm poppins-semibold flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: isDark
                      ? "rgba(239,68,68,0.08)"
                      : "rgba(239,68,68,0.05)",
                    border: isDark
                      ? "1px solid rgba(239,68,68,0.2)"
                      : "1px solid rgba(239,68,68,0.15)",
                    color: isDark ? "#fca5a5" : "#ef4444",
                  }}
                >
                  <LogOutIcon size={16} /> Log Out
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* ── footer ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10 space-y-2"
        >
          <div className="flex items-center justify-center gap-1.5">
            <div className="h-px w-8 bg-gray-200 dark:bg-gray-800" />
            <Heart size={12} className="text-gray-300 dark:text-gray-700" />
            <div className="h-px w-8 bg-gray-200 dark:bg-gray-800" />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-600 poppins-regular">
            Made with care for learners everywhere
          </p>
          <p className="text-[10px] text-gray-300 dark:text-gray-700 poppins-regular">
            Virtual Study Group v1.0.0
          </p>
        </motion.div>
      </div>
    </div>
  );
}

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
} from "lucide-react";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";
import { logout } from "../store/authStore/authSlice";
import { useDarkMode } from "../utils/useDarkMode";
import { disconnectSocket } from "../utils/socketInstance";

interface SettingToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  delay?: number;
}

function SettingToggle({
  icon,
  label,
  description,
  enabled,
  onToggle,
  delay = 0,
}: SettingToggleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between py-4 group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
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
        className={`relative w-12 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ml-3 ${
          enabled
            ? "bg-indigo-500"
            : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md ${
            enabled ? "left-[22px]" : "left-0.5"
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
  delay?: number;
}

function SettingLink({
  icon,
  label,
  description,
  onClick,
  external,
  delay = 0,
}: SettingLinkProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className="flex items-center justify-between py-4 w-full text-left group"
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 flex-shrink-0 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
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
          className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0 ml-3"
        />
      ) : (
        <ChevronRight
          size={16}
          className="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors flex-shrink-0 ml-3"
        />
      )}
    </motion.button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (s: AuthState) => s.auth.isAuthenticated
  );
  const user = useSelector((s: AuthState) => s.auth.user);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-100 dark:bg-indigo-950/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100 dark:bg-violet-950/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-24 pb-12">
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-8 poppins-regular"
        >
          <ArrowLeft size={16} />
          Back to Home
        </motion.button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white poppins-bold">
            Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mt-1">
            Manage your preferences and account
          </p>
        </motion.div>

        {/* ── Appearance section ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-5 mb-4 overflow-hidden"
        >
          <div className="pt-5 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest poppins-semibold flex items-center gap-2">
              <Palette size={13} />
              Appearance
            </h2>
          </div>

          <SettingToggle
            icon={isDark ? <Moon size={18} /> : <Sun size={18} />}
            label="Dark Mode"
            description={isDark ? "Dark theme is active" : "Light theme is active"}
            enabled={isDark}
            onToggle={toggleDark}
            delay={0.15}
          />

          <div className="border-t border-gray-50 dark:border-gray-800" />

          <SettingLink
            icon={<Monitor size={18} />}
            label="Display"
            description="Font size and density preferences"
            onClick={() => {}}
            delay={0.2}
          />
        </motion.div>

        {/* ── Notifications section ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-5 mb-4 overflow-hidden"
        >
          <div className="pt-5 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest poppins-semibold flex items-center gap-2">
              <Bell size={13} />
              Notifications
            </h2>
          </div>

          <SettingToggle
            icon={
              notifications ? <Bell size={18} /> : <BellOff size={18} />
            }
            label="Push Notifications"
            description="Companion requests and invites"
            enabled={notifications}
            onToggle={() => setNotifications(!notifications)}
            delay={0.2}
          />

          <div className="border-t border-gray-50 dark:border-gray-800" />

          <SettingToggle
            icon={
              soundEffects ? <Volume2 size={18} /> : <VolumeX size={18} />
            }
            label="Sound Effects"
            description="Message and notification sounds"
            enabled={soundEffects}
            onToggle={() => setSoundEffects(!soundEffects)}
            delay={0.25}
          />
        </motion.div>

        {/* ── General section ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-5 mb-4 overflow-hidden"
        >
          <div className="pt-5 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest poppins-semibold flex items-center gap-2">
              <Globe size={13} />
              General
            </h2>
          </div>

          <SettingLink
            icon={<Globe size={18} />}
            label="Language"
            description="English (US)"
            onClick={() => {}}
            delay={0.25}
          />

          <div className="border-t border-gray-50 dark:border-gray-800" />

          <SettingLink
            icon={<Shield size={18} />}
            label="Privacy & Security"
            description="Manage your data and privacy"
            onClick={() => {}}
            delay={0.3}
          />
        </motion.div>

        {/* ── About section ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 px-5 mb-6 overflow-hidden"
        >
          <div className="pt-5 pb-2">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest poppins-semibold flex items-center gap-2">
              <Info size={13} />
              About
            </h2>
          </div>

          <SettingLink
            icon={<Info size={18} />}
            label="Version"
            description="Virtual Study Group v1.0.0"
            delay={0.3}
          />
        </motion.div>

        {/* ── Account actions ── */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <button
              onClick={() => navigate("/profile")}
              className="w-full py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors poppins-semibold shadow-sm"
            >
              Edit Profile
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-2xl bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors poppins-semibold shadow-sm"
            >
              Log Out
            </button>
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-gray-400 dark:text-gray-600 poppins-regular mt-8"
        >
          Made with care for learners everywhere
        </motion.p>
      </div>
    </div>
  );
}

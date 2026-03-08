import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft,
  Save,
  Mail,
  Users,
  Pencil,
  Loader2,
  Check,
  Camera,
  X,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";
import { updateName, updateAvatar } from "../store/authStore/authSlice";

const API = import.meta.env.VITE_API_URL;

/* ── 5 default avatar options (inline SVG data URIs) ── */
const DEFAULT_AVATARS = [
  {
    id: "avatar_1",
    label: "Cool Guy",
    gradient: "from-blue-500 to-cyan-400",
    emoji: "\u{1F60E}", // sunglasses
    bg: "#3B82F6",
  },
  {
    id: "avatar_2",
    label: "Scholar",
    gradient: "from-violet-500 to-purple-400",
    emoji: "\u{1F9D1}\u200D\u{1F393}", // student
    bg: "#8B5CF6",
  },
  {
    id: "avatar_3",
    label: "Scientist",
    gradient: "from-emerald-500 to-teal-400",
    emoji: "\u{1F9D1}\u200D\u{1F52C}", // scientist
    bg: "#10B981",
  },
  {
    id: "avatar_4",
    label: "Artist",
    gradient: "from-pink-500 to-rose-400",
    emoji: "\u{1F9D1}\u200D\u{1F3A8}", // artist
    bg: "#EC4899",
  },
  {
    id: "avatar_5",
    label: "Astronaut",
    gradient: "from-amber-500 to-orange-400",
    emoji: "\u{1F9D1}\u200D\u{1F680}", // astronaut
    bg: "#F59E0B",
  },
];

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(
    (s: AuthState) => s.auth.isAuthenticated
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [companionCount, setCompanionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get(`${API}/user/profile`, { headers: { authorization: token } })
      .then((res) => {
        setName(res.data.name);
        setEmail(res.data.email);
        setBio(res.data.bio || "");
        setAvatar(res.data.avatar || "");
        setCompanionCount(res.data.companionCount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSaving(true);
    try {
      const res = await axios.put(
        `${API}/user/profile`,
        { name, bio, avatar },
        { headers: { authorization: token } }
      );
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      dispatch(updateName(res.data.name));
      dispatch(updateAvatar(res.data.avatar || ""));
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarSelect = async (avatarId: string) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setAvatar(avatarId);
    setShowAvatarPicker(false);
    try {
      await axios.put(
        `${API}/user/profile`,
        { avatar: avatarId },
        { headers: { authorization: token } }
      );
      dispatch(updateAvatar(avatarId));
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (n: string) =>
    n
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  const currentAvatar = DEFAULT_AVATARS.find((a) => a.id === avatar);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 pt-24 pb-12">
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

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 overflow-hidden"
        >
          {/* Banner */}
          <div className="h-32 bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23fff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2220%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-60" />
          </div>

          {/* Avatar */}
          <div className="flex justify-center -mt-14 relative z-10">
            <div className="relative group">
              {currentAvatar ? (
                <div
                  className={`w-28 h-28 rounded-full bg-gradient-to-br ${currentAvatar.gradient} flex items-center justify-center text-5xl ring-4 ring-white dark:ring-gray-900 shadow-lg transition-transform group-hover:scale-105`}
                >
                  {currentAvatar.emoji}
                </div>
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold poppins-semibold ring-4 ring-white dark:ring-gray-900 shadow-lg transition-transform group-hover:scale-105">
                  {getInitials(name)}
                </div>
              )}
              {/* Change avatar button */}
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-white dark:bg-gray-800 shadow-lg border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 active:scale-95 transition-all"
              >
                <Camera size={15} />
              </button>
            </div>
          </div>

          {/* Avatar picker modal */}
          <AnimatePresence>
            {showAvatarPicker && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setShowAvatarPicker(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: "spring", damping: 24, stiffness: 300 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 mx-4 max-w-sm w-full"
                >
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white poppins-semibold">
                      Choose Avatar
                    </h3>
                    <button
                      onClick={() => setShowAvatarPicker(false)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mb-5">
                    Pick a default avatar for your profile
                  </p>

                  <div className="grid grid-cols-5 gap-3 mb-5">
                    {DEFAULT_AVATARS.map((av) => (
                      <motion.button
                        key={av.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAvatarSelect(av.id)}
                        className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                          avatar === av.id
                            ? "bg-indigo-50 dark:bg-indigo-950/40 ring-2 ring-indigo-500"
                            : "hover:bg-gray-50 dark:hover:bg-gray-800"
                        }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-full bg-gradient-to-br ${av.gradient} flex items-center justify-center text-2xl shadow-md`}
                        >
                          {av.emoji}
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 poppins-regular truncate w-full text-center">
                          {av.label}
                        </span>
                        {avatar === av.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center"
                          >
                            <Check size={11} className="text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>

                  {/* Remove avatar option */}
                  <button
                    onClick={() => handleAvatarSelect("")}
                    className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors poppins-regular"
                  >
                    Use Initials Instead
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info */}
          <div className="px-6 pt-4 pb-2 text-center">
            {editing ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold text-center text-gray-900 dark:text-white bg-transparent border-b-2 border-indigo-500 outline-none poppins-semibold w-64 mx-auto block"
                autoFocus
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white poppins-semibold">
                {name}
              </h1>
            )}
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 poppins-regular">
              Student
            </p>
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-8 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                <Users size={16} />
                <span className="text-lg font-bold poppins-semibold">
                  {companionCount}
                </span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular mt-0.5">
                Companions
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-violet-600 dark:text-violet-400">
                <Mail size={16} />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular mt-0.5 max-w-[180px] truncate">
                {email}
              </p>
            </div>
          </div>

          {/* Bio section */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 poppins-semibold uppercase tracking-wide">
                About
              </h2>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors poppins-regular"
                >
                  <Pencil size={13} />
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none poppins-regular placeholder:text-gray-400"
              />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 poppins-regular leading-relaxed">
                {bio || "No bio yet. Click Edit to add one!"}
              </p>
            )}
          </div>

          {/* Action buttons */}
          {editing && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-6 pb-6 flex gap-3"
            >
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors poppins-regular"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 poppins-semibold disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                Save Changes
              </button>
            </motion.div>
          )}

          {/* Saved toast */}
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-6 pb-4"
            >
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl px-4 py-2.5 text-sm poppins-regular">
                <Check size={16} />
                Profile updated successfully!
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

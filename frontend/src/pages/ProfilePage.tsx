import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  ArrowLeft,
  Save,
  Mail,
  Users,
  Pencil,
  Loader2,
  Check,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";
import { updateName } from "../store/authStore/authSlice";

const API = import.meta.env.VITE_API_URL;

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: AuthState) => s.auth.user);
  const isAuthenticated = useSelector((s: AuthState) => s.auth.isAuthenticated);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [companionCount, setCompanionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

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
        { name, bio },
        { headers: { authorization: token } }
      );
      // Update JWT
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      // Update Redux
      dispatch(updateName(res.data.name));
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (n: string) =>
    n
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

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
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold poppins-semibold ring-4 ring-white dark:ring-gray-900 shadow-lg">
              {getInitials(name)}
            </div>
          </div>

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

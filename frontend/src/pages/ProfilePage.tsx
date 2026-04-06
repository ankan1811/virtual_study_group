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
  GraduationCap,
  FolderGit2,
  ExternalLink,
  Plus,
  Briefcase,
  Github,
  Gitlab,
  Youtube,
  Linkedin,
  Figma,
  Dribbble,
  Codepen,
  Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";
import { updateName, updateAvatar } from "../store/authStore/authSlice";
import { DEFAULT_AVATARS } from "../utils/avatars";

const API = import.meta.env.VITE_API_URL;

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

/* ───── Interfaces ───── */
interface Education {
  degree: string;
  institution: string;
  year: string;
}
interface Project {
  title: string;
  description: string;
  link: string;
}
interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}
interface LinkInfo {
  label: string;
  icon: LucideIcon;
  bg: string;
  text: string;
}

/* ───── Brand detection ───── */
const LINK_BRANDS: { pattern: RegExp; info: LinkInfo }[] = [
  { pattern: /github\.com/i, info: { label: "GitHub", icon: Github, bg: "bg-gray-900 dark:bg-gray-700", text: "text-white" } },
  { pattern: /gitlab\.com/i, info: { label: "GitLab", icon: Gitlab, bg: "bg-orange-50 dark:bg-orange-950/40", text: "text-orange-600 dark:text-orange-400" } },
  { pattern: /figma\.com/i, info: { label: "Figma", icon: Figma, bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-600 dark:text-purple-400" } },
  { pattern: /canva\.com/i, info: { label: "Canva", icon: Globe, bg: "bg-teal-50 dark:bg-teal-950/40", text: "text-teal-600 dark:text-teal-400" } },
  { pattern: /linkedin\.com/i, info: { label: "LinkedIn", icon: Linkedin, bg: "bg-blue-50 dark:bg-blue-950/40", text: "text-blue-600 dark:text-blue-400" } },
  { pattern: /youtube\.com|youtu\.be/i, info: { label: "YouTube", icon: Youtube, bg: "bg-red-50 dark:bg-red-950/40", text: "text-red-600 dark:text-red-400" } },
  { pattern: /dribbble\.com/i, info: { label: "Dribbble", icon: Dribbble, bg: "bg-pink-50 dark:bg-pink-950/40", text: "text-pink-600 dark:text-pink-400" } },
  { pattern: /codepen\.io/i, info: { label: "CodePen", icon: Codepen, bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" } },
  { pattern: /vercel\.app|vercel\.com/i, info: { label: "Vercel", icon: Globe, bg: "bg-gray-900 dark:bg-gray-700", text: "text-white" } },
  { pattern: /netlify\.app|netlify\.com/i, info: { label: "Netlify", icon: Globe, bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" } },
  { pattern: /notion\.so|notion\.site/i, info: { label: "Notion", icon: Globe, bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" } },
];

const getProjectLinkInfo = (url: string): LinkInfo => {
  const match = LINK_BRANDS.find((b) => b.pattern.test(url));
  if (match) return match.info;
  return { label: "View", icon: ExternalLink, bg: "bg-indigo-50 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400" };
};

const inputClass =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all poppins-regular placeholder:text-gray-400";

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
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [education, setEducation] = useState<Education>({ degree: "", institution: "", year: "" });
  const [projects, setProjects] = useState<Project[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperience>({ company: "", role: "", duration: "", description: "" });

  useEffect(() => {
    if (!isAuthenticated) {
      if (!localStorage.getItem("token")) navigate("/login");
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
        if (res.data.education) setEducation(res.data.education);
        if (res.data.projects) setProjects(res.data.projects);
        if (res.data.workExperience) setWorkExperience(res.data.workExperience);
        if (res.data.avatar) dispatch(updateAvatar(res.data.avatar));
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
        { name, bio, avatar, education, projects, workExperience },
        { headers: { authorization: token } }
      );
      if (res.data.token) localStorage.setItem("token", res.data.token);
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
    if (!token || avatarSaving) return;
    setAvatarSaving(true);
    setAvatar(avatarId);
    setShowAvatarPicker(false);
    try {
      await axios.put(`${API}/user/profile`, { avatar: avatarId }, { headers: { authorization: token } });
      dispatch(updateAvatar(avatarId));
    } catch (err) {
      console.error(err);
    } finally {
      setAvatarSaving(false);
    }
  };

  const getInitials = (n: string) =>
    n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const updateProject = (index: number, field: keyof Project, value: string) => {
    setProjects((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };
  const addProject = () => {
    if (projects.length < 2) setProjects((prev) => [...prev, { title: "", description: "", link: "" }]);
  };
  const removeProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const currentAvatar = DEFAULT_AVATARS.find((a) => a.id === avatar);
  const hasEducation = education.degree || education.institution || education.year;
  const hasWorkExp = workExperience.company || workExperience.role;

  const Skeleton = ({ className = "" }: { className?: string }) => (
    <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 ${className}`} />
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Ambient background — GPU-friendly transforms only */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full blur-[100px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.08) 50%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, rgba(79,70,229,0.06) 50%, transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-8 poppins-regular"
        >
          <ArrowLeft size={16} />
          Back to Home
        </motion.button>

        {/* ── Banner + Avatar hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          className="rounded-3xl overflow-hidden mb-6"
        >
          {/* Banner */}
          <div className="h-44 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative">
            <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(0,0,0,0.15) 0%, transparent 50%)" }} />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2240%22%20height%3D%2240%22%20viewBox%3D%220%200%2040%2040%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22%23fff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2220%22%20r%3D%222%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-40" />
          </div>

          {/* Avatar + Info section */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl px-6 pb-6">
            {/* Avatar */}
            <div className="flex justify-center -mt-16 relative z-10 mb-4">
              <div className="relative group">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -inset-2 rounded-full border-2 border-dashed border-indigo-400/30"
                />
                {currentAvatar ? (
                  <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${currentAvatar.gradient} flex items-center justify-center ring-4 ring-white dark:ring-gray-900 shadow-xl transition-transform group-hover:scale-105`}>
                    <currentAvatar.Icon className="w-14 h-14 text-white" />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-bold poppins-semibold ring-4 ring-white dark:ring-gray-900 shadow-xl transition-transform group-hover:scale-105">
                    {getInitials(name)}
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-white"
                  style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                >
                  <Camera size={16} />
                </motion.button>
              </div>
            </div>

            {/* Name + badge */}
            <div className="text-center mb-4">
              {loading ? (
                <Skeleton className="h-8 w-48 mx-auto" />
              ) : editing ? (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-bold text-center text-gray-900 dark:text-white bg-transparent border-b-2 border-indigo-500 outline-none poppins-bold w-64 mx-auto block"
                  autoFocus
                />
              ) : (
                <h1 className="text-2xl poppins-bold text-gray-900 dark:text-white">{name}</h1>
              )}
              <div className="mt-2">
                {loading ? (
                  <Skeleton className="h-6 w-24 mx-auto rounded-full" />
                ) : (
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs poppins-semibold text-white"
                    style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                  >
                    <GraduationCap size={12} /> Student
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div whileHover={{ y: -2 }} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <Users size={16} className="text-indigo-500" />
                </div>
                <div>
                  {loading ? <Skeleton className="h-6 w-8" /> : <p className="text-lg font-bold text-gray-900 dark:text-white poppins-bold">{companionCount}</p>}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 poppins-regular">Companions</p>
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                  <Mail size={16} className="text-violet-500" />
                </div>
                <div>
                  {loading ? <Skeleton className="h-5 w-28" /> : <p className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold truncate max-w-[120px]">{email}</p>}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 poppins-regular">Email</p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Avatar picker modal */}
        <AnimatePresence>
          {showAvatarPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
              onClick={() => setShowAvatarPicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 24, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden mx-4 max-w-sm w-full"
              >
                <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white poppins-semibold">Choose Avatar</h3>
                    <button onClick={() => setShowAvatarPicker(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mb-5">Pick a default avatar for your profile</p>
                  <div className="grid grid-cols-5 gap-3 mb-5">
                    {DEFAULT_AVATARS.map((av) => (
                      <motion.button
                        key={av.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAvatarSelect(av.id)}
                        disabled={avatarSaving}
                        className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all disabled:opacity-60 ${avatar === av.id ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                      >
                        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${av.gradient} flex items-center justify-center shadow-md`}>
                          <av.Icon className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 poppins-regular truncate w-full text-center">{av.label}</span>
                        {avatar === av.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 15, stiffness: 300 }} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                            <Check size={11} className="text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAvatarSelect("")}
                    disabled={avatarSaving}
                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30 transition-all poppins-regular disabled:opacity-60"
                  >
                    {avatarSaving ? (
                      <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" />Saving...</span>
                    ) : "Use Initials Instead"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Content sections ── */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/80 dark:bg-gray-900/80 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="h-[3px] bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600" />
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bio */}
          <motion.div variants={cardVariants} whileHover={{ y: -3 }} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all">
            <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                    <Pencil size={16} className="text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 poppins-semibold">About</h3>
                </div>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors poppins-regular">
                    <Pencil size={13} /> Edit Profile
                  </button>
                )}
              </div>
              {editing ? (
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Write something about yourself..." rows={3} className={`${inputClass} resize-none`} />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 poppins-regular leading-relaxed">{bio || "No bio yet. Click Edit Profile to add one!"}</p>
              )}
            </div>
          </motion.div>

          {/* Education */}
          <motion.div variants={cardVariants} whileHover={{ y: -3 }} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all">
            <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-blue-500" />
            <div className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <GraduationCap size={16} className="text-indigo-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 poppins-semibold">Education</h3>
              </div>
              {editing ? (
                <div className="space-y-3">
                  <input value={education.degree} onChange={(e) => setEducation((prev) => ({ ...prev, degree: e.target.value }))} placeholder="Degree (e.g. B.Tech in Computer Science)" className={inputClass} />
                  <input value={education.institution} onChange={(e) => setEducation((prev) => ({ ...prev, institution: e.target.value }))} placeholder="Institution (e.g. IIT Delhi)" className={inputClass} />
                  <input value={education.year} onChange={(e) => setEducation((prev) => ({ ...prev, year: e.target.value }))} placeholder="Year (e.g. 2021 - 2025)" className={inputClass} />
                </div>
              ) : hasEducation ? (
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold">{education.degree}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mt-1">{[education.institution, education.year].filter(Boolean).join(" · ")}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 poppins-regular italic">No education added yet. Click Edit Profile to add!</p>
              )}
            </div>
          </motion.div>

          {/* Projects */}
          <motion.div variants={cardVariants} whileHover={{ y: -3 }} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-violet-200 dark:hover:border-violet-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all">
            <div className="h-[3px] bg-gradient-to-r from-violet-500 to-purple-500" />
            <div className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                  <FolderGit2 size={16} className="text-violet-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 poppins-semibold">Projects</h3>
              </div>
              {editing ? (
                <div className="space-y-4">
                  {projects.map((project, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative bg-white dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 poppins-semibold uppercase tracking-wide">Project {i + 1}</span>
                        <button onClick={() => removeProject(i)} className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                      </div>
                      <input value={project.title} onChange={(e) => updateProject(i, "title", e.target.value)} placeholder="Project Title" className={inputClass.replace("focus:ring-indigo-500/30", "focus:ring-violet-500/30")} />
                      <textarea value={project.description} onChange={(e) => updateProject(i, "description", e.target.value)} placeholder="Brief description of the project..." rows={2} className={`${inputClass.replace("focus:ring-indigo-500/30", "focus:ring-violet-500/30")} resize-none`} />
                      <input value={project.link} onChange={(e) => updateProject(i, "link", e.target.value)} placeholder="Project Link (e.g. https://github.com/...)" className={inputClass.replace("focus:ring-indigo-500/30", "focus:ring-violet-500/30")} />
                    </motion.div>
                  ))}
                  {projects.length < 2 && (
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={addProject} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:border-violet-400 hover:text-violet-500 dark:hover:border-violet-500 dark:hover:text-violet-400 transition-all flex items-center justify-center gap-2 poppins-regular">
                      <Plus size={16} /> Add Project ({projects.length}/2)
                    </motion.button>
                  )}
                </div>
              ) : projects.length > 0 ? (
                <div className="space-y-3">
                  {projects.map((project, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl bg-white dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold">{project.title}</h3>
                          {project.description && <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mt-1 line-clamp-2">{project.description}</p>}
                        </div>
                        {project.link && (() => {
                          const linkInfo = getProjectLinkInfo(project.link);
                          const LinkIcon = linkInfo.icon;
                          return (
                            <a href={project.link} target="_blank" rel="noopener noreferrer" className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${linkInfo.bg} ${linkInfo.text} text-xs font-medium poppins-semibold hover:opacity-80 transition-all hover:scale-105 active:scale-95`}>
                              <LinkIcon size={13} /> {linkInfo.label}
                            </a>
                          );
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 poppins-regular italic">No projects added yet. Click Edit Profile to showcase your work!</p>
              )}
            </div>
          </motion.div>

          {/* Work Experience */}
          <motion.div variants={cardVariants} whileHover={{ y: -3 }} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 shadow-sm hover:shadow-md overflow-hidden transition-all">
            <div className="h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <Briefcase size={16} className="text-emerald-500" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 poppins-semibold">Work Experience</h3>
              </div>
              {editing ? (
                <div className="space-y-3">
                  <input value={workExperience.company} onChange={(e) => setWorkExperience((prev) => ({ ...prev, company: e.target.value }))} placeholder="Company Name" className={inputClass} />
                  <input value={workExperience.role} onChange={(e) => setWorkExperience((prev) => ({ ...prev, role: e.target.value }))} placeholder="Role (e.g. Frontend Developer)" className={inputClass} />
                  <input value={workExperience.duration} onChange={(e) => setWorkExperience((prev) => ({ ...prev, duration: e.target.value }))} placeholder="Duration (e.g. Jan 2024 - Present)" className={inputClass} />
                  <textarea value={workExperience.description} onChange={(e) => setWorkExperience((prev) => ({ ...prev, description: e.target.value }))} placeholder="Describe your role and responsibilities..." rows={2} className={`${inputClass} resize-none`} />
                </div>
              ) : hasWorkExp ? (
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold">{workExperience.company}</p>
                    {workExperience.role && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium poppins-semibold">{workExperience.role}</span>
                    )}
                  </div>
                  {workExperience.duration && <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular mt-1.5">{workExperience.duration}</p>}
                  {workExperience.description && <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mt-2 leading-relaxed">{workExperience.description}</p>}
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500 poppins-regular italic">No work experience added yet. Click Edit Profile to add!</p>
              )}
            </div>
          </motion.div>

          {/* Action buttons */}
          {editing && (
            <motion.div variants={cardVariants} className="md:col-span-2 flex gap-3">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setEditing(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 poppins-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving} className="flex-1 py-3 rounded-2xl text-white text-sm poppins-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-all" style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)", boxShadow: "0 0 20px rgba(99,102,241,0.3)" }}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? "Saving..." : "Save Changes"}
              </motion.button>
            </motion.div>
          )}
        </motion.div>
        )}

        {/* Saved toast */}
        <AnimatePresence>
          {saved && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 rounded-xl px-4 py-2.5 text-sm poppins-regular">
                <Check size={16} /> Profile updated successfully!
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

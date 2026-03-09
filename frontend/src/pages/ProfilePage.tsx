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
} from "lucide-react";
import Navbar from "../components/Navbar";
import { AuthState } from "../store/authStore/store";
import { updateName, updateAvatar } from "../store/authStore/authSlice";
import { DEFAULT_AVATARS } from "../utils/avatars";

const API = import.meta.env.VITE_API_URL;

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

  const [education, setEducation] = useState<Education>({
    degree: "",
    institution: "",
    year: "",
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperience>({
    company: "",
    role: "",
    duration: "",
    description: "",
  });

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

  const updateProject = (index: number, field: keyof Project, value: string) => {
    setProjects((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  };

  const addProject = () => {
    if (projects.length < 2) {
      setProjects((prev) => [...prev, { title: "", description: "", link: "" }]);
    }
  };

  const removeProject = (index: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== index));
  };

  const currentAvatar = DEFAULT_AVATARS.find((a) => a.id === avatar);

  const hasEducation = education.degree || education.institution || education.year;
  const hasWorkExp = workExperience.company || workExperience.role;

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
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
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
                  Edit Profile
                </button>
              )}
            </div>

            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 poppins-regular leading-relaxed">
                {bio || "No bio yet. Click Edit Profile to add one!"}
              </p>
            )}
          </div>

          {/* Education section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="px-6 py-5 border-b border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                <GraduationCap size={16} className="text-indigo-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 poppins-semibold uppercase tracking-wide">
                Education
              </h2>
            </div>

            {editing ? (
              <div className="space-y-3">
                <input
                  value={education.degree}
                  onChange={(e) =>
                    setEducation((prev) => ({ ...prev, degree: e.target.value }))
                  }
                  placeholder="Degree (e.g. B.Tech in Computer Science)"
                  className={inputClass}
                />
                <input
                  value={education.institution}
                  onChange={(e) =>
                    setEducation((prev) => ({
                      ...prev,
                      institution: e.target.value,
                    }))
                  }
                  placeholder="Institution (e.g. IIT Delhi)"
                  className={inputClass}
                />
                <input
                  value={education.year}
                  onChange={(e) =>
                    setEducation((prev) => ({ ...prev, year: e.target.value }))
                  }
                  placeholder="Year (e.g. 2021 - 2025)"
                  className={inputClass}
                />
              </div>
            ) : hasEducation ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold">
                  {education.degree}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mt-1">
                  {[education.institution, education.year]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 poppins-regular italic">
                No education added yet. Click Edit Profile to add!
              </p>
            )}
          </motion.div>

          {/* Projects section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-6 py-5 border-b border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center">
                <FolderGit2 size={16} className="text-violet-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 poppins-semibold uppercase tracking-wide">
                Projects
              </h2>
            </div>

            {editing ? (
              <div className="space-y-4">
                {projects.map((project, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 poppins-semibold uppercase tracking-wide">
                        Project {i + 1}
                      </span>
                      <button
                        onClick={() => removeProject(i)}
                        className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <input
                      value={project.title}
                      onChange={(e) => updateProject(i, "title", e.target.value)}
                      placeholder="Project Title"
                      className={inputClass}
                    />
                    <textarea
                      value={project.description}
                      onChange={(e) =>
                        updateProject(i, "description", e.target.value)
                      }
                      placeholder="Brief description of the project..."
                      rows={2}
                      className={`${inputClass} resize-none`}
                    />
                    <input
                      value={project.link}
                      onChange={(e) => updateProject(i, "link", e.target.value)}
                      placeholder="Project Link (e.g. https://github.com/...)"
                      className={inputClass}
                    />
                  </motion.div>
                ))}

                {projects.length < 2 && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={addProject}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 dark:text-gray-500 hover:border-indigo-400 hover:text-indigo-500 dark:hover:border-indigo-500 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-2 poppins-regular"
                  >
                    <Plus size={16} />
                    Add Project ({projects.length}/2)
                  </motion.button>
                )}
              </div>
            ) : projects.length > 0 ? (
              <div className="space-y-3">
                {projects.map((project, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold">
                          {project.title}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mt-1 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      {project.link && (
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium poppins-semibold hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
                        >
                          <ExternalLink size={12} />
                          View
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 poppins-regular italic">
                No projects added yet. Click Edit Profile to showcase your work!
              </p>
            )}
          </motion.div>

          {/* Work Experience section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="px-6 py-5"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <Briefcase size={16} className="text-emerald-500" />
              </div>
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 poppins-semibold uppercase tracking-wide">
                Work Experience
              </h2>
            </div>

            {editing ? (
              <div className="space-y-3">
                <input
                  value={workExperience.company}
                  onChange={(e) =>
                    setWorkExperience((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                  placeholder="Company Name"
                  className={inputClass}
                />
                <input
                  value={workExperience.role}
                  onChange={(e) =>
                    setWorkExperience((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))
                  }
                  placeholder="Role (e.g. Frontend Developer)"
                  className={inputClass}
                />
                <input
                  value={workExperience.duration}
                  onChange={(e) =>
                    setWorkExperience((prev) => ({
                      ...prev,
                      duration: e.target.value,
                    }))
                  }
                  placeholder="Duration (e.g. Jan 2024 - Present)"
                  className={inputClass}
                />
                <textarea
                  value={workExperience.description}
                  onChange={(e) =>
                    setWorkExperience((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Describe your role and responsibilities..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>
            ) : hasWorkExp ? (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white poppins-semibold">
                    {workExperience.company}
                  </p>
                  {workExperience.role && (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium poppins-semibold">
                      {workExperience.role}
                    </span>
                  )}
                </div>
                {workExperience.duration && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 poppins-regular mt-1.5">
                    {workExperience.duration}
                  </p>
                )}
                {workExperience.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mt-2 leading-relaxed">
                    {workExperience.description}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 poppins-regular italic">
                No work experience added yet. Click Edit Profile to add!
              </p>
            )}
          </motion.div>

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

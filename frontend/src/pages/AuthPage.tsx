import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";
import {
  Mail,
  User,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Users,
  Sparkles,
  Loader2,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { login } from "../store/authStore/authSlice";
import { connectSocket } from "../utils/socketInstance";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleGoogleSuccess = async (tokenResponse: { access_token: string }) => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/google`,
        { access_token: tokenResponse.access_token }
      );
      dispatch(login({ name: res.data.name, userId: res.data.userId }));
      localStorage.setItem("token", res.data.token);
      connectSocket(res.data.token);
      const pendingRoom = sessionStorage.getItem("pendingJoinRoom");
      if (pendingRoom) {
        sessionStorage.removeItem("pendingJoinRoom");
        navigate(`/join/${pendingRoom}`);
      } else {
        navigate("/home");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setError("Google sign-in was cancelled."),
  });

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const resetFields = () => {
    setName("");
    setEmail("");
    setOtp("");
    setError("");
    setStep("email");
    setCountdown(0);
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    resetFields();
  };

  const handleSendOtp = async () => {
    if (!email || (mode === "register" && !name)) {
      setError("Please fill in all fields.");
      return;
    }
    setOtpSending(true);
    setError("");
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/send-otp`,
        { email }
      );
      setStep("otp");
      setCountdown(30);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email, otp }
          : { name, email, otp };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}${endpoint}`,
        body
      );

      dispatch(login({ name: res.data.name, userId: res.data.userId }));
      localStorage.setItem("token", res.data.token);
      connectSocket(res.data.token);
      const pendingRoom = sessionStorage.getItem("pendingJoinRoom");
      if (pendingRoom) {
        sessionStorage.removeItem("pendingJoinRoom");
        navigate(`/join/${pendingRoom}`);
      } else {
        navigate("/home");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setOtp("");
    setError("");
    setOtpSending(true);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/send-otp`,
        { email }
      );
      setCountdown(30);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resend OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const features = [
    { icon: Users, text: "Study with companions in real-time" },
    { icon: BookOpen, text: "AI-powered doubt solving & summaries" },
    { icon: Sparkles, text: "Voice input, live chat & video calls" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-white/5 rounded-full" />
        <div className="absolute top-1/3 right-12 w-48 h-48 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col justify-center px-14 py-16 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <BookOpen size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold poppins-bold tracking-tight">
                Virtual Study Group
              </span>
            </div>

            <h1 className="text-4xl font-bold poppins-bold leading-tight mb-4">
              Your study room
              <br />
              is always ready.
            </h1>
            <p className="text-indigo-200 text-base poppins-regular leading-relaxed mb-10 max-w-sm">
              Connect with companions, solve doubts with AI, and ace your exams
              — all in one place.
            </p>

            <div className="space-y-4">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                    <f.icon size={15} className="text-white" />
                  </div>
                  <span className="text-sm text-indigo-100 poppins-regular">
                    {f.text}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Mobile branding */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 poppins-bold">
              Virtual Study Group
            </span>
          </div>

          {/* Toggle tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl mb-8">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  if (m !== mode) toggleMode();
                }}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all poppins-semibold capitalize ${
                  mode === m
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${step}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 poppins-bold mb-1">
                {step === "otp"
                  ? "Enter verification code"
                  : mode === "login"
                  ? "Welcome back"
                  : "Create your account"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular mb-6">
                {step === "otp"
                  ? `We sent a 6-digit code to ${email}`
                  : mode === "login"
                  ? "Sign in to rejoin your study companions."
                  : "Start studying smarter with your team."}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-2.5 rounded-xl mb-4 poppins-regular"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <AnimatePresence mode="wait">
              {step === "email" ? (
                <motion.div
                  key="email-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {mode === "register" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 poppins-semibold">
                        Full Name
                      </label>
                      <div className="relative">
                        <User
                          size={16}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          type="text"
                          placeholder="Aarav Sharma"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm poppins-regular focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 poppins-semibold">
                      Email
                    </label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm poppins-regular focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={otpSending}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md disabled:opacity-60 mt-2"
                  >
                    {otpSending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        Send OTP
                        <ArrowRight size={16} />
                      </>
                    )}
                  </motion.button>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    <span className="text-xs text-gray-400 dark:text-gray-500 poppins-regular uppercase tracking-wider">
                      or
                    </span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  </div>

                  {/* Google Sign-In */}
                  <motion.button
                    type="button"
                    onClick={() => googleLogin()}
                    disabled={googleLoading}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold poppins-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-750 hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                  >
                    {googleLoading ? (
                      <Loader2 size={16} className="animate-spin text-gray-400" />
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                    )}
                    Continue with Google
                  </motion.button>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 poppins-semibold">
                      Verification Code
                    </label>
                    <div className="relative">
                      <KeyRound
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="000000"
                        value={otp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          setOtp(val);
                        }}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-lg poppins-regular focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 tracking-[0.3em] text-center font-semibold"
                      />
                    </div>
                  </div>

                  {/* Resend OTP */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setOtp("");
                        setError("");
                      }}
                      className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors poppins-regular"
                    >
                      <ArrowLeft size={14} />
                      Change email
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={countdown > 0 || otpSending}
                      className="flex items-center gap-1 text-xs font-medium transition-colors poppins-regular disabled:opacity-50"
                      style={{
                        color: countdown > 0 ? undefined : "#4f46e5",
                      }}
                    >
                      <RefreshCw size={14} className={otpSending ? "animate-spin" : ""} />
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                    </button>
                  </div>

                  <motion.button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md disabled:opacity-60 mt-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        {mode === "login" ? "Sign In" : "Create Account"}
                        <ArrowRight size={16} />
                      </>
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Bottom toggle */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6 poppins-regular">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={toggleMode}
              className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors poppins-semibold"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

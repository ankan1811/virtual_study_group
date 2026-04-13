import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import AuthPage from "./pages/AuthPage";
import RoomPage from "./pages/RoomPage";
import RoomCallPage from "./pages/RoomCallPage";

import { Provider, useDispatch } from "react-redux";
import store from "./store/authStore/store";
import AskAiPage from "./pages/AskAiPage";
import DemoAiPage from "./pages/DemoAiPage";
import ProfilePage from "./pages/ProfilePage";
import ChatsPage from "./pages/ChatsPage";
import SummariesPage from "./pages/SummariesPage";
import RadioPage from "./pages/RadioPage";
import PodcastsPage from "./pages/PodcastsPage";
import WhiteboardPage from "./pages/WhiteboardPage";
import JoinRoomPage from "./pages/JoinRoomPage";
import SettingsPage from "./pages/SettingsPage";
import SessionsPage from "./pages/SessionsPage";
import NotFoundPage from "./pages/NotFoundPage";
import { login, updateAvatar } from "./store/authStore/authSlice";
import { connectSocket } from "./utils/socketInstance";
import axios from "axios";
import InviteNotificationOverlay from "./components/InviteNotificationOverlay";
import CompanionRequestOverlay from "./components/CompanionRequestOverlay";
import { RadioProvider } from "./context/RadioContext";
import { PodcastPlayerProvider } from "./context/PodcastPlayerContext";
import MiniPlayer from "./components/MiniPlayer";
import PodcastMiniPlayer from "./components/PodcastMiniPlayer";
import ColdStartScreen from "./components/ColdStartScreen";

function AppInner() {
  const dispatch = useDispatch();
  const [serverStatus, setServerStatus] = useState<'unknown' | 'alive' | 'dead'>('unknown');

  useEffect(() => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    fetch(`${import.meta.env.VITE_API_URL}/ping`, { signal: controller.signal })
      .then(r => { if (r.ok) setServerStatus('alive'); else setServerStatus('dead'); })
      .catch(() => setServerStatus('dead'))
      .finally(() => clearTimeout(id));
    return () => { clearTimeout(id); controller.abort(); };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.userId && payload.name) {
          dispatch(login({ name: payload.name, userId: payload.userId }));
          connectSocket(token);
          // Fetch avatar from API (not stored in JWT)
          axios
            .get(`${import.meta.env.VITE_API_URL}/user/profile`, {
              headers: { authorization: token },
            })
            .then((res) => {
              if (res.data.avatar) dispatch(updateAvatar(res.data.avatar));
            })
            .catch(() => {});
        }
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, []);

  if (serverStatus === 'unknown') return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 20% 50%, #1e1040 0%, transparent 60%), ' +
          'radial-gradient(ellipse at 80% 20%, #0f1f4d 0%, transparent 60%), ' +
          'linear-gradient(135deg, #0a0718 0%, #0f1628 50%, #0a0f28 100%)',
      }}
    >
      <div className="text-center">
        <h1
          className="text-[1.75rem] font-bold poppins-bold mb-3"
          style={{
            background: 'linear-gradient(135deg, #a5b4fc, #fff 55%, #67e8f9)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Virtual Study Group
        </h1>
        <p className="text-sm text-indigo-300/80 poppins-regular mb-4">Waking up the study rooms</p>
        <div className="flex gap-1.5 justify-center">
          {[0, 0.2, 0.4].map((d) => (
            <span
              key={d}
              className="w-1.5 h-1.5 rounded-full bg-indigo-300"
              style={{ animation: 'dot-pulse 1.2s ease-in-out infinite both', animationDelay: `${d}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
  if (serverStatus === 'dead') return <ColdStartScreen />;

  return (
    <BrowserRouter>
      <RadioProvider>
        <PodcastPlayerProvider>
        <InviteNotificationOverlay />
        <CompanionRequestOverlay />
        <MiniPlayer />
        <PodcastMiniPlayer />
        <Routes>
          <Route element={<Navigate to="/home" replace />} path="/" />
          <Route element={<RoomPage />} path="/home" />
          <Route element={<AskAiPage />} path="/ask" />
          <Route element={<DemoAiPage />} path="/demo" />
          <Route element={<AuthPage />} path="/login" />
          <Route element={<AuthPage />} path="/register" />
          <Route element={<ProfilePage />} path="/profile" />
          <Route element={<SettingsPage />} path="/settings" />
          <Route element={<ChatsPage />} path="/chats" />
          <Route element={<SummariesPage />} path="/summaries" />
          <Route element={<SessionsPage />} path="/sessions" />
          <Route element={<RoomCallPage />} path="/room/call" />
          <Route element={<RadioPage />} path="/radio" />
          <Route element={<PodcastsPage />} path="/podcasts" />
          <Route element={<JoinRoomPage />} path="/join/:roomId" />
          <Route element={<WhiteboardPage />} path="/whiteboard/:roomId" />
          <Route element={<WhiteboardPage />} path="/whiteboard" />
          <Route element={<NotFoundPage />} path="*" />
        </Routes>
        </PodcastPlayerProvider>
      </RadioProvider>
    </BrowserRouter>
  );
}

function App() {
  return (
    <Provider store={store}>
      <AppInner />
    </Provider>
  );
}

export default App;

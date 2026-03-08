import { useEffect } from "react";
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
import WhiteboardPage from "./pages/WhiteboardPage";
import JoinRoomPage from "./pages/JoinRoomPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import { login } from "./store/authStore/authSlice";
import { connectSocket } from "./utils/socketInstance";
import InviteNotificationOverlay from "./components/InviteNotificationOverlay";
import CompanionRequestOverlay from "./components/CompanionRequestOverlay";
import { RadioProvider } from "./context/RadioContext";
import MiniPlayer from "./components/MiniPlayer";

function AppInner() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.userId && payload.name) {
          dispatch(login({ name: payload.name, userId: payload.userId }));
          connectSocket(token);
        }
      } catch {
        localStorage.removeItem("token");
      }
    }
  }, []);

  return (
    <BrowserRouter>
      <RadioProvider>
        <InviteNotificationOverlay />
        <CompanionRequestOverlay />
        <MiniPlayer />
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
          <Route element={<RoomCallPage />} path="/room/call" />
          <Route element={<RadioPage />} path="/radio" />
          <Route element={<JoinRoomPage />} path="/join/:roomId" />
          <Route element={<WhiteboardPage />} path="/whiteboard/:roomId" />
          <Route element={<WhiteboardPage />} path="/whiteboard" />
          <Route element={<NotFoundPage />} path="*" />
        </Routes>
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

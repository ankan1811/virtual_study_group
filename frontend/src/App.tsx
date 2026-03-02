import React, { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import AuthPage from "./pages/AuthPage";
import Login from "./components/Login";
import Register from "./components/Register";
import RoomPage from "./pages/RoomPage";
import RoomCallPage from "./pages/RoomCallPage";
import LandingPage from "./pages/LandingPage";
import { Provider, useDispatch } from "react-redux";
import store from "./store/authStore/store";
import Streampage from "./pages/Streampage";
import AskAiPage from "./pages/AskAiPage";
import DemoAiPage from "./pages/DemoAiPage";
import { login } from "./store/authStore/authSlice";
import { connectSocket } from "./utils/socketInstance";
import InviteNotificationOverlay from "./components/InviteNotificationOverlay";
import CompanionRequestOverlay from "./components/CompanionRequestOverlay";

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
      <InviteNotificationOverlay />
      <CompanionRequestOverlay />
      <Routes>
        <Route element={<LandingPage />} path="/" />
        <Route element={<RoomPage />} path="/home" />
        <Route element={<Streampage />} path="/stream" />
        <Route element={<AskAiPage />} path="/ask" />
        <Route element={<DemoAiPage />} path="/demo" />
        <Route
          element={
            <AuthPage>
              <Login />
            </AuthPage>
          }
          path="/login"
        />
        <Route
          element={
            <AuthPage>
              <Register />
            </AuthPage>
          }
          path="/register"
        />
        <Route element={<RoomCallPage />} path="/room/call" />
      </Routes>
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

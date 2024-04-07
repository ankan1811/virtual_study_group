import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import AuthPage from "./pages/AuthPage";
import Login from "./components/Login";
import Register from "./components/Register";
import RoomPage from "./pages/RoomPage";
import RoomCallPage from "./pages/RoomCallPage";
import LandingPage from "./pages/LandingPage";
import { Provider } from "react-redux";
import store from "./store/authStore/store";
import Streampage from "./pages/Streampage";
import AskAiPage from "./pages/AskAiPage";
import DemoAiPage from "./pages/DemoAiPage";
function App() {
  return (
    <>
      <Provider store={store}>
        <BrowserRouter>
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
      </Provider>
    </>
  );
}

export default App;

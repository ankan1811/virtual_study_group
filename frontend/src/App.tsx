import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import Login from "./components/Login";
import Register from "./components/Register";
import RoomPage from "./pages/RoomPage";
import RoomCallPage from "./pages/RoomCallPage";
import LandingPage from "./pages/LandingPage";
import { Provider } from "react-redux";
import store from "./store/authStore/store";
function App() {
  return (
    <>
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route element={<LandingPage />} path="/" />
            <Route element={<HomePage />} path="/home" />
            <Route element={<RoomPage />} path="/room" />
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

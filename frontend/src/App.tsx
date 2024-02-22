import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";
import LandinPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import Login from "./components/Login";
import Register from "./components/Register";

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route element={<LandinPage />} path="/" />
          <Route element={<HomePage />} path="/home" />
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
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

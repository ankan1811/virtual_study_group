import React from "react";
import Logo from "../assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn, LogOut } from "lucide-react";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { AuthState } from "../store/authStore/store";
import { logout } from "../store/authStore/authSlice";
export default function Navbar() {
  const navItemsCenter = [
    {
      title: "Home",
      path: "/home",
    },
    {
      title: "Join room",
      path: "/room",
    },
    {
      title: "Contact us",
      path: "/contact",
    },
  ];
  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (state: AuthState) => state.auth.isAuthenticated
  );
  // useEffect(() => {
  //   if (localStorage.getItem("token") != null) setIsLoggedIn(true);
  // }, []);

  return (
    <nav className="bg-white w-full border-b md:border-0 shadow-md poppins-regular">
      <div className="px-5 py-4 flex justify-between">
        <div className="">
          <img alt="Logo" src={Logo} />
        </div>
        <ul className="flex gap-10">
          {navItemsCenter.map((item, id) => (
            <li
              key={id}
              className="bottom-border-animate hover:border-b-4 pt-2"
            >
              <Link
                to={isAuthenticated ? item.path : "/login"}
                className="text-gray-600 hover:text-sky-700 font-medium"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex gap-10">
          <li className="">
            {isAuthenticated ? (
              <Button
                variant="destructive"
                onClick={() => {
                  dispatch(logout());
                  // localStorage.removeItem("token");
                }}
              >
                <Link to="/" className="flex gap-2 items-center">
                  <LogOut size={20} />
                  <h1 className="text-lg">Logout</h1>
                </Link>
              </Button>
            ) : (
              <Button variant="ghost">
                <Link to="/login" className="flex gap-2 items-center">
                  <LogIn size={20} />
                  <h1 className="text-lg">Login</h1>
                </Link>
              </Button>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

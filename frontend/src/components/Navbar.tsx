import React from "react";
import Logo from "../assets/logo.svg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
export default function Navbar() {
  const navItemsCenter = [
    {
      title: "Home",
      path: "/",
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
  const navItemsRight = [
    {
      title: "Login",
      path: "/login",
    },
  ];

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
                to={item.path}
                className="text-gray-600 hover:text-sky-700 font-medium"
              >
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex gap-10">
          {navItemsRight.map((item, id) => (
            <li key={id} className="">
              <Button variant="ghost">
                <Link to={item.path} className="flex gap-2 items-center">
                  <LogIn size={20} />
                  <h1 className="text-lg">{item.title}</h1>
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

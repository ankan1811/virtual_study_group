import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { MouseEventHandler, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../store/authStore/authSlice";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // const isAuthenticated = useSelector(
  //   (state: AuthState) => state.auth.isAuthenticated
  // );
  // const user = useSelector((state: AuthState) => state.auth.user);
  const handleSubmit: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    await axios
      .post("http://localhost:3000/auth/login", {
        email,
        password,
      })
      .then((res) => {
        dispatch(login(res.data.name));
        localStorage.setItem("token", res.data.token);
        navigate("/home");
      });
  };
  return (
    <Card className="w-[350px] shadow-2xl border-2 border-cyan-900">
      <form>
        <CardHeader className="items-center">
          <CardTitle className="text-3xl arvo-bold">Login</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4 poppins-regular">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email" className="text-lg">
                Email
              </Label>
              <Input
                id="email"
                placeholder="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password" className="text-lg">
                Password
              </Label>
              <Input
                id="password"
                placeholder="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button
            className="bg-slate-500 hover:bg-slate-800 hover:text-white hover:border-0 text-md"
            onClick={handleSubmit}
          >
            SIGN IN
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

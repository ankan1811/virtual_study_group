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
import { MouseEventHandler, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { login } from "../store/authStore/authSlice";
import { connectSocket } from "../utils/socketInstance";
import { Loader2 } from "lucide-react";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const handleSubmit: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    if (signingIn) return;
    setSigningIn(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { email, password }
      );
      dispatch(login({ name: res.data.name, userId: res.data.userId }));
      localStorage.setItem("token", res.data.token);
      connectSocket(res.data.token);
      navigate("/home");
    } catch (err) {
      console.error(err);
    } finally {
      setSigningIn(false);
    }
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
            className="bg-slate-500 hover:bg-slate-800 hover:text-white hover:border-0 text-md disabled:opacity-60"
            onClick={handleSubmit}
            disabled={signingIn}
          >
            {signingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Signing In...
              </>
            ) : (
              "SIGN IN"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

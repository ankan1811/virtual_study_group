import React, { MouseEventHandler, useState } from "react";
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
import axios from "axios";
import { useNavigate } from "react-router-dom";
export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const handleSubmit: MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    console.log(`{email:${email}} {name:${name}}`);
    await axios
      .post("http://localhost:3000/auth/register", {
        name,
        email,
        password,
      })
      .then(async (res) => {
        console.log(res);
        await axios
          .post("http://localhost:3000/auth/login", {
            email,
            password,
          })
          .then((res) => {
            console.log(res);
            localStorage.setItem("token", res.data.token);
            navigate("/home");
          });
      })
      .catch((err) => {
        console.log(err);
      });
  };

  return (
    <Card className="w-[350px] shadow-2xl border-2 border-cyan-900">
      <form>
        <CardHeader className="items-center">
          <CardTitle className="text-3xl arvo-bold">Register</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid w-full items-center gap-4 poppins-regular">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name" className="text-lg">
                Name
              </Label>
              <Input
                id="name"
                placeholder="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email" className="text-lg">
                Email
              </Label>
              <Input
                id="email"
                placeholder="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password" className="text-lg">
                Set Password
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
            type="submit"
          >
            SIGN UP
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

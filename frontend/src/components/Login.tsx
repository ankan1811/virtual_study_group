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
import React from "react";
export default function Login() {
  return (
    <Card className="w-[350px] shadow-2xl border-2 border-cyan-900">
      <CardHeader className="items-center">
        <CardTitle className="text-3xl arvo-bold">Login</CardTitle>
      </CardHeader>
      <CardContent>
        <form>
          <div className="grid w-full items-center gap-4 poppins-regular">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name" className="text-lg">
                Username
              </Label>
              <Input id="name" placeholder="username" />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="name" className="text-lg">
                Password
              </Label>
              <Input id="name" placeholder="password" type="password" />
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button className="bg-slate-500 hover:bg-slate-800 hover:text-white hover:border-0 text-md">
          SIGN IN
        </Button>
      </CardFooter>
    </Card>
  );
}

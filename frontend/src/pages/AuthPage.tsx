import React from "react";
import BackImg from "../assets/login-back.jpg";
import BackgroundImageComponent from "../components/shared/BackgroundImage";

export default function AuthPage({ children }: { children: React.ReactNode }) {
  return (
    <BackgroundImageComponent imageUrl={BackImg}>
      <div className="h-full flex items-center justify-center">{children}</div>
    </BackgroundImageComponent>
  );
}

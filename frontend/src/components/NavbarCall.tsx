import Logo from "../assets/logo.svg";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

export default function NavbarCall({
  onExitClick,
}: {
  onExitClick: () => void;
}) {
  return (
    <nav className="bg-white w-full border-b md:border-0 shadow-md poppins-regular">
      <div className="px-5 py-4 flex justify-between">
        <div className="">
          <img alt="Logo" src={Logo} />
        </div>
        <ul className="flex gap-10"></ul>
        <ul className="flex gap-10">
          <li key="" className="">
            <Button variant="destructive" onClick={onExitClick}>
              <div className="flex gap-2 items-center">
                <LogIn size={20} />
                <h1 className="text-lg">Exit room</h1>
              </div>
            </Button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

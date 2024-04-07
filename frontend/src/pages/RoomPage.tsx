import React, { useState } from "react";
import Navbar from "../components/Navbar";
import { ArrowRightToLine } from "lucide-react";
import Emoji from "../components/shared/Emoji";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
export default function RoomPage() {
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  return (
    <div className="h-[100vh] flex flex-col items-center">
      <Navbar />
      <div className="px-5 pt-3 flex h-[50%] xl:w-[1280px] mt-20">
        <div className="flex-1 h-full flex flex-col px-6 justify-center">
          <p className="arvo-bold text-cyan-950 xl:text-5xl pt-20 text-4xl">
            Hey folk <Emoji symbol="👋" label="wave" />,<br />
            your companions are waiting.
            <br /> Hurry before <br />
            room get's filled.
          </p>
          <motion.div
            className="box w-max mt-3 bg-gradient-to-r from-indigo-600 to-violet-800 text-white rounded-md"
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <button className="flex px-3 py-2 items-center">
              <p className="poppins-bold text-lg">Join Random room</p>
              <ArrowRightToLine className="ml-2" size={15} />
            </button>
          </motion.div>
        </div>
        <div className="flex-1 px-4 flex justify-center items-center">
          <img src="https://img.freepik.com/free-vector/happy-united-business-team_74855-6520.jpg?t=st=1710871542~exp=1710875142~hmac=e5491800f3e013dc83bb4a2fcc7340e1f04274c7d3b422ac63826be7be8bad3a&w=1380" className="h-fit" />
        </div>
      </div>
      <div className="px-5 py-3 flex h-[50%] xl:w-[1280px]">
        <div className="flex-1 px-4">
          <img src="https://img.freepik.com/free-vector/organic-flat-people-business-training_23-2148909572.jpg?t=st=1710871815~exp=1710875415~hmac=292a0bce194f6c62e30a3b1fa7404d186d7e22f8ff4a4221757e30794df5f046&w=1380" alt="right-img" />
        </div>
        <div className="flex-1 h-full flex flex-col px-6 justify-center">
          <p className="arvo-bold text-cyan-950 text-4xl pt-20 ml-24">
            Oh you have room id
            <Emoji symbol="🤔" label="think" />
            <br /> Paste below and join private room.
          </p>
          <div className="flex w-full max-w-md items-center space-x-3 mt-3 ml-24">
            <Input
              className="border-gray-500 border-2 border-solid focus-visible:ring-transparent"
              onChange={(e) => {
                setRoomId(e.target.value);
              }}
            />
            <motion.div
              className="box w-min bg-gradient-to-r from-indigo-600 to-violet-800 text-white rounded-md"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <button
                className="flex px-3 py-2 items-center"
                onClick={() => {
                  localStorage.setItem("room-id", roomId);
                  navigate("/room/call");
                }}
              >
                <p className="poppins-bold text-lg w-max">Join room</p>
                <ArrowRightToLine className="ml-2" size={15} />
              </button>
            </motion.div>
          </div>
        </div>
      </div>
      <div></div>
    </div>
  );
}

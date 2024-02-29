import React from "react";
import Navbar from "../components/Navbar";
import { ArrowRightToLine } from "lucide-react";
import Emoji from "../components/shared/Emoji";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
export default function RoomPage() {
  return (
    <div>
      <Navbar />
      <div className="px-5 pt-3 flex">
        <div className="flex-1 h-full flex flex-col px-6 justify-end">
          <p className="arvo-bold text-cyan-950 text-4xl  pt-20">
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
        <div className="flex-1 px-4"> right part</div>
      </div>
      <div className="px-5 py-3 flex">
        <div className="flex-1 px-4"> right part</div>
        <div className="flex-1 h-full flex flex-col px-6 justify-end">
          <p className="arvo-bold text-cyan-950 text-4xl pt-20">
            Oh you have room id
            <Emoji symbol="🤔" label="think" />
            <br /> Paste below and join private room.
          </p>
          <div className="flex w-full max-w-md items-center space-x-3 mt-3">
            <Input className="border-gray-500 border-2 border-solid focus-visible:ring-transparent" />
            <motion.div
              className="box w-min bg-gradient-to-r from-indigo-600 to-violet-800 text-white rounded-md"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <button className="flex px-3 py-2 items-center">
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

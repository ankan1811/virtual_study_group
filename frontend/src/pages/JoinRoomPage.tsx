import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { AuthState } from "../store/authStore/store";
import { enterRoom } from "../store/RoomStore/roomSlice";

export default function JoinRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(
    (s: AuthState) => s.auth.isAuthenticated
  );

  useEffect(() => {
    if (!roomId) {
      navigate("/home", { replace: true });
      return;
    }
    if (!isAuthenticated) {
      sessionStorage.setItem("pendingJoinRoom", roomId);
      navigate("/login", { replace: true });
      return;
    }
    dispatch(enterRoom({ roomId, isOwner: false }));
    navigate("/room/call", { replace: true, state: { roomId } });
  }, [roomId, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <Loader2 size={28} className="animate-spin text-indigo-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400 poppins-regular">
          Joining room...
        </p>
      </motion.div>
    </div>
  );
}

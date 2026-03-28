import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AuthState } from "../store/authStore/store";
import { receiveInvite, clearInvite } from "../store/inviteStore/inviteSlice";
import { enterRoom } from "../store/RoomStore/roomSlice";
import { getSocket } from "../utils/socketInstance";
import { DoorOpen, X, Loader2 } from "lucide-react";

export default function InviteNotificationOverlay() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const pendingInvite = useSelector((state: AuthState) => state.invite.pendingInvite);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleReceiveInvite = (data: {
      roomId: string;
      inviterName: string;
      inviterUserId: string;
    }) => {
      dispatch(receiveInvite(data));
    };

    socket.on("receiveInvite", handleReceiveInvite);
    return () => {
      socket.off("receiveInvite", handleReceiveInvite);
    };
  }, [dispatch]);

  const handleAccept = () => {
    if (!pendingInvite || joining) return;
    setJoining(true);
    const socket = getSocket();
    socket?.emit("acceptInvite", {
      roomId: pendingInvite.roomId,
      inviterUserId: pendingInvite.inviterUserId,
    });
    dispatch(enterRoom({ roomId: pendingInvite.roomId, isOwner: false }));
    dispatch(clearInvite());
    navigate("/room/call");
  };

  const handleDecline = () => {
    if (!pendingInvite) return;
    const socket = getSocket();
    socket?.emit("declineInvite", { inviterUserId: pendingInvite.inviterUserId });
    dispatch(clearInvite());
  };

  return (
    <AnimatePresence>
      {pendingInvite && (
        <motion.div
          initial={{ opacity: 0, y: -80, x: "50%" }}
          animate={{ opacity: 1, y: 0, x: "50%" }}
          exit={{ opacity: 0, y: -80, x: "50%" }}
          transition={{ type: "spring", damping: 22, stiffness: 200 }}
          className="fixed top-4 right-1/2 z-[100] w-80"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-xl">
                    <DoorOpen size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800 poppins-semibold">
                      Study Invitation
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 poppins-regular">
                      <span className="font-medium text-indigo-600">{pendingInvite.inviterName}</span>
                      {" "}is inviting you to study
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDecline}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAccept}
                  disabled={joining}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold poppins-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {joining ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <Loader2 size={14} className="animate-spin" />
                      Joining...
                    </span>
                  ) : (
                    "Join Room"
                  )}
                </button>
                <button
                  onClick={handleDecline}
                  className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium poppins-regular hover:bg-gray-200 transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

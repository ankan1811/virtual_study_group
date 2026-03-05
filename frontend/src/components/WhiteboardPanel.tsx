import { useCallback, useEffect, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import { getSocket } from "../utils/socketInstance";

interface WhiteboardPanelProps {
  roomId: string;
  onSceneChange: (
    elements: Array<{ type: string; text?: string; width: number; height: number; isDeleted?: boolean }>
  ) => void;
  initialElements?: readonly any[];
}

export default function WhiteboardPanel({
  roomId,
  onSceneChange,
  initialElements,
}: WhiteboardPanelProps) {
  const [api, setApi] = useState<any>(null);
  const isRemoteUpdate = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lift scene to parent + broadcast via socket (debounced)
  const handleChange = useCallback(
    (elements: readonly any[]) => {
      // Skip if this change came from a remote sync
      if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
      }

      const active = elements.filter((el: any) => !el.isDeleted);

      // Lift simplified elements to parent for AI
      onSceneChange(
        active.map((el: any) => ({
          type: el.type,
          ...(el.type === "text" && { text: el.text }),
          width: el.width,
          height: el.height,
        }))
      );

      // Debounced socket broadcast
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const socket = getSocket();
        if (socket && roomId) {
          socket.emit("whiteboard:update", {
            roomId,
            elements: Array.from(elements),
          });
        }
      }, 150);
    },
    [roomId, onSceneChange]
  );

  // Listen for remote whiteboard sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onSync = ({ elements }: { elements: any[] }) => {
      if (api) {
        isRemoteUpdate.current = true;
        api.updateScene({ elements });
      }
    };

    const onCleared = () => {
      if (api) {
        isRemoteUpdate.current = true;
        api.updateScene({ elements: [] });
      }
    };

    socket.on("whiteboard:sync", onSync);
    socket.on("whiteboard:cleared", onCleared);
    return () => {
      socket.off("whiteboard:sync", onSync);
      socket.off("whiteboard:cleared", onCleared);
    };
  }, [api]);

  return (
    <div className="w-full h-full">
      <Excalidraw
        excalidrawAPI={(excalidrawApi) => setApi(excalidrawApi)}
        onChange={handleChange}
        theme="light"
        initialData={initialElements ? { elements: initialElements as any } : undefined}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            export: false,
          },
        }}
      />
    </div>
  );
}

import { Server, Socket } from "socket.io";
import http from "http";

let io: Server;

export function initSocketServer(httpServer: http.Server): Server {
  io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    console.log("A user connected");

    socket.on("joinRoom", ({ roomId, name }) => {
      console.log(`${roomId} - ${name}`);
      socket.join(roomId);
      io.emit(`message:${roomId}`, {
        msg: `Welcome ${name} to the room`,
        sentby: "bot",
      });
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("serverMessage", ({ message, roomId, sentby }) => {
      console.log(`${message} - ${roomId} - ${sentby}`);
      io.emit(`message:${roomId}`, { msg: message, sentby: sentby });
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });

  console.log("Socket.IO chat server initialized on main HTTP server");
  return io;
}

export function getIO(): Server {
  return io;
}

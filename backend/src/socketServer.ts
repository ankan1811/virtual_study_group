import { Server, Socket } from "socket.io";
import http from "http";

const httpServer = http.createServer();
const io = new Server(httpServer);

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

httpServer.listen(3001, () => {
  console.log("Socket.IO server running on port 3001");
});

export default io;

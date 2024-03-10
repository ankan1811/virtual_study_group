// socketServer.ts

import { Server,Socket } from 'socket.io';
import http from 'http';

const httpServer = http.createServer();
const io = new Server(httpServer);

io.on('connection', (socket:Socket) => {
  console.log('A user connected');

  // Handle chat message event
  socket.on('chatMessage', (message:string) => {
    io.emit('chatMessage', message); // Broadcast the message to all clients
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

httpServer.listen(3001, () => {
  console.log('Socket.IO server running on port 3001');
});

export default io;

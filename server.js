// server.js  (Node 18+, Express 4.x, socket.io 4.x)
const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  console.log(`🔌  ${socket.id} connected`);

  socket.on("join_room", (room) => {
    socket.join(room);
    const otherCount = io.sockets.adapter.rooms.get(room)?.size ?? 0;
    console.log(`${socket.id} joined ${room} (${otherCount} inside)`);
    if (otherCount > 1) {
      // room already has someone
      socket.to(room).emit("ready"); // tell first peer we’re ready
    }
  });

  // pass along SDP and ICE data
  socket.on("offer", ({ room, sdp }) => socket.to(room).emit("offer", sdp));
  socket.on("answer", ({ room, sdp }) => socket.to(room).emit("answer", sdp));
  socket.on("ice", ({ room, candidate }) =>
    socket.to(room).emit("ice", candidate)
  );

  socket.on("disconnect", () => console.log(`❌  ${socket.id} disconnected`));
});

server.listen(3001, () => console.log("🚀 signalling server on :3001"));

const http = require("http");
const { Server } = require("socket.io");
const { app, taskQueue } = require("./index");
require("./worker"); // still loads the BullMQ logic

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // dev mode
  },
});

io.on("connection", (socket) => {
  console.log("[Socket.io] Client connected:", socket.id);
});

app.set("io", io); // allow emitting from inside other modules

server.listen(3001, () => {
  console.log("🚀 API + WebSocket server running on http://localhost:3001");
});

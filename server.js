import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { autoTourStatusCron } from "./src/Cron/autoTourStatusCron.js";
import { startAutoBoostScheduler } from "./src/Cron/runAutoBoostScheduler.js";
import { initLiveCamSocket } from "./src/socket/livecamSocket.js";

const PORT = process.env.PORT || 8080;

// HTTP server create
const server = http.createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://admin.greenevelvet.com",
  "https://greenevelvet.com",
  "https://www.greenevelvet.com",
];

// Socket.IO init
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

// Live Cam Dedicated Namespace (/livecam)
initLiveCamSocket(io);

// Socket logic
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("join_room", ({ roomId, role }) => {
    socket.join(roomId);
    console.log(`${role} joined room ${roomId}`);
  });

  socket.on("register_notification_room", ({ userId, role }) => {
    const notificationRoom = `notification_${role}_${userId}`;
    socket.join(notificationRoom);
    console.log(
      `🔔 Notification room active for [${role}]: ${notificationRoom}`,
    );
  });

  socket.on("send_message", (data) => {
    io.to(data.roomId).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 Server running with Socket.IO on port ${PORT}`);
      startAutoBoostScheduler();
      autoTourStatusCron();
    });
  } catch (error) {
    console.error("❌ Failed to start server", error);
    process.exit(1);
  }
};

startServer();

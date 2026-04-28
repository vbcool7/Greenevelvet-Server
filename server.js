import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import { autoTourStatusCron } from "./src/Cron/autoTourStatusCron.js";

const PORT = process.env.PORT || 8080;

// HTTP server create
const server = http.createServer(app);

// Socket.IO init
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "http://localhost:5174",
        ],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Socket logic
io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("join_room", ({ roomId, role }) => {
        socket.join(roomId);
        console.log(`${role} joined room ${roomId}`);
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
            autoTourStatusCron();
        });
    } catch (error) {
        console.error("❌ Failed to start server", error);
        process.exit(1);
    }
};


startServer();

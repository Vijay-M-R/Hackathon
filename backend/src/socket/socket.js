import { Server } from "socket.io";
import { InterviewService } from "../services/interview.service.js";

let ioInstance;

export function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  ioInstance = io;

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);

    socket.on("join_interview", (interviewId) => {
      socket.join(interviewId);
      console.log(`Socket ${socket.id} joined interview ${interviewId}`);
    });

    socket.on("send_message", async (data) => {
      const { interviewId, senderRole, senderName, text } = data;
      
      // Save message to DB
      const message = await InterviewService.addMessage(interviewId, senderRole, senderName, text);
      
      // Broadcast to others in the room
      io.to(interviewId).emit("receive_message", message);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  return io;
}

export const getIO = () => ioInstance;

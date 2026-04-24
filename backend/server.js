import { createServer } from "http";
import app from "./src/app.js";
import { setupSocket } from "./src/socket/socket.js";
import { ReminderService } from "./src/services/reminder.service.js";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);

setupSocket(httpServer);
ReminderService.startService();

httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


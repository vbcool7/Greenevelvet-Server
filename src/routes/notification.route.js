import { Router } from "express";
import { getMyNotifications, markNotificationAsRead } from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.js";

const notificationRouter = Router();

notificationRouter.get("/my-notification", protect(["Admin", "Escort", "Client"]), getMyNotifications);
notificationRouter.patch("/mark-read/:id", protect(["Admin", "Escort", "Client"]), markNotificationAsRead);

export default notificationRouter;
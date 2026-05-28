import { Router } from "express";
import { getMyNotifications, markNotificationAsRead } from "../controllers/notification.controller.js";

const notificationRouter = Router();

notificationRouter.get("/my-notification", getMyNotifications);
notificationRouter.patch("/mark-read", markNotificationAsRead);

export default notificationRouter;
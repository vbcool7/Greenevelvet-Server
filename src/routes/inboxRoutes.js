import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  listConversations,
  getConversationMessages,
  sendDirectMessage,
  updateConversationState,
  reportDirectMessage,
} from "../controllers/inboxController.js";

const inboxRouter = Router();

inboxRouter.use(protect(["Escort", "Client"]));

inboxRouter.get("/conversations", listConversations);
inboxRouter.get(
  "/conversations/:conversationId/messages",
  getConversationMessages,
);
inboxRouter.post("/messages", sendDirectMessage);
inboxRouter.patch(
  "/conversations/:conversationId/state",
  updateConversationState,
);
inboxRouter.post("/messages/report", reportDirectMessage);

export default inboxRouter;

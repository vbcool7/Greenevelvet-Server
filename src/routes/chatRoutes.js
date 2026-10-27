import { Router } from 'express';
import { accessChatRoom, getChatMessages, getUserChatList } from '../controllers/chatController.js';

const chatRouter = Router();

chatRouter.post("/access-chat-room", accessChatRoom);
chatRouter.get("/chat-messages/:chatRoomId", getChatMessages);
chatRouter.get("/chat-list", getUserChatList);

export default chatRouter;
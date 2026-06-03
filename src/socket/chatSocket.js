import EscortModel from '../models/EscortModel.js';
import ChatRoomModel from '../models/ChatRoomModel.js';
import ChatMessageModel from '../models/ChatMessageModel.js';
import ClientModel from '../models/clientModel.js';

export const handleChatSockets = (io) => {
    io.on('connection', (socket) => {

        // 1. User Connected Flow
        socket.on('user_connected', async ({ userId, userModel }) => { // userModel should be 'ClientModel' or 'EscortModel'
            socket.userId = userId;
            socket.userModel = userModel;

            const Model = userModel === 'ClientModel' ? ClientModel : EscortModel;

            try {
                await Model.findByIdAndUpdate(userId, {
                    isOnline: true,
                    currentSocketId: socket.id
                });

                socket.broadcast.emit('user_status_changed', { userId, isOnline: true });
            } catch (err) {
                console.error("User connection error in sockets:", err.message);
            }
        });

        // 2. Room Join Flow
        socket.on('join_chat', ({ chatRoomId }) => {
            socket.join(chatRoomId);
        });

        // 3. Live Message Flow
        socket.on('send_message', async (data) => {
            const { chatRoomId, senderId, senderModel, receiverId, receiverModel, message } = data;

            try {
                // Database backup save
                const newMessage = await ChatMessageModel.create({
                    chatRoomId, senderId, senderModel, receiverId, receiverModel, message
                });

                const ReceiverModel = receiverModel === 'ClientModel' ? ClientModel : EscortModel;
                const receiver = await ReceiverModel.findById(receiverId);

                const updateData = {
                    lastMessage: newMessage._id,
                    updatedAt: Date.now()
                };

                // WhatsApp Unread increment logic
                if (!receiver || !receiver.isOnline) {
                    await ChatRoomModel.findByIdAndUpdate(chatRoomId, {
                        $inc: { [`unreadCounts.${receiverId}`]: 1 },
                        lastMessage: newMessage._id,
                        updatedAt: Date.now()
                    });
                } else {
                    await ChatRoomModel.findByIdAndUpdate(chatRoomId, updateData);
                }

                // Live deliver message to receiver if online
                if (receiver && receiver.isOnline && receiver.currentSocketId) {
                    io.to(receiver.currentSocketId).emit('receive_message', newMessage);
                }

                // Acknowledgement to sender
                socket.emit('message_sent_success', newMessage);

            } catch (error) {
                console.error("Socket send_message structure error:", error);
                socket.emit('message_error', { error: "Message delivery failed" });
            }
        });

        // 4. User Offline Flow
        socket.on('disconnect', async () => {
            if (socket.userId && socket.userModel) {
                const Model = socket.userModel === 'ClientModel' ? ClientModel : EscortModel;

                try {
                    await Model.findByIdAndUpdate(socket.userId, {
                        isOnline: false,
                        lastSeen: new Date(),
                        currentSocketId: null
                    });

                    socket.broadcast.emit('user_status_changed', {
                        userId: socket.userId,
                        isOnline: false,
                        lastSeen: new Date()
                    });
                } catch (err) {
                    console.error("Socket disconnect processing error:", err.message);
                }
            }
        });
    });
};
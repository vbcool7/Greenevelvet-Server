import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
    chatRoomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    escortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Escort',
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // Iska createdAt field hi message ka sent time banta hai

const ChatMessageModel = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessageModel;
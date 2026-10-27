import mongoose from 'mongoose';

const ChatRoomSchema = new mongoose.Schema({
    // Is array me hamesha do IDs hongi: ek Client ki aur ek Escort ki
    participants: [{
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            refPath: 'participants.onModel' // Yeh niche wale string ko dekhega
        },
        onModel: {
            type: String,
            required: true,
            enum: ['Client', 'Escort'] // Sirf yeh do models allowed hain
        }
    }],

    // WhatsApp ki tarah last message text aur time list me dikhane ke liye
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },

    // WhatsApp Style Unread Count (Dynamic Map) -> { "USER_ID": 3 }
    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    },

    // Jab bhi naya message aayega, yeh time update hoga taaki chat list me top par aaye
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const ChatRoomModel = mongoose.model('ChatRoom', ChatRoomSchema);

export default ChatRoomModel;
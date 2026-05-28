import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'recipientModel' 
    },
    recipientModel: {
        type: String,
        required: true,
        enum: ['Admin', 'Escort', 'Client']
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'senderModel'
    },
    senderModel: {
        type: String,
        enum: ['Admin', 'Escort', 'Client']
    },
    type: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    link: {
        type: String, // (e.g., '/dashboard/bookings')
    }
}, { timestamps: true });


const NotificationModel = mongoose.model('Notification', notificationSchema);

export default NotificationModel;
import NotificationModel from "../models/notificationModel.js";


/* Universal helper to send notifications (DB + Real-time Socket)*/
export const createAndSendNotification = async (app, {


    recipientId,
    recipientModel, // 'Admin', 'Escort', ya 'Client'
    senderId = null,
    senderModel = null,
    type,
    title,
    message,
    link = ""
}) => {
    try {
        console.log("add notification api call", "recipientModel", recipientId,
            "recipientModel", recipientModel, "senderId", senderId,
            "senderModel", senderModel, "type", type, "title", title,
            "message", message, "link", link
        );

        // 1. Database me save karo
        const newNotification = await NotificationModel.create({
            recipient: recipientId,
            recipientModel,
            sender: senderId,
            senderModel,
            type,
            title,
            message,
            link
        });

        // 2. server.js se io instance nikaalo
        const io = app.get("io");

        if (io) {
            // Target user ka exact notification room name
            const targetRoom = `notification_${recipientModel}_${recipientId}`;

            // Real-time emit kar do pure object ke sath
            io.to(targetRoom).emit("new_notification", newNotification);
            console.log(`📡 Real-time notification emitted to: ${targetRoom}`);
        }

        return newNotification;
    } catch (error) {
        console.error("❌ Error in createAndSendNotification helper:", error);
    }
};
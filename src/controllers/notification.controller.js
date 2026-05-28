import NotificationModel from "../models/notificationModel.js";


// fetch my notification 
export const getMyNotifications = async (request, response) => {
    try {

        const currentUserId = request.user?._id;
        const currentUserModel = request.user?.role;

        const notifications = await NotificationModel.find({
            recipient: currentUserId,
            recipientModel: currentUserModel
        })
            .populate("sender", "name email avatar city country")
            .sort({ createdAt: -1 });

        return response.status(200).json({
            success: true,
            count: notifications.length,
            data: notifications
        });
    } catch (error) {
        console.error("❌ Error in getMyNotifications:", error);

        return response.status(500).json({
            success: false,
            error: true,
            message: error.message || "Internal Server Error"
        });
    }
};

// Mark a specific notification as read
export const markNotificationAsRead = async (request, response) => {
    try {
        const { id } = request.params;
        const currentUserId = request.user?._id;

        const notification = await NotificationModel.findById(id);

        if (!notification) {
            return response.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        // Check if the logged-in user is the actual recipient
        if (notification.recipient.toString() !== currentUserId.toString()) {
            return response.status(403).json({
                success: false,
                message: "Unauthorized to mark this notification as read"
            });
        }

        // Status update karo
        notification.isRead = true;
        await notification.save();

        return response.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: notification
        });
    } catch (error) {
        console.error("❌ Error in markNotificationAsRead:", error);
        
        return response.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};
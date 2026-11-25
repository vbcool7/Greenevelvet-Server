import AuditLogModel from "../models/AuditLogModel.js";
import NotificationModel from "../models/notificationModel.js";

export async function writeAuditLog({
  actorId,
  actorRole,
  action,
  targetType,
  targetId = "",
  metadata = {},
  ipAddress = "",
}) {
  if (!actorId || !actorRole || !action || !targetType) return null;
  return AuditLogModel.create({
    actorId,
    actorRole,
    action,
    targetType,
    targetId: String(targetId),
    metadata,
    ipAddress,
  });
}

export async function sendLiveCamNotification({
  recipientId,
  recipientModel,
  senderId = null,
  senderModel = null,
  type,
  title,
  message,
  link = "/live-cams",
}) {
  if (!recipientId || !recipientModel || !type || !title || !message) {
    return null;
  }

  const doc = {
    recipient: recipientId,
    recipientModel,
    type: type.startsWith("livecam_") ? type : `livecam_${type}`,
    title,
    message,
    link,
    isRead: false,
    readAt: null,
  };

  if (senderId && senderModel) {
    doc.sender = senderId;
    doc.senderModel = senderModel;
  }

  return NotificationModel.create(doc);
}

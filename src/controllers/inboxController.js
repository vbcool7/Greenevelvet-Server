import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";
import DirectConversationModel from "../models/DirectConversationModel.js";
import DirectMessageModel from "../models/DirectMessageModel.js";
import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import ViewerLiveProfileModel from "../models/ViewerLiveProfileModel.js";
import LiveCamSubscriptionModel from "../models/LiveCamSubscriptionModel.js";
import ModerationReportModel from "../models/ModerationReportModel.js";

function canSendDirectMessage(
  senderRole,
  senderId,
  recipientRole,
  recipientId,
  bProfile,
  vProfile,
  hasSub,
) {
  if (senderRole === "Client" && recipientRole === "Escort") {
    if (
      vProfile?.blockedBroadcasters?.some(
        (id) => String(id) === String(recipientId),
      )
    ) {
      return { ok: false, message: "You have blocked this broadcaster." };
    }
    if (
      bProfile?.blockedViewers?.some((id) => String(id) === String(senderId))
    ) {
      return { ok: false, message: "You cannot message this broadcaster." };
    }
    const pref = bProfile?.allowDirectMessagesFrom || "everyone";
    if (pref === "nobody") {
      return {
        ok: false,
        message: "This broadcaster has disabled direct messages.",
      };
    }
    if (pref === "subscribers" && !hasSub) {
      return {
        ok: false,
        message: "Only subscribers can message this broadcaster.",
      };
    }
  }

  if (senderRole === "Escort" && recipientRole === "Client") {
    if (
      bProfile?.blockedViewers?.some((id) => String(id) === String(recipientId))
    ) {
      return { ok: false, message: "You have blocked this viewer." };
    }
    if (
      vProfile?.blockedBroadcasters?.some(
        (id) => String(id) === String(senderId),
      )
    ) {
      return {
        ok: false,
        message: "This viewer has blocked messages from you.",
      };
    }
    const pref = vProfile?.allowDirectMessagesFrom || "everyone";
    if (pref === "nobody") {
      return {
        ok: false,
        message: "This viewer has disabled incoming messages.",
      };
    }
  }

  return { ok: true };
}

// List inbox conversations for current Escort or Client
export const listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const includeArchived = req.query?.archived === "true";

    const filter = {
      "participants.userId": userId,
      deletedFor: { $ne: userId },
    };

    if (includeArchived) {
      filter.archivedBy = userId;
    } else {
      filter.archivedBy = { $ne: userId };
    }

    const conversations = await DirectConversationModel.find(filter)
      .sort({ lastMessageAt: -1 })
      .lean();

    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const other = conv.participants.find(
          (p) => String(p.userId) !== String(userId),
        );
        let peerInfo = { name: "User", avatar: "" };

        if (other?.role === "Escort") {
          const esc = await EscortModel.findById(other.userId)
            .select("name avatar country city")
            .lean();
          if (esc) {
            peerInfo = {
              id: esc._id,
              role: "Escort",
              name: esc.name,
              avatar: esc.avatar?.url || "",
              location: [esc.city, esc.country].filter(Boolean).join(", "),
            };
          }
        } else if (other?.role === "Client") {
          const cli = await ClientModel.findById(other.userId)
            .select("name avatar country city")
            .lean();
          if (cli) {
            peerInfo = {
              id: cli._id,
              role: "Client",
              name: cli.name,
              avatar: cli.avatar || "",
              location: [cli.city, cli.country].filter(Boolean).join(", "),
            };
          }
        }

        const unreadCount =
          conv.unreadCounts instanceof Map
            ? conv.unreadCounts.get(String(userId)) || 0
            : conv.unreadCounts?.[String(userId)] || 0;

        return {
          ...conv,
          peer: peerInfo,
          unreadCount,
        };
      }),
    );

    return res.status(200).json({
      success: true,
      error: false,
      conversations: formatted,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load inbox conversations.",
    });
  }
};

// Get messages inside a conversation & mark incoming as read
export const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const conv = await DirectConversationModel.findOne({
      _id: conversationId,
      "participants.userId": userId,
    });

    if (!conv) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Conversation not found.",
      });
    }

    const messages = await DirectMessageModel.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    await DirectMessageModel.updateMany(
      {
        conversationId,
        senderId: { $ne: userId },
        readAt: null,
      },
      { $set: { readAt: new Date() } },
    );

    conv.unreadCounts.set(String(userId), 0);
    await conv.save();

    return res.status(200).json({
      success: true,
      error: false,
      messages,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load conversation messages.",
    });
  }
};

// Send a private direct message
export const sendDirectMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const senderRole = req.role;
    const { recipientId, recipientRole, body } = req.body || {};

    if (
      !recipientId ||
      !recipientRole ||
      typeof body !== "string" ||
      !body.trim()
    ) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "recipientId, recipientRole, and body are required.",
      });
    }

    const escortId = senderRole === "Escort" ? senderId : recipientId;
    const clientId = senderRole === "Client" ? senderId : recipientId;

    const [bProfile, vProfile, hasSub] = await Promise.all([
      BroadcasterStreamProfileModel.findOne({ escortId }).lean(),
      ViewerLiveProfileModel.findOne({ clientId }).lean(),
      LiveCamSubscriptionModel.exists({
        viewerId: clientId,
        broadcasterId: escortId,
        status: "active",
        expiresAt: { $gt: new Date() },
      }),
    ]);

    const permission = canSendDirectMessage(
      senderRole,
      senderId,
      recipientRole,
      recipientId,
      bProfile,
      vProfile,
      Boolean(hasSub),
    );

    if (!permission.ok) {
      return res.status(403).json({
        success: false,
        error: true,
        message: permission.message,
      });
    }

    let conversation = await DirectConversationModel.findOne({
      $and: [
        { "participants.userId": senderId },
        { "participants.userId": recipientId },
      ],
    });

    if (!conversation) {
      conversation = await DirectConversationModel.create({
        participants: [
          { userId: senderId, role: senderRole },
          { userId: recipientId, role: recipientRole },
        ],
        unreadCounts: {
          [String(senderId)]: 0,
          [String(recipientId)]: 0,
        },
      });
    }

    const cleanBody = body.trim().slice(0, 2000);

    const message = await DirectMessageModel.create({
      conversationId: conversation._id,
      senderId,
      senderRole,
      body: cleanBody,
    });

    const prevUnread = conversation.unreadCounts.get(String(recipientId)) || 0;
    conversation.unreadCounts.set(String(recipientId), prevUnread + 1);
    conversation.lastMessageText = cleanBody.slice(0, 120);
    conversation.lastMessageAt = new Date();
    conversation.archivedBy = conversation.archivedBy.filter(
      (id) =>
        String(id) !== String(recipientId) && String(id) !== String(senderId),
    );
    conversation.deletedFor = conversation.deletedFor.filter(
      (id) =>
        String(id) !== String(recipientId) && String(id) !== String(senderId),
    );
    await conversation.save();

    // Emit real-time event if Socket.IO namespace is attached on app
    const io = req.app.get("io");
    if (io) {
      io.of("/livecam")
        .to(`user_${String(recipientId)}`)
        .emit("new_direct_message", {
          conversationId: String(conversation._id),
          message,
        });
    }

    return res.status(201).json({
      success: true,
      error: false,
      conversationId: conversation._id,
      message,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to send private message.",
    });
  }
};

// Archive or delete a conversation
export const updateConversationState = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { action } = req.body || {}; // "archive" | "unarchive" | "delete"

    const conv = await DirectConversationModel.findOne({
      _id: conversationId,
      "participants.userId": userId,
    });

    if (!conv) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Conversation not found.",
      });
    }

    if (action === "archive") {
      if (!conv.archivedBy.some((id) => String(id) === String(userId))) {
        conv.archivedBy.push(userId);
      }
    } else if (action === "unarchive") {
      conv.archivedBy = conv.archivedBy.filter(
        (id) => String(id) !== String(userId),
      );
    } else if (action === "delete") {
      if (!conv.deletedFor.some((id) => String(id) === String(userId))) {
        conv.deletedFor.push(userId);
      }
    }

    await conv.save();
    return res.status(200).json({
      success: true,
      error: false,
      message: "Conversation updated.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update conversation.",
    });
  }
};

// Report an abusive direct message
export const reportDirectMessage = async (req, res) => {
  try {
    const reporterId = req.user._id;
    const reporterRole = req.role;
    const { messageId, reason, details } = req.body || {};

    if (!messageId || !reason) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "messageId and reason are required.",
      });
    }

    const msg = await DirectMessageModel.findByIdAndUpdate(
      messageId,
      { $set: { isReported: true } },
      { new: true },
    );

    if (!msg) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Message not found.",
      });
    }

    const report = await ModerationReportModel.create({
      reporterId,
      reporterRole,
      targetId: msg._id,
      targetRole: "DirectMessage",
      reason: reason.trim(),
      details: (details || msg.body).trim(),
      status: "open",
    });

    return res.status(201).json({
      success: true,
      error: false,
      report,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to report message.",
    });
  }
};

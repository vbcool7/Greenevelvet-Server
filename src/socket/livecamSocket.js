import jwt from "jsonwebtoken";
import AdminModel from "../models/adminModel.js";
import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";
import StreamSessionModel from "../models/StreamSessionModel.js";
import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import ViewerLiveProfileModel from "../models/ViewerLiveProfileModel.js";
import ChatMessageModel from "../models/chatMessageModel.js";
import LiveCamSubscriptionModel from "../models/LiveCamSubscriptionModel.js";
import {
  checkChatRateLimit,
  filterProhibitedContent,
  isViewerChatSuspended,
} from "../service/chatSafetyService.js";

async function authenticateSocket(socket) {
  const rawToken =
    socket.handshake?.auth?.token ||
    socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
    "";

  if (!rawToken || !process.env.JWT_SECRET) {
    return null;
  }

  const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
  const userId = decoded._id || decoded.id || decoded.userId;
  const role = decoded.role;
  if (!userId || !role) return null;

  let user = null;
  if (role === "Admin") {
    user = await AdminModel.findById(userId).select("-password").lean();
  } else if (role === "Escort") {
    user = await EscortModel.findById(userId).select("-password").lean();
  } else if (role === "Client") {
    user = await ClientModel.findById(userId).select("-password").lean();
  }

  if (!user) return null;
  return { id: user._id, role, user };
}

function getRoomName(sessionId) {
  return `livecam_session_${String(sessionId)}`;
}

async function syncRoomViewerCount(nsp, sessionId) {
  const room = getRoomName(sessionId);
  const socketsInRoom = await nsp.in(room).fetchSockets();
  // Count distinct connected viewer clients
  const viewerIds = new Set();
  for (const s of socketsInRoom) {
    if (s.data?.auth?.role === "Client") {
      viewerIds.add(String(s.data.auth.id));
    }
  }

  const count = viewerIds.size;
  const session = await StreamSessionModel.findById(sessionId);
  if (!session) return;

  session.currentViewersCount = count;
  if (count > (session.peakViewersCount || 0)) {
    session.peakViewersCount = count;
  }
  await session.save();

  nsp.to(room).emit("viewer_count_updated", {
    sessionId: String(sessionId),
    currentViewersCount: session.currentViewersCount,
    peakViewersCount: session.peakViewersCount,
  });
}

export function initLiveCamSocket(io) {
  const nsp = io.of("/livecam");

  nsp.use(async (socket, next) => {
    try {
      const auth = await authenticateSocket(socket);
      if (!auth) {
        return next(new Error("Unauthorized socket connection"));
      }
      socket.data.auth = auth;
      // Join personal room for private messages, private session requests & alerts
      socket.join(`user_${String(auth.id)}`);
      return next();
    } catch (err) {
      return next(new Error("Socket authentication failed"));
    }
  });

  nsp.on("connection", (socket) => {
    const { id: userId, role, user } = socket.data.auth;

    // Join a live stream room & load recent chat history
    socket.on("join_stream_room", async ({ sessionId }, ack) => {
      try {
        if (!sessionId) {
          return ack?.({ ok: false, message: "sessionId is required" });
        }

        const session = await StreamSessionModel.findById(sessionId).lean();
        if (!session) {
          return ack?.({ ok: false, message: "Session not found" });
        }

        const room = getRoomName(sessionId);
        socket.join(room);
        socket.data.activeSessionId = String(sessionId);

        const recentMessages = await ChatMessageModel.find({
          sessionId,
          isDeleted: false,
        })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean();

        await syncRoomViewerCount(nsp, sessionId);

        return ack?.({
          ok: true,
          messages: recentMessages.reverse(),
          pinnedMessage: session.pinnedMessage || null,
          chatEnabled: session.chatEnabled,
        });
      } catch (err) {
        return ack?.({ ok: false, message: "Failed to join stream room" });
      }
    });

    // Leave live stream room
    socket.on("leave_stream_room", async ({ sessionId }, ack) => {
      try {
        const targetSessionId = sessionId || socket.data.activeSessionId;
        if (targetSessionId) {
          socket.leave(getRoomName(targetSessionId));
          socket.data.activeSessionId = null;
          await syncRoomViewerCount(nsp, targetSessionId);
        }
        return ack?.({ ok: true });
      } catch (err) {
        return ack?.({ ok: false });
      }
    });

    // Send live chat message
    socket.on("send_chat_message", async ({ sessionId, message }, ack) => {
      try {
        if (!sessionId || typeof message !== "string" || !message.trim()) {
          return ack?.({ ok: false, message: "Empty message" });
        }

        const session = await StreamSessionModel.findById(sessionId).lean();
        if (!session || session.status !== "live") {
          return ack?.({ ok: false, message: "Stream is not live" });
        }

        const isOwnerBroadcaster =
          role === "Escort" && String(session.broadcasterId) === String(userId);
        const isAdmin = role === "Admin";

        const bProfile = await BroadcasterStreamProfileModel.findOne({
          escortId: session.broadcasterId,
        }).lean();

        const isModerator =
          role === "Client" &&
          bProfile?.moderators?.some((m) => String(m) === String(userId));

        if (!isOwnerBroadcaster && !isAdmin) {
          if (!session.chatEnabled) {
            return ack?.({
              ok: false,
              message: "Chat is disabled for this stream",
            });
          }

          if (role === "Client") {
            const suspended = await isViewerChatSuspended(userId);
            if (suspended) {
              return ack?.({
                ok: false,
                message: "Your live chat access is temporarily suspended",
              });
            }

            const isBlocked = bProfile?.blockedViewers?.some(
              (v) => String(v) === String(userId),
            );
            if (isBlocked) {
              return ack?.({
                ok: false,
                message: "You are blocked from chatting in this room",
              });
            }

            const vProfile = await ViewerLiveProfileModel.findOne({
              clientId: userId,
            })
              .select("chatMutedInSessions")
              .lean();
            const isMutedHere = vProfile?.chatMutedInSessions?.some(
              (s) => String(s) === String(sessionId),
            );
            if (isMutedHere) {
              return ack?.({
                ok: false,
                message: "You are muted in this chat room",
              });
            }

            if (session.chatEligibleOnly) {
              const hasSub = await LiveCamSubscriptionModel.exists({
                viewerId: userId,
                broadcasterId: session.broadcasterId,
                status: "active",
                expiresAt: { $gt: new Date() },
              });
              if (!hasSub && !isModerator) {
                return ack?.({
                  ok: false,
                  message: "Chat is restricted to subscribers/eligible viewers",
                });
              }
            }
          }
        }

        const rateCheck = checkChatRateLimit(userId, sessionId);
        if (!rateCheck.allowed) {
          return ack?.({ ok: false, message: rateCheck.message });
        }

        const filterResult = filterProhibitedContent(message);
        if (!filterResult.clean) {
          return ack?.({ ok: false, message: filterResult.message });
        }

        const senderRole = isOwnerBroadcaster
          ? "Escort"
          : isAdmin
            ? "Admin"
            : isModerator
              ? "Moderator"
              : "Client";

        const senderAvatar =
          typeof user.avatar === "string"
            ? user.avatar
            : user.avatar?.url || "";

        const saved = await ChatMessageModel.create({
          sessionId,
          senderId: userId,
          senderRole,
          senderName:
            bProfile?.stageName && isOwnerBroadcaster
              ? bProfile.stageName
              : user.name || "User",
          senderAvatar,
          message: filterResult.sanitized.slice(0, 500),
        });

        nsp.to(getRoomName(sessionId)).emit("new_chat_message", saved);
        return ack?.({ ok: true, message: saved });
      } catch (err) {
        return ack?.({ ok: false, message: "Failed to send message" });
      }
    });

    // Broadcaster / Moderator / Admin moderation actions on live chat
    socket.on(
      "moderate_chat",
      async (
        { sessionId, action, messageId, targetViewerId, chatEnabled },
        ack,
      ) => {
        try {
          const session = await StreamSessionModel.findById(sessionId);
          if (!session) {
            return ack?.({ ok: false, message: "Session not found" });
          }

          const bProfile = await BroadcasterStreamProfileModel.findOne({
            escortId: session.broadcasterId,
          });

          const isOwner =
            role === "Escort" &&
            String(session.broadcasterId) === String(userId);
          const isAdmin = role === "Admin";
          const isMod =
            role === "Client" &&
            bProfile?.moderators?.some((m) => String(m) === String(userId));

          if (!isOwner && !isAdmin && !isMod) {
            return ack?.({
              ok: false,
              message: "Not authorized to moderate chat",
            });
          }

          const room = getRoomName(sessionId);

          if (action === "delete_message" && messageId) {
            await ChatMessageModel.findByIdAndUpdate(messageId, {
              $set: {
                isDeleted: true,
                deletedBy: { role, actorId: userId, at: new Date() },
              },
            });
            nsp.to(room).emit("chat_message_deleted", { messageId });
          } else if (action === "pin_message" && messageId) {
            const msg = await ChatMessageModel.findById(messageId).lean();
            if (msg) {
              session.pinnedMessage = {
                messageId: msg._id,
                text: msg.message,
                senderName: msg.senderName,
                pinnedAt: new Date(),
              };
              await session.save();
              nsp.to(room).emit("chat_pinned_updated", session.pinnedMessage);
            }
          } else if (action === "clear_chat") {
            await ChatMessageModel.updateMany(
              { sessionId, isDeleted: false },
              {
                $set: {
                  isDeleted: true,
                  deletedBy: { role, actorId: userId, at: new Date() },
                },
              },
            );
            nsp.to(room).emit("chat_cleared", { sessionId });
          } else if (action === "toggle_chat" && (isOwner || isAdmin)) {
            const nextState =
              typeof chatEnabled === "boolean"
                ? chatEnabled
                : !session.chatEnabled;
            session.chatEnabled = nextState;
            await session.save();
            nsp.to(room).emit("chat_toggled", { chatEnabled: nextState });
          } else if (action === "mute_viewer" && targetViewerId) {
            await ViewerLiveProfileModel.findOneAndUpdate(
              { clientId: targetViewerId },
              { $addToSet: { chatMutedInSessions: sessionId } },
              { upsert: true },
            );
            nsp.to(room).emit("viewer_muted", { targetViewerId });
          } else if (
            action === "block_viewer" &&
            targetViewerId &&
            (isOwner || isAdmin)
          ) {
            if (bProfile) {
              if (
                !bProfile.blockedViewers.some(
                  (v) => String(v) === String(targetViewerId),
                )
              ) {
                bProfile.blockedViewers.push(targetViewerId);
                await bProfile.save();
              }
            }
            nsp.to(room).emit("viewer_blocked", { targetViewerId });
          }

          return ack?.({ ok: true });
        } catch (err) {
          return ack?.({ ok: false, message: "Moderation action failed" });
        }
      },
    );

    socket.on("disconnect", async () => {
      if (socket.data.activeSessionId) {
        await syncRoomViewerCount(nsp, socket.data.activeSessionId);
      }
    });
  });

  return nsp;
}

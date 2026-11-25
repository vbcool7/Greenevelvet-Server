import crypto from "crypto";
import ClientModel from "../models/clientModel.js";
import PrivateSessionModel from "../models/PrivateSessionModel.js";
import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import LiveCamTransactionModel from "../models/LiveCamTransactionModel.js";
import {
  createLiveKitToken,
  createRoomIfNeeded,
  terminateLiveKitRoom,
} from "../service/livekitService.js";
import { calculateSplit } from "../service/nowpaymentsService.js";
import {
  sendLiveCamNotification,
  writeAuditLog,
} from "../service/auditService.js";

// Viewer requests a 1-to-1 private session
export const requestPrivateSession = async (req, res) => {
  try {
    const viewerId = req.user._id;
    const { broadcasterId, billingType = "per_minute" } = req.body || {};

    if (!broadcasterId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "broadcasterId is required.",
      });
    }

    const bProfile = await BroadcasterStreamProfileModel.findOne({
      escortId: broadcasterId,
    }).lean();

    if (!bProfile || !bProfile.privateSessionEnabled) {
      return res.status(403).json({
        success: false,
        error: true,
        message:
          "Private 1-to-1 sessions are not enabled for this broadcaster.",
      });
    }

    if (
      bProfile.blockedViewers?.some((id) => String(id) === String(viewerId))
    ) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You cannot request a private session with this broadcaster.",
      });
    }

    const rateAmount =
      billingType === "free" ? 0 : Number(bProfile.privateRatePerMinute || 0);

    if (rateAmount > 0) {
      const clientDoc = await ClientModel.findById(viewerId)
        .select("walletBalance")
        .lean();
      if (!clientDoc || (clientDoc.walletBalance || 0) < rateAmount) {
        return res.status(402).json({
          success: false,
          error: true,
          code: "INSUFFICIENT_WALLET_BALANCE",
          requiredAmount: rateAmount,
          message:
            "Insufficient wallet balance to start a paid private session. Please top up first.",
        });
      }
    }

    const roomName = `gv_priv_${broadcasterId.toString()}_${viewerId.toString()}_${crypto
      .randomBytes(4)
      .toString("hex")}`;

    const session = await PrivateSessionModel.create({
      roomName,
      broadcasterId,
      viewerId,
      status: "requested",
      billingType: rateAmount > 0 ? billingType : "free",
      rateAmount,
    });

    await sendLiveCamNotification({
      recipientId: broadcasterId,
      recipientModel: "Escort",
      senderId: viewerId,
      senderModel: "Client",
      type: "livecam_private_request",
      title: "New Private Session Request",
      message: `${req.user.name || "A viewer"} requested a 1-to-1 private session.`,
      link: `/livecam/studio/private-sessions`,
    });

    const io = req.app.get("io");
    if (io) {
      io.of("/livecam")
        .to(`user_${String(broadcasterId)}`)
        .emit("private_session_requested", { session });
    }

    return res.status(201).json({
      success: true,
      error: false,
      session,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to create private session request.",
    });
  }
};

// Broadcaster accepts or rejects private session request
export const respondPrivateSession = async (req, res) => {
  try {
    const broadcasterId = req.user._id;
    const { sessionId } = req.params;
    const { decision } = req.body || {}; // "accept" | "reject"

    if (!["accept", "reject"].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "decision must be 'accept' or 'reject'.",
      });
    }

    const session = await PrivateSessionModel.findOne({
      _id: sessionId,
      broadcasterId,
      status: "requested",
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Pending private session request not found.",
      });
    }

    if (decision === "reject") {
      session.status = "rejected";
      await session.save();
    } else {
      session.status = "accepted";
      await session.save();
      await createRoomIfNeeded(session.roomName, 120);
    }

    await sendLiveCamNotification({
      recipientId: session.viewerId,
      recipientModel: "Client",
      senderId: broadcasterId,
      senderModel: "Escort",
      type: "livecam_private_request",
      title:
        decision === "accept"
          ? "Private Session Accepted"
          : "Private Session Declined",
      message:
        decision === "accept"
          ? `${req.user.name || "Broadcaster"} accepted your private session request.`
          : `${req.user.name || "Broadcaster"} declined your private session request.`,
      link: `/livecam/private/${session._id}`,
    });

    const io = req.app.get("io");
    if (io) {
      io.of("/livecam")
        .to(`user_${String(session.viewerId)}`)
        .emit("private_session_responded", { session });
    }

    return res.status(200).json({
      success: true,
      error: false,
      session,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to respond to private session request.",
    });
  }
};

// Join accepted/active private 1-to-1 room & mark active
export const joinPrivateSessionRoom = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.role;
    const { sessionId } = req.params;

    const session = await PrivateSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Private session not found.",
      });
    }

    const isBroadcaster =
      role === "Escort" && String(session.broadcasterId) === String(userId);
    const isViewer =
      role === "Client" && String(session.viewerId) === String(userId);

    if (!isBroadcaster && !isViewer) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "You are not authorized to enter this private room.",
      });
    }

    if (!["accepted", "active"].includes(session.status)) {
      return res.status(409).json({
        success: false,
        error: true,
        message: `Session cannot be joined in '${session.status}' state.`,
      });
    }

    if (session.status === "accepted") {
      session.status = "active";
      session.startedAt = session.startedAt || new Date();
      await session.save();
    }

    await createRoomIfNeeded(session.roomName, 120);

    const livekit = await createLiveKitToken({
      identity: `${role.toLowerCase()}_${userId.toString()}`,
      name: req.user.name || (isBroadcaster ? "Broadcaster" : "Viewer"),
      roomName: session.roomName,
      role: "private_participant",
    });

    return res.status(200).json({
      success: true,
      error: false,
      session,
      livekit,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to join private session room.",
    });
  }
};

// End, cancel, or handle interruption of private session & settle billing safely
export const finishPrivateSession = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.role;
    const { sessionId } = req.params;
    const { reason = "", interrupted = false } = req.body || {};

    const session = await PrivateSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Private session not found.",
      });
    }

    const isBroadcaster =
      role === "Escort" && String(session.broadcasterId) === String(userId);
    const isViewer =
      role === "Client" && String(session.viewerId) === String(userId);

    if (!isBroadcaster && !isViewer) {
      return res.status(403).json({
        success: false,
        error: true,
        message: "Not authorized for this session.",
      });
    }

    if (["completed", "cancelled", "rejected"].includes(session.status)) {
      return res.status(200).json({
        success: true,
        error: false,
        session,
      });
    }

    const now = new Date();
    let elapsedSeconds = 0;

    if (session.status === "requested" || session.status === "accepted") {
      session.status = "cancelled";
      session.endedAt = now;
      session.cancelReason = reason.trim();
    } else {
      elapsedSeconds = session.startedAt
        ? Math.max(0, Math.floor((now - new Date(session.startedAt)) / 1000))
        : 0;
      session.durationSeconds = (session.durationSeconds || 0) + elapsedSeconds;
      session.endedAt = now;
      session.status = interrupted ? "interrupted" : "completed";
      session.cancelReason = reason.trim();

      // Calculate charge (minimum 1 minute if active & paid)
      if (session.rateAmount > 0 && session.billingType !== "free") {
        const billedUnits =
          session.billingType === "fixed"
            ? 1
            : Math.max(1, Math.ceil(elapsedSeconds / 60));
        const grossAmount = Number(
          (billedUnits * session.rateAmount).toFixed(2),
        );

        // Atomic wallet deduction with balance guard
        const debitedClient = await ClientModel.findOneAndUpdate(
          { _id: session.viewerId, walletBalance: { $gte: grossAmount } },
          { $inc: { walletBalance: -grossAmount } },
          { new: true },
        );

        const actualCharged = debitedClient ? grossAmount : 0;
        session.totalCharged = actualCharged;

        if (actualCharged > 0) {
          const split = calculateSplit(actualCharged);

          await LiveCamTransactionModel.create({
            payerId: session.viewerId,
            broadcasterId: session.broadcasterId,
            type: "private_session",
            provider: "internal_wallet",
            priceAmount: actualCharged,
            commissionRate: split.commissionRate,
            commissionAmount: split.commissionAmount,
            netBroadcasterAmount: split.netBroadcasterAmount,
            status: "finished",
            meta: {
              privateSessionId: session._id.toString(),
              durationSeconds: elapsedSeconds,
            },
          });

          await BroadcasterStreamProfileModel.findOneAndUpdate(
            { escortId: session.broadcasterId },
            {
              $inc: {
                "statsSummary.totalEarnings": split.netBroadcasterAmount,
                "statsSummary.availableBalance": split.netBroadcasterAmount,
              },
            },
            { upsert: true },
          );
        }
      }
    }

    await session.save();
    await terminateLiveKitRoom(session.roomName);

    const peerId = isBroadcaster ? session.viewerId : session.broadcasterId;
    const io = req.app.get("io");
    if (io) {
      io.of("/livecam")
        .to(`user_${String(peerId)}`)
        .emit("private_session_closed", {
          sessionId: String(session._id),
          status: session.status,
        });
    }

    await writeAuditLog({
      actorId: userId,
      actorRole: role,
      action: `PRIVATE_SESSION_${session.status.toUpperCase()}`,
      targetType: "PrivateSession",
      targetId: session._id,
      metadata: {
        durationSeconds: session.durationSeconds,
        totalCharged: session.totalCharged,
      },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      error: false,
      session,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to close private session.",
    });
  }
};

// List private session history for current broadcaster or viewer
export const listPrivateSessions = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.role;

    const filter =
      role === "Escort" ? { broadcasterId: userId } : { viewerId: userId };

    const sessions = await PrivateSessionModel.find(filter)
      .populate("broadcasterId", "name escortId avatar")
      .populate("viewerId", "name clientId avatar")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.status(200).json({
      success: true,
      error: false,
      sessions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load private sessions.",
    });
  }
};

import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";
import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import ViewerLiveProfileModel from "../models/ViewerLiveProfileModel.js";
import StreamSessionModel from "../models/StreamSessionModel.js";
import PrivateSessionModel from "../models/PrivateSessionModel.js";
import ModerationReportModel from "../models/ModerationReportModel.js";
import LiveCamTransactionModel from "../models/LiveCamTransactionModel.js";
import LiveCamPayoutModel from "../models/LiveCamPayoutModel.js";
import AuditLogModel from "../models/AuditLogModel.js";
import { terminateLiveKitRoom } from "../service/livekitService.js";
import {
  writeAuditLog,
  sendLiveCamNotification,
} from "../service/auditService.js";

// List broadcasters with their Live Cam eligibility & verification status
export const listBroadcastersForAdmin = async (req, res) => {
  try {
    const statusFilter = req.query?.eligibility || "";
    const query = {};
    if (
      ["pending", "approved", "rejected", "suspended"].includes(statusFilter)
    ) {
      query.broadcastEligibility = statusFilter;
    }

    const profiles = await BroadcasterStreamProfileModel.find(query)
      .populate({
        path: "escortId",
        select:
          "name email escortId avatar country city isVerified status govtId selfieStatus",
      })
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      error: false,
      broadcasters: profiles,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load broadcasters list.",
    });
  }
};

// Approve, reject, or suspend broadcaster eligibility for Live Cams
export const updateBroadcasterEligibility = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { escortId } = req.params;
    const {
      eligibility, // "approved" | "rejected" | "suspended" | "pending"
      note = "",
      isAgeVerified,
      isIdentityVerified,
    } = req.body || {};

    if (
      !["pending", "approved", "rejected", "suspended"].includes(eligibility)
    ) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid eligibility status.",
      });
    }

    const escortDoc = await EscortModel.findById(escortId)
      .select("isVerified govtId selfieStatus")
      .lean();
    if (!escortDoc) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Broadcaster not found.",
      });
    }

    let profile = await BroadcasterStreamProfileModel.findOne({ escortId });
    if (!profile) {
      profile = new BroadcasterStreamProfileModel({ escortId });
    }

    if (typeof isAgeVerified === "boolean") {
      profile.isAgeVerified = isAgeVerified;
    } else if (eligibility === "approved" && escortDoc.isVerified) {
      profile.isAgeVerified = true;
    }

    if (typeof isIdentityVerified === "boolean") {
      profile.isIdentityVerified = isIdentityVerified;
    } else if (
      eligibility === "approved" &&
      (escortDoc.isVerified ||
        (escortDoc.govtId === "Approved" &&
          escortDoc.selfieStatus === "Approved"))
    ) {
      profile.isIdentityVerified = true;
    }

    profile.broadcastEligibility = eligibility;
    profile.eligibilityNote = note.trim();
    await profile.save();

    // If suspended or rejected, terminate any active live stream immediately
    if (["suspended", "rejected"].includes(eligibility)) {
      const activeSessions = await StreamSessionModel.find({
        broadcasterId: escortId,
        status: "live",
      });
      for (const s of activeSessions) {
        s.status = "terminated";
        s.endedAt = new Date();
        s.currentViewersCount = 0;
        s.connectionHealth = "offline";
        s.terminatedBy = {
          role: "Admin",
          actorId: adminId,
          reason: note.trim() || `Eligibility set to ${eligibility}`,
          at: new Date(),
        };
        await s.save();
        await terminateLiveKitRoom(s.roomName);
      }
    }

    await sendLiveCamNotification({
      recipientId: escortId,
      recipientModel: "Escort",
      senderId: adminId,
      senderModel: "Admin",
      type: "livecam_moderation_alert",
      title: `Live Cam Eligibility: ${eligibility.toUpperCase()}`,
      message:
        note.trim() ||
        `Your Live Cam broadcasting status is now ${eligibility}.`,
      link: "/livecam/studio",
    });

    await writeAuditLog({
      actorId: adminId,
      actorRole: "Admin",
      action: `BROADCASTER_ELIGIBILITY_${eligibility.toUpperCase()}`,
      targetType: "BroadcasterStreamProfile",
      targetId: profile._id,
      metadata: { escortId: String(escortId), note: note.trim() },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      error: false,
      profile,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update broadcaster eligibility.",
    });
  }
};

// Monitor active & recent streams (plus private sessions)
export const listLiveSessionsForAdmin = async (req, res) => {
  try {
    const status = req.query?.status || "live";
    const filter = status === "all" ? {} : { status };

    const [streams, privateSessions] = await Promise.all([
      StreamSessionModel.find(filter)
        .populate("broadcasterId", "name escortId avatar country city")
        .sort({ startedAt: -1, createdAt: -1 })
        .limit(100)
        .lean(),
      PrivateSessionModel.find({})
        .populate("broadcasterId", "name escortId")
        .populate("viewerId", "name clientId")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      error: false,
      streams,
      privateSessions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load live sessions.",
    });
  }
};

// Feature / unfeature a stream or force-terminate an active broadcast
export const controlStreamSession = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { sessionId } = req.params;
    const { action, reason = "", isFeatured } = req.body || {}; // "terminate" | "feature"

    const session = await StreamSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Stream session not found.",
      });
    }

    if (action === "feature" || typeof isFeatured === "boolean") {
      session.isFeatured =
        typeof isFeatured === "boolean" ? isFeatured : !session.isFeatured;
      await session.save();

      await writeAuditLog({
        actorId: adminId,
        actorRole: "Admin",
        action: session.isFeatured ? "STREAM_FEATURED" : "STREAM_UNFEATURED",
        targetType: "StreamSession",
        targetId: session._id,
        ipAddress: req.ip || "",
      });

      return res.status(200).json({
        success: true,
        error: false,
        session,
      });
    }

    if (action === "terminate") {
      const now = new Date();
      const elapsed = session.startedAt
        ? Math.max(0, Math.floor((now - new Date(session.startedAt)) / 1000))
        : 0;

      session.status = "terminated";
      session.endedAt = now;
      session.durationSeconds = (session.durationSeconds || 0) + elapsed;
      session.currentViewersCount = 0;
      session.connectionHealth = "offline";
      session.terminatedBy = {
        role: "Admin",
        actorId: adminId,
        reason: reason.trim() || "Terminated by administrator",
        at: now,
      };
      await session.save();

      await terminateLiveKitRoom(session.roomName);

      const io = req.app.get("io");
      if (io) {
        io.of("/livecam")
          .to(`livecam_session_${String(session._id)}`)
          .emit("stream_force_terminated", {
            sessionId: String(session._id),
            reason: session.terminatedBy.reason,
          });
      }

      await sendLiveCamNotification({
        recipientId: session.broadcasterId,
        recipientModel: "Escort",
        senderId: adminId,
        senderModel: "Admin",
        type: "livecam_moderation_alert",
        title: "Live Stream Terminated",
        message: `Your stream "${session.title}" was stopped by admin: ${session.terminatedBy.reason}`,
        link: "/livecam/studio",
      });

      await writeAuditLog({
        actorId: adminId,
        actorRole: "Admin",
        action: "STREAM_TERMINATED_BY_ADMIN",
        targetType: "StreamSession",
        targetId: session._id,
        metadata: { reason: session.terminatedBy.reason },
        ipAddress: req.ip || "",
      });

      return res.status(200).json({
        success: true,
        error: false,
        session,
      });
    }

    return res.status(400).json({
      success: false,
      error: true,
      message: "Invalid control action.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to execute stream control action.",
    });
  }
};

// Moderation reports queue, appeals & enforcement
export const listModerationReports = async (req, res) => {
  try {
    const status = req.query?.status || "";
    const filter = status ? { status } : {};

    const reports = await ModerationReportModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      error: false,
      reports,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load moderation reports.",
    });
  }
};

export const resolveModerationReport = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { reportId } = req.params;
    const {
      status, // "under_review" | "resolved" | "dismissed"
      actionTaken = "",
      adminNotes = "",
      suspendChatHours = 0,
      suspendBroadcaster = false,
    } = req.body || {};

    const report = await ModerationReportModel.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Moderation report not found.",
      });
    }

    if (status) report.status = status;
    if (actionTaken) report.actionTaken = actionTaken.trim();
    if (adminNotes) report.adminNotes = adminNotes.trim();
    report.reviewedBy = adminId;
    report.reviewedAt = new Date();
    await report.save();

    if (Number(suspendChatHours) > 0 && report.targetRole === "Client") {
      const until = new Date(
        Date.now() + Number(suspendChatHours) * 3600 * 1000,
      );
      await ViewerLiveProfileModel.findOneAndUpdate(
        { clientId: report.targetId },
        { $set: { chatSuspendedUntil: until } },
        { upsert: true },
      );
    }

    if (suspendBroadcaster && report.targetRole === "Escort") {
      await BroadcasterStreamProfileModel.findOneAndUpdate(
        { escortId: report.targetId },
        {
          $set: {
            broadcastEligibility: "suspended",
            eligibilityNote:
              actionTaken.trim() || "Suspended due to moderation review",
          },
        },
        { upsert: true },
      );
    }

    await writeAuditLog({
      actorId: adminId,
      actorRole: "Admin",
      action: "MODERATION_REPORT_REVIEWED",
      targetType: "ModerationReport",
      targetId: report._id,
      metadata: {
        status: report.status,
        actionTaken: report.actionTaken,
        suspendChatHours,
        suspendBroadcaster,
      },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      error: false,
      report,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to resolve moderation report.",
    });
  }
};

// Financials, payouts & audit logs
export const getAdminFinancialOverview = async (req, res) => {
  try {
    const [transactions, payouts, auditLogs] = await Promise.all([
      LiveCamTransactionModel.find({})
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      LiveCamPayoutModel.find({})
        .populate("broadcasterId", "name escortId email")
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
      AuditLogModel.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    const settled = transactions.filter((t) =>
      ["finished", "confirmed"].includes(t.status),
    );
    const grossVolume = settled.reduce((s, t) => s + (t.priceAmount || 0), 0);
    const platformCommission = settled.reduce(
      (s, t) => s + (t.commissionAmount || 0),
      0,
    );
    const broadcasterNetTotal = settled.reduce(
      (s, t) => s + (t.netBroadcasterAmount || 0),
      0,
    );

    return res.status(200).json({
      success: true,
      error: false,
      metrics: {
        grossVolume: Number(grossVolume.toFixed(2)),
        platformCommission: Number(platformCommission.toFixed(2)),
        broadcasterNetTotal: Number(broadcasterNetTotal.toFixed(2)),
        totalTransactions: transactions.length,
        pendingPayoutsCount: payouts.filter((p) => p.status === "requested")
          .length,
      },
      transactions,
      payouts,
      auditLogs,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load admin financial overview.",
    });
  }
};

export const processPayoutByAdmin = async (req, res) => {
  try {
    const adminId = req.user._id;
    const { payoutId } = req.params;
    const {
      decision, // "approve" | "complete" | "reject"
      nowpaymentsPayoutId = "",
      adminNote = "",
    } = req.body || {};

    const payout = await LiveCamPayoutModel.findById(payoutId);
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Payout request not found.",
      });
    }

    if (payout.status === "completed" || payout.status === "rejected") {
      return res.status(409).json({
        success: false,
        error: true,
        message: `Payout is already ${payout.status}.`,
      });
    }

    if (decision === "reject") {
      payout.status = "rejected";
      payout.adminNote = adminNote.trim();
      payout.processedBy = adminId;
      payout.processedAt = new Date();
      await payout.save();

      // Refund reserved amount back to broadcaster available balance
      await BroadcasterStreamProfileModel.findOneAndUpdate(
        { escortId: payout.broadcasterId },
        { $inc: { "statsSummary.availableBalance": payout.amount } },
      );
    } else if (decision === "approve") {
      payout.status = "approved";
      if (nowpaymentsPayoutId)
        payout.nowpaymentsPayoutId = nowpaymentsPayoutId.trim();
      payout.adminNote = adminNote.trim();
      payout.processedBy = adminId;
      payout.processedAt = new Date();
      await payout.save();
    } else if (decision === "complete") {
      payout.status = "completed";
      if (nowpaymentsPayoutId)
        payout.nowpaymentsPayoutId = nowpaymentsPayoutId.trim();
      payout.adminNote = adminNote.trim();
      payout.processedBy = adminId;
      payout.processedAt = new Date();
      await payout.save();

      await LiveCamTransactionModel.findOneAndUpdate(
        { type: "payout", "meta.payoutId": payout._id.toString() },
        { $set: { status: "finished" } },
      );
    } else {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid payout decision.",
      });
    }

    await sendLiveCamNotification({
      recipientId: payout.broadcasterId,
      recipientModel: "Escort",
      senderId: adminId,
      senderModel: "Admin",
      type: "livecam_payment_update",
      title: `Payout ${payout.status.toUpperCase()}`,
      message: `Your payout request of $${payout.amount} (${payout.currency}) is now ${payout.status}.`,
      link: "/livecam/earnings",
    });

    await writeAuditLog({
      actorId: adminId,
      actorRole: "Admin",
      action: `PAYOUT_${payout.status.toUpperCase()}`,
      targetType: "LiveCamPayout",
      targetId: payout._id,
      metadata: { amount: payout.amount, currency: payout.currency },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      error: false,
      payout,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to process payout.",
    });
  }
};

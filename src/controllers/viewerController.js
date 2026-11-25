import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";
import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import ViewerLiveProfileModel from "../models/ViewerLiveProfileModel.js";
import StreamSessionModel from "../models/StreamSessionModel.js";
import LiveCamSubscriptionModel from "../models/LiveCamSubscriptionModel.js";
import LiveCamTransactionModel from "../models/LiveCamTransactionModel.js";
import ModerationReportModel from "../models/ModerationReportModel.js";
import { createLiveKitToken } from "../service/livekitService.js";
import { writeAuditLog } from "../service/auditService.js";

async function ensureViewerProfile(clientId) {
  let profile = await ViewerLiveProfileModel.findOne({ clientId });
  if (!profile) {
    profile = await ViewerLiveProfileModel.create({ clientId });
  }
  return profile;
}

// Discover live, featured, recently active & scheduled streams
export const discoverStreams = async (req, res) => {
  try {
    const {
      country = "",
      city = "",
      category = "",
      language = "",
      sort = "popularity", // "popularity" | "relevance"
      tab = "all", // "all" | "featured" | "recent" | "scheduled"
      page = 1,
      limit = 24,
    } = req.query || {};

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 24));
    const skip = (pageNum - 1) * limitNum;

    const baseFilter = {};
    if (tab === "scheduled") {
      baseFilter.status = "scheduled";
    } else {
      baseFilter.status = "live";
      if (tab === "featured") {
        baseFilter.isFeatured = true;
      }
    }

    if (country.trim()) {
      baseFilter.country = new RegExp(`^${country.trim()}$`, "i");
    }
    if (city.trim()) {
      baseFilter.city = new RegExp(`^${city.trim()}$`, "i");
    }
    if (category.trim() && category.toLowerCase() !== "all") {
      baseFilter.category = new RegExp(`^${category.trim()}$`, "i");
    }
    if (language.trim() && language.toLowerCase() !== "all") {
      baseFilter.language = new RegExp(`^${language.trim()}$`, "i");
    }

    let sortSpec = {
      isFeatured: -1,
      currentViewersCount: -1,
      startedAt: -1,
    };

    if (tab === "recent") {
      sortSpec = { startedAt: -1, updatedAt: -1 };
    } else if (tab === "scheduled") {
      sortSpec = { scheduledFor: 1, createdAt: -1 };
    } else if (sort === "relevance") {
      sortSpec = { isFeatured: -1, peakViewersCount: -1, startedAt: -1 };
    }

    const [streams, total, recentlyActiveBroadcasters] = await Promise.all([
      StreamSessionModel.find(baseFilter)
        .populate({
          path: "broadcasterId",
          select:
            "name escortId avatar country city speakingLanguage isVerified status",
        })
        .sort(sortSpec)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StreamSessionModel.countDocuments(baseFilter),
      StreamSessionModel.find({
        status: { $in: ["ended", "terminated"] },
        endedAt: { $ne: null },
      })
        .populate({
          path: "broadcasterId",
          select:
            "name escortId avatar country city speakingLanguage isVerified",
        })
        .sort({ endedAt: -1 })
        .limit(12)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      error: false,
      streams,
      recentlyActive: recentlyActiveBroadcasters,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load live cam discovery list.",
    });
  }
};

// Get single stream metadata (for player & availability status)
export const getStreamDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await StreamSessionModel.findById(sessionId)
      .populate({
        path: "broadcasterId",
        select:
          "name escortId avatar country city speakingLanguage about highlights isVerified status",
      })
      .lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Stream session not found.",
      });
    }

    const broadcasterProfile = await BroadcasterStreamProfileModel.findOne({
      escortId: session.broadcasterId?._id || session.broadcasterId,
    })
      .select(
        "stageName bio defaultVisibility payPerViewPrice monthlyMembershipPrice privateSessionEnabled privateRatePerMinute",
      )
      .lean();

    return res.status(200).json({
      success: true,
      error: false,
      session,
      broadcasterSettings: broadcasterProfile || {},
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to fetch stream details.",
    });
  }
};

// Authorize viewer and issue signed playback token for live stream
export const joinStreamSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;
    const role = req.role;

    const session = await StreamSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Stream not found.",
      });
    }

    if (session.status !== "live") {
      return res.status(409).json({
        success: false,
        error: true,
        code: "STREAM_UNAVAILABLE",
        status: session.status,
        message:
          session.status === "terminated"
            ? "This broadcast has been terminated."
            : "This broadcast is currently offline.",
      });
    }

    if (role === "Client") {
      const viewerProfile = await ensureViewerProfile(userId);
      if (!viewerProfile.isAgeAssured) {
        return res.status(403).json({
          success: false,
          error: true,
          code: "AGE_ASSURANCE_REQUIRED",
          message:
            "Please confirm 18+ age assurance before watching live streams.",
        });
      }

      if (
        viewerProfile.blockedBroadcasters?.some(
          (id) => id.toString() === session.broadcasterId.toString(),
        )
      ) {
        return res.status(403).json({
          success: false,
          error: true,
          message: "You have blocked this broadcaster.",
        });
      }

      const broadcasterProfile = await BroadcasterStreamProfileModel.findOne({
        escortId: session.broadcasterId,
      }).lean();

      if (
        broadcasterProfile?.blockedViewers?.some(
          (id) => id.toString() === userId.toString(),
        )
      ) {
        return res.status(403).json({
          success: false,
          error: true,
          message: "You cannot join this broadcaster's stream.",
        });
      }

      // Check Paid / Subscriber access rules
      if (session.visibility === "paid" && session.entryFee > 0) {
        const paidTx = await LiveCamTransactionModel.findOne({
          payerId: userId,
          broadcasterId: session.broadcasterId,
          type: "paid_stream",
          status: { $in: ["finished", "confirmed"] },
          "meta.sessionId": session._id.toString(),
        }).lean();

        if (!paidTx) {
          return res.status(402).json({
            success: false,
            error: true,
            code: "PAID_STREAM_REQUIRED",
            entryFee: session.entryFee,
            message: "Payment is required to access this live stream.",
          });
        }
      }

      if (session.visibility === "subscribers") {
        const activeSub = await LiveCamSubscriptionModel.findOne({
          viewerId: userId,
          broadcasterId: session.broadcasterId,
          status: "active",
          expiresAt: { $gt: new Date() },
        }).lean();

        if (!activeSub) {
          return res.status(402).json({
            success: false,
            error: true,
            code: "SUBSCRIPTION_REQUIRED",
            message:
              "An active monthly subscription is required for this stream.",
          });
        }
      }

      // Update unique viewers & watch history safely
      const alreadySeen = session.viewerIdsSeen?.some(
        (id) => id.toString() === userId.toString(),
      );
      if (!alreadySeen) {
        session.viewerIdsSeen.push(userId);
        session.uniqueViewersCount = (session.uniqueViewersCount || 0) + 1;
      }
      session.totalViewersCount = (session.totalViewersCount || 0) + 1;
      await session.save();

      const existingHistoryIdx = viewerProfile.liveWatchHistory.findIndex(
        (entry) => entry.sessionId.toString() === session._id.toString(),
      );
      if (existingHistoryIdx >= 0) {
        viewerProfile.liveWatchHistory[existingHistoryIdx].lastWatchedAt =
          new Date();
      } else {
        viewerProfile.liveWatchHistory.unshift({
          sessionId: session._id,
          broadcasterId: session.broadcasterId,
          watchedSeconds: 0,
          lastWatchedAt: new Date(),
        });
        if (viewerProfile.liveWatchHistory.length > 100) {
          viewerProfile.liveWatchHistory = viewerProfile.liveWatchHistory.slice(
            0,
            100,
          );
        }
      }
      await viewerProfile.save();
    }

    const identity = `${role.toLowerCase()}_${userId.toString()}`;
    const displayName = req.user.name || "Viewer";

    const livekit = await createLiveKitToken({
      identity,
      name: displayName,
      roomName: session.roomName,
      role: "viewer",
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
      message: "Failed to join stream session.",
    });
  }
};

// Get or update viewer live profile, age assurance & notification preferences
export const getOrUpdateViewerProfile = async (req, res) => {
  try {
    const clientId = req.user._id;
    const profile = await ensureViewerProfile(clientId);

    if (req.method === "PUT" || req.method === "PATCH") {
      const {
        confirmAge18Plus,
        allowDirectMessagesFrom,
        notificationPrefs,
        watchedSeconds,
        sessionId,
      } = req.body || {};

      if (confirmAge18Plus === true && !profile.isAgeAssured) {
        profile.isAgeAssured = true;
        profile.ageAssuredAt = new Date();
      }

      if (
        ["everyone", "broadcasters", "nobody"].includes(allowDirectMessagesFrom)
      ) {
        profile.allowDirectMessagesFrom = allowDirectMessagesFrom;
      }

      if (notificationPrefs && typeof notificationPrefs === "object") {
        const keys = [
          "favBroadcasterLive",
          "streamAvailability",
          "chatReplies",
          "privateMessages",
          "sessionRequests",
          "billingAlerts",
          "chatSoundEnabled",
        ];
        for (const k of keys) {
          if (typeof notificationPrefs[k] === "boolean") {
            profile.notificationPrefs[k] = notificationPrefs[k];
          }
        }
      }

      if (
        sessionId &&
        typeof watchedSeconds === "number" &&
        watchedSeconds > 0
      ) {
        const idx = profile.liveWatchHistory.findIndex(
          (e) => e.sessionId.toString() === sessionId.toString(),
        );
        if (idx >= 0) {
          profile.liveWatchHistory[idx].watchedSeconds +=
            Math.floor(watchedSeconds);
          profile.liveWatchHistory[idx].lastWatchedAt = new Date();
        }
      }

      await profile.save();
    }

    const clientDoc = await ClientModel.findById(clientId)
      .select("name email mobile country city favorites walletBalance status")
      .populate({
        path: "favorites",
        select: "name escortId avatar country city isVerified",
      })
      .lean();

    return res.status(200).json({
      success: true,
      error: false,
      profile,
      account: clientDoc,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load or update viewer profile.",
    });
  }
};

// Toggle favorite broadcaster (reuses existing Client.favorites safely)
export const toggleFavoriteBroadcaster = async (req, res) => {
  try {
    const clientId = req.user._id;
    const { broadcasterId } = req.body || {};

    if (!broadcasterId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "broadcasterId is required.",
      });
    }

    const escortExists = await EscortModel.exists({ _id: broadcasterId });
    if (!escortExists) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Broadcaster not found.",
      });
    }

    const clientDoc = await ClientModel.findById(clientId).select("favorites");
    const exists = clientDoc.favorites.some(
      (id) => id.toString() === broadcasterId.toString(),
    );

    if (exists) {
      clientDoc.favorites = clientDoc.favorites.filter(
        (id) => id.toString() !== broadcasterId.toString(),
      );
    } else {
      clientDoc.favorites.push(broadcasterId);
    }

    await clientDoc.save();

    return res.status(200).json({
      success: true,
      error: false,
      isFavorite: !exists,
      favorites: clientDoc.favorites,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update favorite broadcaster.",
    });
  }
};

// Block or unblock a broadcaster or viewer
export const toggleBlockAccount = async (req, res) => {
  try {
    const clientId = req.user._id;
    const {
      targetId,
      targetType = "broadcaster",
      unblock = false,
    } = req.body || {};

    if (!targetId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "targetId is required.",
      });
    }

    const field =
      targetType === "viewer" ? "blockedViewers" : "blockedBroadcasters";

    const updateOp = unblock
      ? { $pull: { [field]: targetId } }
      : { $addToSet: { [field]: targetId } };

    const updated = await ViewerLiveProfileModel.findOneAndUpdate(
      { clientId },
      updateOp,
      { new: true, upsert: true },
    );

    return res.status(200).json({
      success: true,
      error: false,
      blockedBroadcasters: updated.blockedBroadcasters,
      blockedViewers: updated.blockedViewers,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update block list.",
    });
  }
};

// Report a broadcaster or stream
export const reportBroadcasterOrStream = async (req, res) => {
  try {
    const clientId = req.user._id;
    const { broadcasterId, sessionId, reason, details } = req.body || {};

    if (!broadcasterId || !reason) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "broadcasterId and reason are required.",
      });
    }

    const report = await ModerationReportModel.create({
      reporterId: clientId,
      reporterRole: "Client",
      targetId: broadcasterId,
      targetRole: sessionId ? "StreamSession" : "Escort",
      sessionId: sessionId || null,
      reason: reason.trim(),
      details: (details || "").trim(),
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
      message: "Failed to submit report.",
    });
  }
};

// Viewer account deletion / deactivation request (logged for compliance & audit)
export const requestViewerAccountDeletion = async (req, res) => {
  try {
    const clientId = req.user._id;
    const { reason = "" } = req.body || {};

    await ClientModel.findByIdAndUpdate(clientId, {
      $set: { status: "Inactive", isOnline: false, onlineStatus: false },
    });

    await writeAuditLog({
      actorId: clientId,
      actorRole: "Client",
      action: "VIEWER_ACCOUNT_DELETION_REQUESTED",
      targetType: "Client",
      targetId: clientId,
      metadata: { reason: reason.trim() },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      error: false,
      message: "Account deactivation and deletion request recorded.",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to process account deletion request.",
    });
  }
};

import crypto from "crypto";
import EscortModel from "../models/escortModel.js";
import ClientModel from "../models/clientModel.js";
import BroadcasterStreamProfileModel from "../models/BroadcasterStreamProfileModel.js";
import StreamSessionModel from "../models/StreamSessionModel.js";
import ModerationReportModel from "../models/ModerationReportModel.js";
import {
  createLiveKitToken,
  createRoomIfNeeded,
  terminateLiveKitRoom,
} from "../service/livekitService.js";
import {
  writeAuditLog,
  sendLiveCamNotification,
} from "../service/auditService.js";

function computeDurationSeconds(startedAt, endedAt = new Date()) {
  if (!startedAt) return 0;
  return Math.max(
    0,
    Math.floor((new Date(endedAt) - new Date(startedAt)) / 1000),
  );
}

// Get or initialize broadcaster stream profile (syncs read-only verification status from Escort)
export const getOrUpdateBroadcasterProfile = async (req, res) => {
  console.log("[BroadcasterController] getOrUpdateBroadcasterProfile called", {
    method: req.method,
    userId: req.user?._id,
    bodyKeys: Object.keys(req.body || {}),
  });

  try {
    const escortId = req.user._id;
    const escortDoc = await EscortModel.findById(escortId)
      .select(
        "name isVerified govtId selfieStatus hasAcceptedIdentity country city speakingLanguage avatar",
      )
      .lean();

    if (!escortDoc) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Broadcaster account not found.",
      });
    }

    let profile = await BroadcasterStreamProfileModel.findOne({ escortId });
    if (!profile) {
      profile = await BroadcasterStreamProfileModel.create({
        escortId,
        stageName: escortDoc.name || "",
        isAgeVerified: Boolean(
          escortDoc.isVerified || escortDoc.hasAcceptedIdentity,
        ),
        isIdentityVerified: Boolean(
          escortDoc.isVerified ||
          (escortDoc.govtId === "Approved" &&
            escortDoc.selfieStatus === "Approved"),
        ),
      });
    }

    if (req.method === "PUT" || req.method === "PATCH") {
      const {
        stageName,
        bio,
        defaultVisibility,
        payPerViewPrice,
        monthlyMembershipPrice,
        privateSessionEnabled,
        privateRatePerMinute,
        allowDirectMessagesFrom,
        payoutCurrency,
        payoutWalletAddress,
        acceptBroadcastConsent,
        confirmAgeVerified,
      } = req.body || {};

      if (typeof stageName === "string") profile.stageName = stageName.trim();
      if (typeof bio === "string") profile.bio = bio.trim();
      if (["public", "paid", "subscribers"].includes(defaultVisibility)) {
        profile.defaultVisibility = defaultVisibility;
      }
      if (typeof payPerViewPrice === "number" && payPerViewPrice >= 0) {
        profile.payPerViewPrice = payPerViewPrice;
      }
      if (
        typeof monthlyMembershipPrice === "number" &&
        monthlyMembershipPrice >= 0
      ) {
        profile.monthlyMembershipPrice = monthlyMembershipPrice;
      }
      if (typeof privateSessionEnabled === "boolean") {
        profile.privateSessionEnabled = privateSessionEnabled;
      }
      if (
        typeof privateRatePerMinute === "number" &&
        privateRatePerMinute >= 0
      ) {
        profile.privateRatePerMinute = privateRatePerMinute;
      }
      if (
        ["everyone", "subscribers", "nobody"].includes(allowDirectMessagesFrom)
      ) {
        profile.allowDirectMessagesFrom = allowDirectMessagesFrom;
      }
      if (typeof payoutCurrency === "string" && payoutCurrency.trim()) {
        profile.payoutCurrency = payoutCurrency.trim();
      }
      if (typeof payoutWalletAddress === "string") {
        profile.payoutWalletAddress = payoutWalletAddress.trim();
      }

      if (
        confirmAgeVerified === true &&
        (escortDoc.isVerified || escortDoc.hasAcceptedIdentity)
      ) {
        profile.isAgeVerified = true;
      }
      if (
        escortDoc.isVerified ||
        (escortDoc.govtId === "Approved" &&
          escortDoc.selfieStatus === "Approved")
      ) {
        profile.isIdentityVerified = true;
        profile.isAgeVerified = true;
      }

      if (
        acceptBroadcastConsent === true &&
        !profile.hasAcceptedBroadcastConsent
      ) {
        profile.hasAcceptedBroadcastConsent = true;
        profile.consentAcceptedAt = new Date();
      }

      await profile.save();

      await writeAuditLog({
        actorId: escortId,
        actorRole: "Escort",
        action: "BROADCASTER_PROFILE_UPDATED",
        targetType: "BroadcasterStreamProfile",
        targetId: profile._id,
        ipAddress: req.ip || "",
      });
    }

    // Restore currently active live session & LiveKit token across page refreshes
    const activeSession = await StreamSessionModel.findOne({
      broadcasterId: escortId,
      status: "live",
    })
      .sort({ startedAt: -1 })
      .lean();

    let livekit = null;
    if (activeSession?.roomName) {
      await createRoomIfNeeded(activeSession.roomName);
      livekit = await createLiveKitToken({
        identity: `escort_${escortId.toString()}`,
        name: profile?.stageName || escortDoc?.name || "Broadcaster",
        roomName: activeSession.roomName,
        role: "broadcaster",
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      profile,
      activeSession: activeSession || null,
      livekit,
      accountVerification: {
        isVerified: Boolean(escortDoc.isVerified),
        govtId: escortDoc.govtId || "Pending",
        selfieStatus: escortDoc.selfieStatus || "Pending",
      },
    });
  } catch (err) {
    console.error(
      "[BroadcasterController] getOrUpdateBroadcasterProfile error:",
      err,
    );
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load or update broadcaster profile.",
    });
  }
};

// Prepare studio & issue signed broadcaster LiveKit token (recording disabled)
export const prepareLiveStudio = async (req, res) => {
  console.log("[BroadcasterController] prepareLiveStudio called", {
    userId: req.user?._id,
    body: req.body,
  });

  try {
    const escortId = req.user._id;
    const {
      title,
      description,
      category,
      language,
      country,
      city,
      visibility,
      entryFee,
      chatEnabled,
      chatEligibleOnly,
      scheduledFor,
    } = req.body || {};

    const escortDoc = await EscortModel.findById(escortId)
      .select("name country city speakingLanguage avatar")
      .lean();

    let session = await StreamSessionModel.findOne({
      broadcasterId: escortId,
      status: { $in: ["live", "scheduled"] },
    }).sort({ createdAt: -1 });

    const roomName =
      session?.roomName ||
      `gv_live_${escortId.toString()}_${crypto.randomBytes(4).toString("hex")}`;

    if (!session) {
      session = await StreamSessionModel.create({
        broadcasterId: escortId,
        roomName,
        title: (title || `${escortDoc?.name || "Broadcaster"} Live`).trim(),
        description: (description || "").trim(),
        category: (category || "General").trim(),
        language: (
          language ||
          escortDoc?.speakingLanguage?.[0] ||
          "English"
        ).trim(),
        country: (country || escortDoc?.country || "").trim(),
        city: (city || escortDoc?.city || "").trim(),
        visibility: ["public", "paid", "subscribers"].includes(visibility)
          ? visibility
          : req.broadcasterProfile?.defaultVisibility || "public",
        entryFee:
          typeof entryFee === "number" && entryFee >= 0
            ? entryFee
            : req.broadcasterProfile?.payPerViewPrice || 0,
        chatEnabled: typeof chatEnabled === "boolean" ? chatEnabled : true,
        chatEligibleOnly:
          typeof chatEligibleOnly === "boolean" ? chatEligibleOnly : false,
        status: scheduledFor ? "scheduled" : "scheduled",
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        recordingEnabled: false,
      });
    } else {
      if (typeof title === "string" && title.trim())
        session.title = title.trim();
      if (typeof description === "string")
        session.description = description.trim();
      if (typeof category === "string" && category.trim())
        session.category = category.trim();
      if (typeof language === "string" && language.trim())
        session.language = language.trim();
      if (typeof country === "string") session.country = country.trim();
      if (typeof city === "string") session.city = city.trim();
      if (["public", "paid", "subscribers"].includes(visibility)) {
        session.visibility = visibility;
      }
      if (typeof entryFee === "number" && entryFee >= 0) {
        session.entryFee = entryFee;
      }
      if (typeof chatEnabled === "boolean") session.chatEnabled = chatEnabled;
      if (typeof chatEligibleOnly === "boolean") {
        session.chatEligibleOnly = chatEligibleOnly;
      }
      if (scheduledFor) {
        session.scheduledFor = new Date(scheduledFor);
      }
      await session.save();
    }

    await createRoomIfNeeded(session.roomName);

    const livekit = await createLiveKitToken({
      identity: `escort_${escortId.toString()}`,
      name:
        req.broadcasterProfile?.stageName || escortDoc?.name || "Broadcaster",
      roomName: session.roomName,
      role: "broadcaster",
    });

    return res.status(200).json({
      success: true,
      error: false,
      session,
      livekit,
    });
  } catch (err) {
    console.error("[BroadcasterController] prepareLiveStudio error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to prepare live studio.",
    });
  }
};

// Start broadcast session
export const startBroadcast = async (req, res) => {
  console.log("[BroadcasterController] startBroadcast called", {
    userId: req.user?._id,
    body: req.body,
  });

  try {
    const escortId = req.user._id;
    const {
      sessionId,
      title,
      description,
      category,
      language,
      visibility,
      entryFee,
    } = req.body || {};

    await StreamSessionModel.updateMany(
      {
        broadcasterId: escortId,
        status: "live",
        ...(sessionId ? { _id: { $ne: sessionId } } : {}),
      },
      {
        $set: {
          status: "ended",
          endedAt: new Date(),
          connectionHealth: "offline",
          currentViewersCount: 0,
        },
      },
    );

    let session = sessionId
      ? await StreamSessionModel.findOne({
          _id: sessionId,
          broadcasterId: escortId,
        })
      : await StreamSessionModel.findOne({
          broadcasterId: escortId,
          status: "scheduled",
        }).sort({ createdAt: -1 });

    if (!session) {
      const escortDoc = await EscortModel.findById(escortId)
        .select("name country city speakingLanguage")
        .lean();

      session = new StreamSessionModel({
        broadcasterId: escortId,
        roomName: `gv_live_${escortId.toString()}_${crypto.randomBytes(4).toString("hex")}`,
        title: (title || `${escortDoc?.name || "Broadcaster"} Live`).trim(),
        country: escortDoc?.country || "",
        city: escortDoc?.city || "",
        language: escortDoc?.speakingLanguage?.[0] || "English",
        recordingEnabled: false,
      });
    }

    if (typeof title === "string" && title.trim()) session.title = title.trim();
    if (typeof description === "string")
      session.description = description.trim();
    if (typeof category === "string" && category.trim())
      session.category = category.trim();
    if (typeof language === "string" && language.trim())
      session.language = language.trim();
    if (["public", "paid", "subscribers"].includes(visibility)) {
      session.visibility = visibility;
    }
    if (typeof entryFee === "number" && entryFee >= 0) {
      session.entryFee = entryFee;
    }

    session.status = "live";
    session.startedAt = session.startedAt || new Date();
    session.endedAt = null;
    session.connectionHealth = "good";
    session.currentViewersCount = 0;

    await session.save();
    await createRoomIfNeeded(session.roomName);

    const livekit = await createLiveKitToken({
      identity: `escort_${escortId.toString()}`,
      name: req.broadcasterProfile?.stageName || req.user.name || "Broadcaster",
      roomName: session.roomName,
      role: "broadcaster",
    });

    const favViewers = await ClientModel.find({
      favorites: escortId,
      status: "Active",
    })
      .select("_id")
      .lean();

    if (favViewers.length) {
      const broadName =
        req.broadcasterProfile?.stageName || req.user.name || "A broadcaster";
      await Promise.allSettled(
        favViewers.map((v) =>
          sendLiveCamNotification({
            recipientId: v._id,
            recipientModel: "Client",
            senderId: escortId,
            senderModel: "Escort",
            type: "livecam_fav_live",
            title: `${broadName} is Live Now`,
            message: `${broadName} just started streaming: "${session.title}"`,
            link: `/live-cams/${session._id}`,
          }),
        ),
      );
    }

    await writeAuditLog({
      actorId: escortId,
      actorRole: "Escort",
      action: "STREAM_STARTED",
      targetType: "StreamSession",
      targetId: session._id,
      metadata: { roomName: session.roomName, visibility: session.visibility },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      error: false,
      session,
      livekit,
    });
  } catch (err) {
    console.error("[BroadcasterController] startBroadcast error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to start broadcast.",
    });
  }
};

// Update connection quality / health during active stream
export const updateStreamHealth = async (req, res) => {
  console.log("[BroadcasterController] updateStreamHealth called", {
    userId: req.user?._id,
    body: req.body,
  });

  try {
    const escortId = req.user._id;
    const { sessionId, connectionHealth } = req.body || {};

    if (!["good", "fair", "poor", "reconnecting"].includes(connectionHealth)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid connection health state.",
      });
    }

    const session = await StreamSessionModel.findOneAndUpdate(
      { _id: sessionId, broadcasterId: escortId, status: "live" },
      { $set: { connectionHealth } },
      { new: true },
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Active live session not found.",
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      connectionHealth: session.connectionHealth,
      session,
    });
  } catch (err) {
    console.error("[BroadcasterController] updateStreamHealth error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update stream health.",
    });
  }
};

// End / immediately terminate broadcast session & update analytics summary
export const endBroadcast = async (req, res) => {
  console.log("[BroadcasterController] endBroadcast called", {
    userId: req.user?._id,
    body: req.body,
  });

  try {
    const escortId = req.user._id;
    const { sessionId, immediate = false } = req.body || {};

    const session = await StreamSessionModel.findOne({
      ...(sessionId ? { _id: sessionId } : {}),
      broadcasterId: escortId,
      status: "live",
    }).sort({ createdAt: -1 });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "No active live session found to end.",
      });
    }

    const endedAt = new Date();
    const elapsedSeconds = computeDurationSeconds(session.startedAt, endedAt);

    session.status = "ended";
    session.endedAt = endedAt;
    session.durationSeconds = (session.durationSeconds || 0) + elapsedSeconds;
    session.connectionHealth = "offline";
    session.currentViewersCount = 0;

    await session.save();
    await terminateLiveKitRoom(session.roomName);

    await BroadcasterStreamProfileModel.findOneAndUpdate(
      { escortId },
      {
        $inc: {
          "statsSummary.totalSessions": 1,
          "statsSummary.totalViewers": session.totalViewersCount || 0,
          "statsSummary.totalUniqueViewers": session.uniqueViewersCount || 0,
          "statsSummary.totalBroadcastSeconds": elapsedSeconds,
        },
        $max: {
          "statsSummary.peakConcurrentViewers": session.peakViewersCount || 0,
        },
      },
      { upsert: true },
    );

    await writeAuditLog({
      actorId: escortId,
      actorRole: "Escort",
      action: immediate ? "STREAM_TERMINATED_IMMEDIATE" : "STREAM_ENDED",
      targetType: "StreamSession",
      targetId: session._id,
      metadata: { durationSeconds: elapsedSeconds },
      ipAddress: req.ip || "",
    });

    return res.status(200).json({
      success: true,
      error: false,
      session,
    });
  } catch (err) {
    console.error("[BroadcasterController] endBroadcast error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to end broadcast.",
    });
  }
};

// Block a viewer from broadcaster's rooms/interactions
export const blockViewer = async (req, res) => {
  console.log("[BroadcasterController] blockViewer called", {
    userId: req.user?._id,
    body: req.body,
  });

  try {
    const escortId = req.user._id;
    const { viewerId } = req.body || {};

    if (!viewerId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "viewerId is required.",
      });
    }

    await BroadcasterStreamProfileModel.findOneAndUpdate(
      { escortId },
      { $addToSet: { blockedViewers: viewerId } },
      { upsert: true },
    );

    return res.status(200).json({
      success: true,
      error: false,
      message: "Viewer blocked successfully.",
    });
  } catch (err) {
    console.error("[BroadcasterController] blockViewer error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to block viewer.",
    });
  }
};

// Report an abusive viewer during or after a session
export const reportViewer = async (req, res) => {
  console.log("[BroadcasterController] reportViewer called", {
    userId: req.user?._id,
    body: req.body,
  });

  try {
    const escortId = req.user._id;
    const { viewerId, sessionId, reason, details } = req.body || {};

    if (!viewerId || !reason) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "viewerId and reason are required.",
      });
    }

    const report = await ModerationReportModel.create({
      reporterId: escortId,
      reporterRole: "Escort",
      targetId: viewerId,
      targetRole: "Client",
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
    console.error("[BroadcasterController] reportViewer error:", err);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to submit viewer report.",
    });
  }
};

// Broadcaster analytics & historical session reports
export const getBroadcasterAnalytics = async (req, res) => {
  console.log("[BroadcasterController] getBroadcasterAnalytics called", {
    userId: req.user?._id,
  });

  try {
    const escortId = req.user._id;

    const [profile, sessions] = await Promise.all([
      BroadcasterStreamProfileModel.findOne({ escortId }).lean(),
      StreamSessionModel.find({
        broadcasterId: escortId,
        status: { $in: ["ended", "terminated", "live"] },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const completedSessions = sessions.filter((s) => s.status !== "live");
    const totalWatchSeconds = completedSessions.reduce(
      (acc, s) => acc + (s.durationSeconds || 0) * (s.totalViewersCount || 0),
      0,
    );
    const totalViews = completedSessions.reduce(
      (acc, s) => acc + (s.totalViewersCount || 0),
      0,
    );
    const avgViewingDurationSeconds =
      totalViews > 0 ? Math.round(totalWatchSeconds / totalViews) : 0;

    return res.status(200).json({
      success: true,
      error: false,
      summary: {
        totalSessions:
          profile?.statsSummary?.totalSessions ?? completedSessions.length,
        totalViewers: profile?.statsSummary?.totalViewers ?? totalViews,
        totalUniqueViewers: profile?.statsSummary?.totalUniqueViewers ?? 0,
        peakConcurrentViewers:
          profile?.statsSummary?.peakConcurrentViewers ?? 0,
        totalBroadcastSeconds:
          profile?.statsSummary?.totalBroadcastSeconds ?? 0,
        avgViewingDurationSeconds,
        totalEarnings: profile?.statsSummary?.totalEarnings ?? 0,
        availableBalance: profile?.statsSummary?.availableBalance ?? 0,
      },
      sessions,
    });
  } catch (err) {
    console.error(
      "[BroadcasterController] getBroadcasterAnalytics error:",
      err,
    );
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to load broadcaster analytics.",
    });
  }
};

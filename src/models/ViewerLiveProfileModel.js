import mongoose from "mongoose";

const WatchHistoryEntrySchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StreamSession",
      required: true,
    },
    broadcasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
    },
    watchedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const ViewerLiveProfileSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      unique: true,
      index: true,
    },
    isAgeAssured: {
      type: Boolean,
      default: false,
    },
    ageAssuredAt: {
      type: Date,
      default: null,
    },
    allowDirectMessagesFrom: {
      type: String,
      enum: ["everyone", "broadcasters", "nobody"],
      default: "everyone",
    },
    blockedBroadcasters: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Escort",
      },
    ],
    blockedViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
      },
    ],
    chatMutedInSessions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StreamSession",
      },
    ],
    chatSuspendedUntil: {
      type: Date,
      default: null,
    },
    liveWatchHistory: {
      type: [WatchHistoryEntrySchema],
      default: [],
    },
    notificationPrefs: {
      favBroadcasterLive: { type: Boolean, default: true },
      streamAvailability: { type: Boolean, default: true },
      chatReplies: { type: Boolean, default: true },
      privateMessages: { type: Boolean, default: true },
      sessionRequests: { type: Boolean, default: true },
      billingAlerts: { type: Boolean, default: true },
      chatSoundEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

const ViewerLiveProfileModel = mongoose.model(
  "ViewerLiveProfile",
  ViewerLiveProfileSchema,
);

export default ViewerLiveProfileModel;

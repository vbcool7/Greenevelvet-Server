import mongoose from "mongoose";

const StreamSessionSchema = new mongoose.Schema(
  {
    broadcasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
      index: true,
    },
    roomName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "General",
      index: true,
    },
    language: {
      type: String,
      trim: true,
      default: "English",
      index: true,
    },
    country: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    city: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    visibility: {
      type: String,
      enum: ["public", "paid", "subscribers"],
      default: "public",
      index: true,
    },
    entryFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    chatEnabled: {
      type: Boolean,
      default: true,
    },
    chatEligibleOnly: {
      type: Boolean,
      default: false,
    },
    pinnedMessage: {
      messageId: { type: mongoose.Schema.Types.ObjectId, default: null },
      text: { type: String, default: "" },
      senderName: { type: String, default: "" },
      pinnedAt: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ["scheduled", "live", "ended", "terminated"],
      default: "scheduled",
      index: true,
    },
    scheduledFor: {
      type: Date,
      default: null,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentViewersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalViewersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueViewersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    peakViewersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    viewerIdsSeen: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
      },
    ],
    connectionHealth: {
      type: String,
      enum: ["good", "fair", "poor", "reconnecting", "offline"],
      default: "offline",
    },
    recordingEnabled: {
      type: Boolean,
      default: false,
      immutable: true,
    },
    terminatedBy: {
      role: { type: String, default: null },
      actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
      reason: { type: String, default: "" },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true },
);

StreamSessionSchema.index({
  status: 1,
  isFeatured: -1,
  currentViewersCount: -1,
  updatedAt: -1,
});

const StreamSessionModel = mongoose.model("StreamSession", StreamSessionSchema);

export default StreamSessionModel;

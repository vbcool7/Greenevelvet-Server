import mongoose from "mongoose";

const ModerationReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reporterRole: {
      type: String,
      enum: ["Escort", "Client", "Moderator"],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetRole: {
      type: String,
      enum: [
        "Escort",
        "Client",
        "StreamSession",
        "ChatMessage",
        "DirectMessage",
      ],
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StreamSession",
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    details: {
      type: String,
      maxlength: 1500,
      default: "",
    },
    status: {
      type: String,
      enum: ["open", "under_review", "resolved", "dismissed", "appealed"],
      default: "open",
      index: true,
    },
    appealNote: {
      type: String,
      maxlength: 1500,
      default: "",
    },
    actionTaken: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

const ModerationReportModel = mongoose.model(
  "ModerationReport",
  ModerationReportSchema,
);

export default ModerationReportModel;

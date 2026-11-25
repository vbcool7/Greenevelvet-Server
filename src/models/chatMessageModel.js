import mongoose from "mongoose";

const ChatMessageSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StreamSession",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ["Escort", "Client", "Moderator", "Admin"],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    senderAvatar: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedBy: {
      role: { type: String, default: null },
      actorId: { type: mongoose.Schema.Types.ObjectId, default: null },
      at: { type: Date, default: null },
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isReported: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

ChatMessageSchema.index({ sessionId: 1, createdAt: -1 });

const chatMessageModel = mongoose.model("ChatMessage", ChatMessageSchema);

export default chatMessageModel;

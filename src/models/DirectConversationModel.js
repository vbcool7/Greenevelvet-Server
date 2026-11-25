import mongoose from "mongoose";

const ParticipantSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      enum: ["Escort", "Client"],
      required: true,
    },
  },
  { _id: false },
);

const DirectConversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [ParticipantSchema],
      validate: [(v) => v.length === 2, "Conversation requires 2 participants"],
      index: true,
    },
    lastMessageText: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  { timestamps: true },
);

const DirectConversationModel = mongoose.model(
  "DirectConversation",
  DirectConversationSchema,
);

export default DirectConversationModel;

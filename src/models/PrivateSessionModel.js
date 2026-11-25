import mongoose from "mongoose";

const PrivateSessionSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    broadcasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
      index: true,
    },
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "requested",
        "accepted",
        "rejected",
        "active",
        "completed",
        "cancelled",
        "interrupted",
      ],
      default: "requested",
      index: true,
    },
    billingType: {
      type: String,
      enum: ["free", "per_minute", "fixed"],
      default: "per_minute",
    },
    rateAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCharged: {
      type: Number,
      default: 0,
      min: 0,
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
    cancelReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const PrivateSessionModel = mongoose.model(
  "PrivateSession",
  PrivateSessionSchema,
);

export default PrivateSessionModel;

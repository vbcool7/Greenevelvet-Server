import mongoose from "mongoose";

const LiveCamPayoutSchema = new mongoose.Schema(
  {
    broadcasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USDTTRC20",
    },
    walletAddress: {
      type: String,
      required: true,
      trim: true,
    },
    nowpaymentsPayoutId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: [
        "requested",
        "approved",
        "processing",
        "completed",
        "rejected",
        "failed",
      ],
      default: "requested",
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "livecam_payouts",
  },
);

const LiveCamPayoutModel = mongoose.model("LiveCamPayout", LiveCamPayoutSchema);

export default LiveCamPayoutModel;

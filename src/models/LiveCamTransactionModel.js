import mongoose from "mongoose";

const LiveCamTransactionSchema = new mongoose.Schema(
  {
    payerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    },
    broadcasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "wallet_topup",
        "paid_stream",
        "subscription",
        "private_session",
        "refund",
        "payout",
      ],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["nowpayments", "internal_wallet"],
      default: "nowpayments",
    },
    nowpaymentsPaymentId: {
      type: String,
      default: "",
      index: true,
    },
    nowpaymentsOrderId: {
      type: String,
      default: "",
      index: true,
    },
    payCurrency: {
      type: String,
      default: "",
    },
    priceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    priceCurrency: {
      type: String,
      default: "USD",
    },
    commissionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netBroadcasterAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: [
        "waiting",
        "confirming",
        "confirmed",
        "finished",
        "failed",
        "expired",
        "refunded",
      ],
      default: "waiting",
      index: true,
    },
    failureReason: {
      type: String,
      default: "",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "livecam_transactions",
  },
);

const LiveCamTransactionModel = mongoose.model(
  "LiveCamTransaction",
  LiveCamTransactionSchema,
);

export default LiveCamTransactionModel;

import mongoose from "mongoose";

const LiveCamSubscriptionSchema = new mongoose.Schema(
  {
    viewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    broadcasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
      index: true,
    },
    planName: {
      type: String,
      default: "Monthly Live Cam Pass",
    },
    priceAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled", "failed"],
      default: "pending",
      index: true,
    },
    nowpaymentsInvoiceId: {
      type: String,
      default: "",
    },
    startsAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "livecam_subscriptions",
  },
);

LiveCamSubscriptionSchema.index({ viewerId: 1, broadcasterId: 1, status: 1 });

const LiveCamSubscriptionModel = mongoose.model(
  "LiveCamSubscription",
  LiveCamSubscriptionSchema,
);

export default LiveCamSubscriptionModel;

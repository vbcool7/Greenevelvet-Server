import mongoose from "mongoose";

const BroadcasterStreamProfileSchema = new mongoose.Schema(
  {
    escortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
      unique: true,
      index: true,
    },
    stageName: {
      type: String,
      trim: true,
      default: "",
    },
    bio: {
      type: String,
      maxlength: 1000,
      default: "",
    },
    isAgeVerified: {
      type: Boolean,
      default: false,
    },
    isIdentityVerified: {
      type: Boolean,
      default: false,
    },
    hasAcceptedBroadcastConsent: {
      type: Boolean,
      default: false,
    },
    consentAcceptedAt: {
      type: Date,
      default: null,
    },
    broadcastEligibility: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      index: true,
    },
    eligibilityNote: {
      type: String,
      default: "",
    },
    defaultVisibility: {
      type: String,
      enum: ["public", "paid", "subscribers"],
      default: "public",
    },
    payPerViewPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyMembershipPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    privateSessionEnabled: {
      type: Boolean,
      default: false,
    },
    privateRatePerMinute: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowDirectMessagesFrom: {
      type: String,
      enum: ["everyone", "subscribers", "nobody"],
      default: "everyone",
    },
    payoutCurrency: {
      type: String,
      default: "USDTTRC20",
    },
    payoutWalletAddress: {
      type: String,
      default: "",
    },
    blockedViewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
      },
    ],
    moderators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
      },
    ],
    statsSummary: {
      totalSessions: { type: Number, default: 0 },
      totalViewers: { type: Number, default: 0 },
      totalUniqueViewers: { type: Number, default: 0 },
      peakConcurrentViewers: { type: Number, default: 0 },
      totalBroadcastSeconds: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      availableBalance: { type: Number, default: 0 },
    },
  },
  { timestamps: true },
);

const BroadcasterStreamProfileModel = mongoose.model(
  "BroadcasterStreamProfile",
  BroadcasterStreamProfileSchema,
);

export default BroadcasterStreamProfileModel;

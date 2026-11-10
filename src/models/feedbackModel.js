import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "submittedByModel",
      index: true,
    },

    submittedByModel: {
      type: String,
      enum: ["Client", "Escort"],
      default: null,
    },

    isGuest: {
      type: Boolean,
      default: false,
    },

    guestName: {
      type: String,
      trim: true,
      default: null,
    },

    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    source: {
      type: String,
      required: true,
      enum: [
        "registration",
        "escort-dashboard",
        "escort-profile",
        "user-dashboard",
        "user-side",
        "other",
      ],
    },

    currentStep: {
      type: Number,
      min: 1,
      max: 7,
      default: null,
    },

    completedStep: {
      type: Number,
      min: 0,
      max: 7,
      default: null,
    },

    category: {
      type: String,
      required: true,
      enum: [
        "user-friendly",
        "technical-issue",
        "design-ui",
        "feature-request",
        "website-performance",
        "account-issue",
        "profile-issue",
        "registration-issue",
        "payment-issue",
        "suggestion",
        "personal-feedback",
        "other",
      ],
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const FeedbackModel = mongoose.model("Feedback", feedbackSchema);
export default FeedbackModel;

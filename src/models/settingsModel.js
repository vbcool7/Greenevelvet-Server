import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    singleton: {
      type: String,
      default: "unique_settings",
      unique: true,
    },

    taglineLine1: {
      text: {
        type: String,
        required: true,
        default: ""
      },
      highlight: {
        type: String,
        required: true,
        default: ""
      }
    },

    taglineLine2: {
      text: {
        type: String,
        required: true,
        default: ""
      },
      highlight: {
        type: String,
        required: true,
        default: ""
      }
    },

    logo: {
      type: String,
      default: ""
    },
    logoPublicId: {
      type: String,
      default: ""
    },

    banner: {
      type: String,
      default: ""
    },
    bannerPublicId: {
      type: String,
      default: ""
    },

    mobilebanner: {
      type: String,
      default: ""
    },
    mobilebannerPublicId: {
      type: String,
      default: ""
    },

    preloadAssets: [
      {
        type: String,
      },
    ],

    enableSubscription: { type: Boolean, default: false },
    escortApprovalRequired: { type: Boolean, default: false },
    enableLogin: { type: Boolean, default: true },
    enableSignup: { type: Boolean, default: true },
    profileVisibility: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },

    contactInfo: {
      email: {
        type: String,
        lowercase: true,
        trim: true,
        default: "",
      },
      address: { type: String, default: "" },
    },

    socialLinks: {
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      onlyfans: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const settingsModel = mongoose.model("Settings", settingsSchema);

export default settingsModel;
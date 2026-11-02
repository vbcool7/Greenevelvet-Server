import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: String,
      required: true,
      enum: [
        "Leaderboard",
        "Full Banner",
        "Medium Rectangle",
        "Large Rectangle",
        "Half Page",
        "Wide Skyscraper",
        "Mobile Banner",
        "Square Banner",
      ],
    },

    width: {
      type: Number,
      required: true,
    },

    height: {
      type: Number,
      required: true,
    },

    imageUrl: {
      type: String,
      required: true,
    },

    cloudinaryPublicId: {
      type: String,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

const BannerModel = mongoose.model("Banner", bannerSchema);

export default BannerModel;

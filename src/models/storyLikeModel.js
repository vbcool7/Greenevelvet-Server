import mongoose from "mongoose";

const storyLikeSchema = new mongoose.Schema(
  {
    storyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Story",
      required: true,
    },

    escortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    viewerRole: {
      type: String,
      enum: ["Client", "Escort"],
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// One client can like a story only once
storyLikeSchema.index({ storyId: 1, clientId: 1, viewerRole: 1 }, { unique: true });

// Automatically delete expired story likes
storyLikeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const StoryLikeModel = mongoose.model("StoryLike", storyLikeSchema);

export default StoryLikeModel;

import mongoose from "mongoose";

const storyViewSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  },
);

// One client can view one story only once
storyViewSchema.index({ storyId: 1, clientId: 1, viewerRole: 1 }, { unique: true });

const StoryViewModel = mongoose.model("StoryView", storyViewSchema);

export default StoryViewModel;

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
      required: function () {
        return ["Client", "Escort"].includes(this.viewerRole);
      },
    },

    guestViewerId: {
      type: String,
      trim: true,
      required: function () {
        return this.viewerRole === "Guest";
      },
    },

    viewerRole: {
      type: String,
      enum: ["Client", "Escort", "Guest"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Logged-in users: one view per story
storyViewSchema.index(
  { storyId: 1, clientId: 1, viewerRole: 1 },
  {
    unique: true,
    partialFilterExpression: {
      clientId: { $type: "objectId" },
    },
    name: "unique_logged_in_story_view",
  },
);

// Guest users: one view per story per browser ID
storyViewSchema.index(
  { storyId: 1, guestViewerId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      guestViewerId: { $type: "string" },
    },
    name: "unique_guest_story_view",
  },
);

const StoryViewModel = mongoose.model("StoryView", storyViewSchema);

export default StoryViewModel;

import mongoose from "mongoose";

const storySchema = new mongoose.Schema({
    escortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Escort",
        required: true,
        index: true,
    },

    mediaType: {
        type: String,
        enum: ["image", "video"],
        required: true,
    },

    mediaUrl: {
        type: String,
        required: true,
        trim: true,
    },

    publicId: {
        type: String,
        required: true,
        trim: true,
    },

    caption: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
    },

    status: {
        type: String,
        enum: ["active", "expired"],
        default: "active",
        required: true,
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true,
    },
}, {
    timestamps: true,
});

// Fetch an escort's active stories efficiently
storySchema.index({
    escortId: 1,
    status: 1,
    expiresAt: 1,
});

// Find expired stories for scheduled cleanup
storySchema.index({
    status: 1,
    expiresAt: 1,
});

// Fetch stories newest first
storySchema.index({
    escortId: 1,
    createdAt: -1,
});

const StoryModel = mongoose.model("Story", storySchema);

export default StoryModel;
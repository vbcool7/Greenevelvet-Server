import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client",
        required: true,
        index: true,
    },

    escortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Escort",
        required: true,
        index: true,
    },

    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },

    review: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },

    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
        index: true,
    },

    adminAction: {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },

        actionAt: {
            type: Date,
            default: null,
        },

        reason: {
            type: String,
            trim: true,
            default: "",
        },
    },
    escortReply: {
        text: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: "",
        },

        repliedAt: {
            type: Date,
            default: null,
        },

        updatedAt: {
            type: Date,
            default: null,
        },
    }
}, {
    timestamps: true,
});

reviewSchema.index({
    clientId: 1,
    escortId: 1,
    status: 1
}, {
    unique: true
});

const ReviewModel = mongoose.model("Review", reviewSchema);

export default ReviewModel;
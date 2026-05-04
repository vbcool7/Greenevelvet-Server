import mongoose from "mongoose";

const subcribedplanSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Escort",
        index: true
    },

    planId: {
        type: String
    },

    title: {
        type: String,
        required: true,
        index: true
    },

    planName: {
        type: String,
        required: true,
        index: true
    },

    duration: {
        type: String,
        required: true
    },

    originalPrice: {
        type: Number,
        required: true
    },

    discountedPrice: {
        type: Number,
        required: true,
        default: 0
    },

    amount: {
        type: Number,
        required: true,
        default: 0
    },

    currency: {
        type: String,
        default: "AUD"
    },

    features: {
        type: [String],
        default: []
    },

    isActive: {
        type: Boolean,
        default: true
    },

    subscriptionStart: {
        type: Date,
        default: null
    },

    subscriptionExpiry: {
        type: Date,
        default: null
    },

    escrowTransactionId: {
        type: String,
    },

    status: {
        type: String,
        enum: ["pending", "funds_secured", "success", "completed", "failed"],
        default: "pending",
    },

}, { timestamps: true }
);
const subcribedModel = mongoose.model("subcribedplans", subcribedplanSchema);
export default subcribedModel;
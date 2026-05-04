import mongoose from "mongoose";

const EscortplanSchema = new mongoose.Schema({
    escortId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true
    },

    planId: {
        type: String
    },

    plan: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    newPrice: {
        type: Number,
        required: true
    },
    duration: {
        type: String,
        required: true
    },
    features: [{ type: String }],
    isActive: {
        type: Boolean,
        default: true
    },

    escrowTransactionId: {
        type: String,
    },

    paymentStatus: {
        type: String,
        enum: ["pending", "success", "failed"],
    },

}, { timestamps: true }
);

const escortplanModel = mongoose.model("subscriptionplan", EscortplanSchema);
export default escortplanModel;
import mongoose from "mongoose";

const pendingEscortSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Provide name"]
        },
        email: {
            type: String,
            required: [true, "Provide password"],
            trim: true,
            lowercase: true
        },
        password: {
            type: String,
            required: [true, "Provide password"],
            select: false
        },
        mobile: {
            type: String,
        },
        country: {
            type: String,
        },
        countryCode: {
            type: String,
        },
        city: {
            type: String,
        },
        account_classification: {
            type: String,
        },
        account_type: {
            type: String,
        },
        adverties_category: {
            type: String,
        },

        role: {
            type: String,
            default: "Escort"
        },

        lastCompletedStep: {
            type: Number,
            default: 0
        },

        isEmailVerified: {
            type: Boolean,
            default: false
        },
        emailVerifyToken: String,

        emailVerifyExpiry: Date,
    }, { timestamps: true }
);

const PendingEscortModel = mongoose.model("PendingEscort", pendingEscortSchema);

export default PendingEscortModel;
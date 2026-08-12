import mongoose from "mongoose";

const extraPlanSubscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Escort",
        index: true
    },

    planId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "ExtraPlan",
        index: true
    },

    planType: {
        type: String,
        enum: [
            "availability",
            "boost-profile",
            "weekly-elite",
            "monthly-elite"
        ],
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

    price: {
        type: Number,
        required: true,
        min: 0
    },

    currency: {
        type: String,
        // default: "AUD"
        default: "USD"
    },

    totalSlots: {
        type: Number,
        default: 1
    },

    // Payment details
    orderId: {
        type: String,
        index: true
    },

    nowPaymentInvoiceId: {
        type: String,
        index: true
    },

    invoiceUrl: {
        type: String
    },

    paymentId: {
        type: String
    },

    payAmount: {
        type: String
    },

    payCurrency: {
        type: String
    },


    // Subscription details

    totalCredits: {
        type: Number,
        default: 0
    },
    remainingCredits: {
        type: Number,
        default: 0
    },
    availabilityActive: {
        type: Boolean,
        default: false,
        index: true
    },
    availabilityStart: {
        type: Date,
        default: null
    },
    availabilityEnd: {
        type: Date,
        default: null,
        index: true
    },

    subscriptionStart: {
        type: Date,
        default: null
    },

    subscriptionExpiry: {
        type: Date,
        default: null,
        index: true
    },

    isActive: {
        type: Boolean,
        default: false,
        index: true
    },

    status: {
        type: String,
        enum: [
            "pending",
            "waiting",
            "confirming",
            "confirmed",
            "sending",
            "partially_paid",
            "finished",
            "failed",
            "expired",
            "refunded"
        ],
        default: "pending",
        index: true
    }
}, {
    timestamps: true
});

const ExtraPlanSubscriptionModel = mongoose.model(
    "ExtraPlanSubscription",
    extraPlanSubscriptionSchema
);

export default ExtraPlanSubscriptionModel;
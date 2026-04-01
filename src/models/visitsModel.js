import mongoose, { Schema } from "mongoose";

const visitsSchema = new mongoose.Schema(
    {
        escortId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Escort",
            required: true,
            index: true,
        },

        visitorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            default: null, // guest = null
            index: true
        },

        type: {
            type: String,
            enum: ["profile_view", "call_click", "sms_click", "blog_view", "newsandtour_view", "whatsapp_click", "website_click"],
            default: "profile_view",
        },

        date: {
            type: Date,
            default: Date.now,
            index: true,
        },

        ip: {
            type: String,
            default: null,
            index: true
        },

        city: {
            type: String,
            default: null
        },
        country: {
            type: String,
            default: null
        },
    },
    { timestamps: true }

);

visitsSchema.index({ escortId: 1, date: 1 });
visitsSchema.index({ escortId: 1, type: 1, date: 1 });
visitsSchema.index({ escortId: 1, visitorId: 1 });
visitsSchema.index({ escortId: 1, ip: 1 });


const VisitsModel = mongoose.model("Visit", visitsSchema);

export default VisitsModel;
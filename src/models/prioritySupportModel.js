import mongoose from "mongoose";

const prioritySupportSchema = new mongoose.Schema({
    escortId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Escort",
        required: true,
        index: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true
    },
    mobile: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    planName: {
        type: String,
        default: "Start"
    },
    prioritySupport: {
        type: Boolean,
        default: false
    },
    prioritySupportPositioning: {
        type: Number,
        default: 4
    },
    status: {
        type: String,
        enum: ["pending", "in-progress", "resolved", "closed"],
        default: "pending"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    plan: {
        type: String,
        default: "Start"
    },

    adminReply: [{
        text: {
            type: String,
            required: true,
            trim: true
        },
        sender: {
            type: String,
            default: "Admin"
        },
        time: {
            type: String,
            default: () => new Date().toLocaleString()
        }
    }],
    repliedAt: {
        type: Date
    },
}, {
    timestamps: true
});

const PrioritySupportModel = mongoose.model("PrioritySupport", prioritySupportSchema);
export default PrioritySupportModel;
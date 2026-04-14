import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
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
        inquiryType: {
            type: String,
            default: "general"
        },
        profileLink: {
            type: String,
            trim: true
        },
        message: {
            type: String,
            required: true,
            trim: true
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
        role: {
            type: String,
            enum: ["Client", "Escort", "Visitor"],
            default: "Visitor"
        },
        adminReply: {
            type: String,
            default: ""
        },
        repliedAt: {
            type: Date
        },
    },
    { timestamps: true }
);

const ContactModel = mongoose.model("Contact", contactSchema);
export default ContactModel;
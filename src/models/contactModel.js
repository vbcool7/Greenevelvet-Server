import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
    {
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
        adminReply: [
            {
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
            }
        ],
        repliedAt: {
            type: Date
        },
    },
    { timestamps: true }
);

const ContactModel = mongoose.model("Contact", contactSchema);
export default ContactModel;
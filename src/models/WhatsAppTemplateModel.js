import mongoose from "mongoose";

const WhatsAppTemplateSchema = new mongoose.Schema({

    name: {
        type: String,
    },
    contentSid: {
        type: String,
    },
    language: {
        type: String,
    },
    variables: [{
        type: String,
    }, ],
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    isActive: {
        type: Boolean,
        default: false
    },

}, {
    timestamps: true,
}, );

const WhatsAppTemplateModel = mongoose.model("Whatsapptemplate", WhatsAppTemplateSchema);

export default WhatsAppTemplateModel;
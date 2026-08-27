import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Whatsapptemplate"
    },
    audience: {},
    scheduledAt: {},
    status: {},
    totalRecipients: {},
    queuedCount: {},
    sentCount: {},
    deliveredCount: {},
    readCount: {},
    failedCount: {},
    createdBy: {}
}, {
    timestamps: true
}, );

const CampaignModel = mongoose.model("Campaign", campaignSchema);

export default CampaignModel;
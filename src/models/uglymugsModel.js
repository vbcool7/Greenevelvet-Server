import mongoose from "mongoose";

const UglyMugsSchema = new mongoose.Schema({

    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Escort',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client'
    },
    clientName: {
        type: String,
        trim: true
    },
    clientPhone: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    clientEmail: {
        type: String,
        lowercase: true,
        trim: true
    },
    incidentType: {
        type: String,
        enum: [
            'non_payment',
            'safety_threat',
            'boundary_violation',
            'no_show',
            'verbal_abuse',
            'unauthorized_media',
            'intoxicated_client',
            'identity_fraud',
            'privacy_breach',
            'hygiene_issue',
            'health_issue',
            'other'
        ],
        default: 'other'
    },
    incidentDate: {
        type: Date,
        default: Date.now
    },
    reason: {
        type: String,
        required: true,
        maxLength: 1000
    },
    country: {
        type: String
    },
    city: {
        type: String
    },
    location: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    adminRemark: {
        type: String,
        trim: true,
    },
    actionBy: {
        type: String,
    },
    actionAt: {
        type: Date,
    },
}, { timestamps: true });

UglyMugsSchema.index({ clientPhone: 1, clientEmail: 1 });
UglyMugsSchema.index({ reportedBy: 1 });

const UglyMugsModel = mongoose.model("UglyMugs", UglyMugsSchema);

export default UglyMugsModel;
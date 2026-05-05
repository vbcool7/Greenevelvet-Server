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
        enum: ['Non-payment', 'Aggressive Behavior', 'Time Waster', 'Fake Profile', 'Other'],
        default: 'Other'
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

    evidence: [{
        type: String
    }],
    location: {
        type: String
    },
    isVerifiedEntry: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Rejected'],
        default: 'Pending'
    }
}, { timestamps: true });

UglyMugsSchema.index({ clientPhone: 1, clientEmail: 1 });
UglyMugsSchema.index({ reportedBy: 1 });

const UglyMugsModel = mongoose.model("UglyMugs", UglyMugsSchema);

export default UglyMugsModel;
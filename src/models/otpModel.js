import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
    mobile: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
    isUsed: {
        type: Boolean,
        default: false,
    },
},
    { timestamps: true }
);

// auto delete expired otp

otpSchema.index({ expiresAt: 1}, { expireAfterSeconds: 0});

const otpModel = mongoose.model("otp", otpSchema);

export default otpModel;

import mongoose from "mongoose";

const RatesSchema = new mongoose.Schema({
    escortId: {
        type: String,
        required: true,
        index: true
    },
    label: {
        type: String,
        required: [true, "Service title is required"],
        trim: true
    },
    price: {
        type: Number,
        required: [true, "Service title is required"],
        trim: true
    },
    duration: {
        type: String,
        required: [true, "Service title is required"]
    },
    isActive: {
        type: Boolean,
        default: true
    },
}, { timestamps: true }

)

const RatesModel = mongoose.model("Rates", RatesSchema)

export default RatesModel;

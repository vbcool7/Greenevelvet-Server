import mongoose from "mongoose";

const ServiceSchema = new mongoose.Schema({
    escortId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: [true, "Service title is required"],
        trim: true
    },
    label: {
        type: String,
        required: [true, "Service title is required"],
        trim: true
    },
    price: {
        type: Number,
        required: [true, "Service title is required"]
    },
    description: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },

}, { timestamps: true }
)

const ServiceModel = mongoose.model("Services", ServiceSchema)

export default ServiceModel;
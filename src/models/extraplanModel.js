import mongoose from "mongoose";

const extraplanSchema = new mongoose.Schema(
    {
        iconName: {
            type: String,
        },

        title: {
            type: String,
            required: true,
            index: true
        },

        discription: {
            type: String,
            required: true,
            trim: true,
        },

        price: {
            type: Number,
            required: true
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        duration: {
            type: String,
            required: true
        },

        currency: {
            type: String,
            default: "AUD"
        },

        totalSlots: {
            type: Number,
            default: 1
        },

        isActive: {
            type: Boolean,
            default: true
        }

    }, { timestamps: true },
);

const ExtraPlanModel = mongoose.model("ExtraPlan", extraplanSchema);

export default ExtraPlanModel;
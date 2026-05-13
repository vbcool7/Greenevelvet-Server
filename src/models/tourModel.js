import mongoose from "mongoose";

const tourSchema = new mongoose.Schema(
    {
        escortId: {
            type: String,
            required: true,
            index: true
        },

        userId: {
            type: String,
            ref: "Escort",
            required: true,
            index: true
        },

        city: {
            type: String,
            required: true,
            trim: true,
        },

        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        tourNotes: {
            type: String,
            trim: true,
        },

        status: {
            type: String,
            enum: ["upcoming", "ongoing", "completed", "cancelled"],
            default: "upcoming",
        },
    },
    {
        timestamps: true,
    }
);

const TourModel = mongoose.model("Tours", tourSchema);

export default TourModel;
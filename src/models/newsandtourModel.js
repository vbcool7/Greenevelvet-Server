import mongoose from "mongoose";

const newsTourSchema = new mongoose.Schema({
    escortId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        ref: "Escort",
        index: true
    },

    country: {
        type: String,
        index: true
    },

    city: String,

    name: {
        type: String,
        required: true,
        trim: true,
    },

    title: {
        type: String,
        required: true,
        trim: true,
    },

    description: {
        type: String,
        required: true,
        trim: true,
    },

    media: [
        {
            url: {
                type: String,
                required: true
            },
            type: {
                type: String,
                enum: ["image", "video"],
                required: true
            }
        }
    ],

    newstourComments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NewstourComments",
        },
    ],

    newstourLikes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NewstourLikes",
        }
    ],

    status: {
        type: String,
        enum: ["active", "inactive", "blocked"],
        default: "active",
    },
}, {
    timestamps: true,
})

const NewsAndTourModel = mongoose.model("newsandtour", newsTourSchema);

export default NewsAndTourModel;
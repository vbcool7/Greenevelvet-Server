import mongoose from "mongoose";

const newsTourSchema = new mongoose.Schema({
    escortId: {
        type: String,
        require: [true, "escortId is required"],
    },
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
        trim: true,
    },

    media: [
        {
            url: String,
            type: String,
        }
    ],

    comments: [
        {
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "userComments",
            },
            text: {
                type: String,
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],


    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userLikes",
        },
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
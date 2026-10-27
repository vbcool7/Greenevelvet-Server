import mongoose from "mongoose";

const newstourCommentsSchema = new mongoose.Schema({

    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "newsandtour",
        required: true,
        index: true
    },

    userId: {
        type: String,
        required: true,
        refPath: "userType"
    },

    userType: {
        type: String,
        required: true,
        enum: ["Client", "Escort"]
    },

    comment: {
        type: String,
        trim: true
    },
    media: [
        {
            url: {
                type: String,
            },
            type: {
                type: String,
                enum: ["image", "video"],
            }
        }
    ],

}, { timestamps: true });

const NewstourCommentsModel = mongoose.model("NewstourComments", newstourCommentsSchema);

export default NewstourCommentsModel;
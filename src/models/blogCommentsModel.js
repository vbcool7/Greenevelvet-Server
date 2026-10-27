import mongoose from "mongoose";

const blogCommentsSchema = new mongoose.Schema({

    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "blog",
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

const BlogCommentsModel = mongoose.model("blogComments", blogCommentsSchema);

export default BlogCommentsModel;
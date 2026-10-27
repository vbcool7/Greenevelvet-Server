import mongoose from "mongoose";

const blogLikesSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "blog",
        required: true,
        index: true
    },

    userId: {
        type: String,
        required: true
    }

}, { timestamps: true });

blogLikesSchema.index({
    postId: 1,
    userId: 1
}, { unique: true });


const BlogLikesModel = mongoose.model("blogLikes", blogLikesSchema);

export default BlogLikesModel;
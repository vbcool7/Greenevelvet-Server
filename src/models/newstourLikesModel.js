import mongoose from "mongoose";

const newstourLikesSchema = new mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "newsandtour",
        required: true,
        index: true
    },

    userId: {
        type: String,
        required: true
    }

}, { timestamps: true });

newstourLikesSchema.index({
    postId: 1,
    userId: 1
}, { unique: true });


const NewstourLikesModel = mongoose.model("NewstourLikes", newstourLikesSchema);

export default NewstourLikesModel;
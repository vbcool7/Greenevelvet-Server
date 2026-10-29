import mongoose from "mongoose";

const imageVoteSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },

    escortId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Escort",
      required: true,
      index: true,
    },

    imageId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    voteType: {
      type: String,
      enum: ["Like", "Dislike"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Ek client ek image par sirf ek active vote rakh sakta hai.
imageVoteSchema.index(
  {
    clientId: 1,
    escortId: 1,
    imageId: 1,
  },
  {
    unique: true,
  },
);

const ImageVoteModel = mongoose.model("ImageVote", imageVoteSchema);

export default ImageVoteModel;

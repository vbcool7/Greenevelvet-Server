import mongoose from "mongoose";
import EscortModel from "../models/escortModel.js";
import ImageVoteModel from "../models/imageVoteModel.js";

export const voteOnEscortImage = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { escortId, imageId } = req.params;
    const { voteType } = req.body;

    // Validate vote type
    if (!["Like", "Dislike"].includes(voteType)) {
      return res.status(400).json({
        success: false,
        message: 'voteType must be either "Like" or "Dislike".',
      });
    }

    // Validate MongoDB IDs
    if (
      !mongoose.isValidObjectId(escortId) ||
      !mongoose.isValidObjectId(imageId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid escortId or imageId.",
      });
    }

    // protect(["Client"]) middleware se authenticated client milega
    const clientId = req.user._id;

    let result;

    await session.withTransaction(async () => {
      // Check that the image exists and is approved
      const escort = await EscortModel.findOne({
        _id: escortId,
        "gallery.photos": {
          $elemMatch: {
            _id: imageId,
            status: "Approved",
          },
        },
      })
        .select("gallery.photos")
        .session(session);

      if (!escort) {
        const error = new Error("Approved image not found.");
        error.statusCode = 404;
        throw error;
      }

      const photo = escort.gallery.photos.id(imageId);

      if (!photo || photo.status !== "Approved") {
        const error = new Error("Approved image not found.");
        error.statusCode = 404;
        throw error;
      }

      // Check whether this client has already voted on this image
      let existingVote = await ImageVoteModel.findOne({
        clientId,
        escortId,
        imageId,
      }).session(session);

      // Repeating the same vote should not change the counts
      if (existingVote?.voteType === voteType) {
        result = {
          likesCount: photo.likesCount ?? 0,
          dislikesCount: photo.dislikesCount ?? 0,
          myVote: existingVote.voteType,
          changed: false,
        };
        return;
      }

      const increment = {};

      // Remove the previous vote from its old count
      if (existingVote) {
        if (existingVote.voteType === "Like") {
          increment["gallery.photos.$[photo].likesCount"] = -1;
        } else {
          increment["gallery.photos.$[photo].dislikesCount"] = -1;
        }
      }

      // Add the new vote to its count
      if (voteType === "Like") {
        increment["gallery.photos.$[photo].likesCount"] =
          (increment["gallery.photos.$[photo].likesCount"] ?? 0) + 1;
      } else {
        increment["gallery.photos.$[photo].dislikesCount"] =
          (increment["gallery.photos.$[photo].dislikesCount"] ?? 0) + 1;
      }

      const updatedEscort = await EscortModel.findOneAndUpdate(
        {
          _id: escortId,
          "gallery.photos": {
            $elemMatch: {
              _id: imageId,
              status: "Approved",
            },
          },
        },
        { $inc: increment },
        {
          arrayFilters: [{ "photo._id": new mongoose.Types.ObjectId(imageId) }],
          new: true,
          session,
        },
      );

      if (!updatedEscort) {
        const error = new Error("Image could not be updated.");
        error.statusCode = 404;
        throw error;
      }

      // Create a vote record for the first vote, otherwise change it
      if (existingVote) {
        existingVote.voteType = voteType;
        await existingVote.save({ session });
      } else {
        existingVote = new ImageVoteModel({
          clientId,
          escortId,
          imageId,
          voteType,
        });

        await existingVote.save({ session });
      }

      const updatedPhoto = updatedEscort.gallery.photos.id(imageId);

      result = {
        likesCount: updatedPhoto.likesCount,
        dislikesCount: updatedPhoto.dislikesCount,
        myVote: voteType,
        changed: true,
      };
    });

    return res.status(200).json({
      success: true,
      message: result.changed
        ? "Vote saved successfully."
        : "Vote already recorded.",
      data: result,
    });
  } catch (error) {
    console.error("voteOnEscortImage error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Something went wrong while saving your vote.",
    });
  } finally {
    await session.endSession();
  }
};

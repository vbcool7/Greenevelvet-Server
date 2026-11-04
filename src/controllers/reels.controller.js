import EscortModel from "../models/escortModel.js";
import mongoose from "mongoose";

// Generate thumbnail from Cloudinary video URL at 0 seconds
function getVideoThumbnail(videoUrl) {
  if (!videoUrl) return null;

  const cleanUrl = videoUrl.split("?")[0];
  const uploadPath = "/upload/";

  const uploadIndex = cleanUrl.indexOf(uploadPath);

  if (uploadIndex === -1) return null;

  const baseUrl = cleanUrl.slice(0, uploadIndex + uploadPath.length);

  const filePath = cleanUrl.slice(uploadIndex + uploadPath.length);

  // Remove video extension
  const publicPath = filePath.replace(/\.(mp4|mov|webm|m4v|avi)$/i, "");

  // Cloudinary: extract frame at 0 seconds and deliver as JPG
  return `${baseUrl}so_0,f_jpg/${publicPath}.jpg`;
}

export async function getReelsController(request, response) {
  try {
    const { cursor, direction = "next" } = request.query;

    const limit = 5;

    // Validate direction
    if (!["next", "previous"].includes(direction)) {
      return response.status(400).json({
        success: false,
        error: true,
        message: "Invalid pagination direction",
      });
    }

    // Validate cursor
    if (cursor && !mongoose.Types.ObjectId.isValid(cursor)) {
      return response.status(400).json({
        success: false,
        error: true,
        message: "Invalid pagination cursor",
      });
    }

    const baseFilter = {
      status: "Active",
      isVerified: true,
      "gallery.videos.status": "Approved",
    };

    const filter = { ...baseFilter };

    if (cursor) {
      filter._id =
        direction === "next"
          ? { $lt: new mongoose.Types.ObjectId(cursor) }
          : { $gt: new mongoose.Types.ObjectId(cursor) };
    }

    let escorts = await EscortModel.find(filter)
      .select("_id escortId avatar name gallery.videos")
      .sort({ _id: direction === "next" ? -1 : 1 })
      .limit(limit)
      .lean();

    // Previous batch should maintain normal display order
    if (direction === "previous") {
      escorts.reverse();
    }

    // Build individual reels
    const reels = [];

    for (const escort of escorts) {
      const videos = escort.gallery?.videos || [];

      for (const video of videos) {
        if (video.status !== "Approved" || !video.url) {
          continue;
        }

        reels.push({
          reelId: video._id || video.public_id,
          escortId: escort.escortId,
          escortName: escort.name,
          escortAvatar: escort.avatar,

          video: {
            public_id: video.public_id,
            url: video.url,
            thumbnail: getVideoThumbnail(video.url),
          },
        });
      }
    }

    const firstEscortId = escorts[0]?._id;
    const lastEscortId = escorts[escorts.length - 1]?._id;

    // Check whether more escorts exist on either side
    let hasPrevious = false;
    let hasNext = false;

    if (firstEscortId) {
      hasPrevious = await EscortModel.exists({
        ...baseFilter,
        _id: { $gt: firstEscortId },
      });

      hasNext = await EscortModel.exists({
        ...baseFilter,
        _id: { $lt: lastEscortId },
      });
    }

    return response.status(200).json({
      success: true,
      error: false,
      message: "Reels fetched successfully",

      data: reels,

      pagination: {
        escortsFetched: escorts.length,
        reelsFetched: reels.length,

        firstCursor: firstEscortId || null,
        lastCursor: lastEscortId || null,

        hasPrevious: Boolean(hasPrevious),
        hasNext: Boolean(hasNext),
      },
    });
  } catch (error) {
    console.error("Get Reels Error:", error);

    return response.status(500).json({
      success: false,
      error: true,
      message: error.message || "Failed to fetch reels",
    });
  }
}

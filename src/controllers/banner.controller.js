import mongoose from "mongoose";
import { uploadBannerToCloudinary } from "../utils/uploadBannerToCloudinary.js";
import BannerModel from "../models/bannerModel.js";
import cloudinary from "../config/cloudinary.js";

const bannerSizes = {
  Leaderboard: { width: 728, height: 90 },
  "Full Banner": { width: 468, height: 60 },
  "Medium Rectangle": { width: 300, height: 250 },
  "Large Rectangle": { width: 336, height: 280 },
  "Half Page": { width: 300, height: 600 },
  "Wide Skyscraper": { width: 160, height: 600 },
  "Mobile Banner": { width: 320, height: 100 },
  "Square Banner": { width: 250, height: 250 },
};

// Upload Banner Controller
export const createBanner = async (req, res) => {
  let uploadedImage = null;

  try {
    const { name, size } = req.body;

    if (!name || !size) {
      return res.status(400).json({
        success: false,
        message: "Banner name and size are required",
      });
    }

    if (!bannerSizes[size]) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner size",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Banner image is required",
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed",
      });
    }

    const { width, height } = bannerSizes[size];

    // Upload image to Cloudinary without watermark
    uploadedImage = await uploadBannerToCloudinary(req.file.buffer);

    // Save banner details in MongoDB
    const banner = await BannerModel.create({
      name: name.trim(),
      size,
      width,
      height,
      imageUrl: uploadedImage.url,
      cloudinaryPublicId: uploadedImage.public_id,
    });

    return res.status(201).json({
      success: true,
      message: "Banner uploaded successfully",
      data: banner,
    });
  } catch (error) {
    // Remove uploaded image if database save fails
    if (uploadedImage?.public_id) {
      try {
        const cloudinary = (await import("../config/cloudinary.js")).default;
        await cloudinary.uploader.destroy(uploadedImage.public_id);
      } catch (deleteError) {
        console.error("Cloudinary cleanup error:", deleteError);
      }
    }

    console.error("Create Banner Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload banner",
    });
  }
};

// Get All Banners Controller
export const getAllBanners = async (req, res) => {
  try {
    const banners = await BannerModel.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Banners fetched successfully",
      total: banners.length,
      data: banners,
    });
  } catch (error) {
    console.error("Get All Banners Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch banners",
    });
  }
};

// update Banner Controller
export const updateBanner = async (req, res) => {
  let uploadedImage = null;

  try {
    const { bannerId } = req.params;
    const { name, size } = req.body;

    const banner = await BannerModel.findById(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Validate name
    if (name !== undefined && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Banner name cannot be empty",
      });
    }

    // Validate size
    if (size !== undefined && !bannerSizes[size]) {
      return res.status(400).json({
        success: false,
        message: "Invalid banner size",
      });
    }

    // Update name
    if (name !== undefined) {
      banner.name = name.trim();
    }

    // Update size and dimensions
    if (size !== undefined) {
      banner.size = size;
      banner.width = bannerSizes[size].width;
      banner.height = bannerSizes[size].height;
    }

    // Replace image if new image is uploaded
    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Only image files are allowed",
        });
      }

      uploadedImage = await uploadBannerToCloudinary(req.file.buffer);

      banner.imageUrl = uploadedImage.url;
      banner.cloudinaryPublicId = uploadedImage.public_id;
    }

    await banner.save();

    // Delete old image only after successful database update
    if (uploadedImage) {
      try {
        await cloudinary.uploader.destroy(banner._originalCloudinaryPublicId);
      } catch (deleteError) {
        console.error("Old banner image deletion error:", deleteError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (error) {
    // Cleanup newly uploaded image if update fails
    if (uploadedImage?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedImage.public_id);
      } catch (deleteError) {
        console.error("New banner image cleanup error:", deleteError);
      }
    }

    console.error("Update Banner Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update banner",
    });
  }
};

// Delete Banner Controller
export const deleteBanner = async (req, res) => {
  try {
    const { bannerId } = req.params;

    if (!bannerId) {
      return res.status(400).json({
        success: false,
        message: "Banner ID is required",
      });
    }

    const banner = await BannerModel.findById(bannerId);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Delete image from Cloudinary
    if (banner.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(banner.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error("Cloudinary Delete Error:", cloudinaryError);

        return res.status(500).json({
          success: false,
          message: "Failed to delete banner image from Cloudinary",
        });
      }
    }

    // Delete banner from MongoDB
    await BannerModel.findByIdAndDelete(bannerId);

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Delete Banner Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete banner",
    });
  }
};

import mongoose from "mongoose";
import PartnerApplicationModel from "../models/partnerApplicationModel.js";
import { sendPartnerApplicationReplyEmail } from "../utils/sendRegistrationNotification.js";

// Create Partner Application
export const createPartnerApplication = async (req, res) => {
  try {
    const {
      fullName,
      companyName,
      email,
      contactNumber,
      websiteUrl,
      websiteCategory,
      partnershipType,
      message,
      agreedToTerms,
    } = req.body;

    // Required fields validation
    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !websiteUrl?.trim() ||
      !websiteCategory ||
      !partnershipType
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields.",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    // Website URL validation
    let validatedWebsiteUrl;

    try {
      validatedWebsiteUrl = new URL(websiteUrl.trim());

      if (!["http:", "https:"].includes(validatedWebsiteUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid website URL.",
      });
    }

    // Terms validation
    if (agreedToTerms !== true) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the partnership terms and privacy policy.",
      });
    }

    // Duplicate application check
    const existingApplication = await PartnerApplicationModel.findOne({
      email: email.trim().toLowerCase(),
      websiteUrl: validatedWebsiteUrl.href,
    });

    if (existingApplication) {
      return res.status(409).json({
        success: false,
        message:
          "You have already submitted a partnership application for this website.",
      });
    }

    // Create application
    const newApplication = await PartnerApplicationModel.create({
      fullName: fullName.trim(),
      companyName: companyName?.trim() || "",
      email: email.trim().toLowerCase(),
      contactNumber: contactNumber?.trim() || "",
      websiteUrl: validatedWebsiteUrl.href,
      websiteCategory,
      partnershipType,
      message: message?.trim() || "",
      agreedToTerms,
    });

    return res.status(201).json({
      success: true,
      message:
        "Thank you for your interest in partnering with GREENE VELVET. Your application has been submitted successfully. Our team will contact you soon.",
      data: newApplication,
    });
  } catch (error) {
    console.error("Create Partner Application Error:", error);

    // Mongoose validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

// get All Partner Applications
export const getAllPartnerApplications = async (req, res) => {
  try {
    const applications = await PartnerApplicationModel.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Partner applications fetched successfully",
      total: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Get All Partner Applications Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch partner applications",
    });
  }
};

// Admin Reply to Partner
export const adminReplyToPartner = async (req, res) => {
  try {
    const { applicationId, text } = req.body;

    // Validate required fields
    if (!applicationId || !text?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Application ID and reply message are required.",
      });
    }

    // Find application
    const application = await PartnerApplicationModel.findById(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Partner application not found.",
      });
    }

    // Send reply via email
    await sendPartnerApplicationReplyEmail({
      email: application.email,
      fullname: application.fullName,
      reply: text.trim(),
      status: application.status,
    });

    // Save reply after successful email delivery
    application.adminReply.push({
      text: text.trim(),
      sender: "Admin",
      time: new Date().toLocaleString(),
    });

    application.repliedAt = new Date();

    await application.save();

    return res.status(200).json({
      success: true,
      message: "Reply sent successfully via email.",
      data: application,
    });
  } catch (error) {
    console.error("Admin Reply Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send reply. Please try again later.",
    });
  }
};

// Update Partner Application Status
export const updatePartnerApplicationStatus = async (req, res) => {
  try {
    const { applicationId, status } = req.body;

    const allowedStatuses = ["Pending", "Under Review", "Approved", "Rejected"];

    if (!applicationId || !status) {
      return res.status(400).json({
        success: false,
        message: "Application ID and status are required",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid application status",
      });
    }

    const application = await PartnerApplicationModel.findByIdAndUpdate(
      applicationId,
      { $set: { status } },
      { new: true, runValidators: true },
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Partner application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Partner application status updated successfully",
      data: application,
    });
  } catch (error) {
    console.error("Update Partner Application Status Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update application status",
    });
  }
};

// Delete Partner Application
export const deletePartnerApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: "Application ID is required",
      });
    }

    const application =
      await PartnerApplicationModel.findByIdAndDelete(applicationId);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Partner application not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Partner application deleted successfully",
      data: application,
    });
  } catch (error) {
    console.error("Delete Partner Application Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete partner application",
    });
  }
};

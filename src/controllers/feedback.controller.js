import mongoose from "mongoose";
import FeedbackModel from "../models/feedbackModel.js";

// Escape special regex characters
const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const submitFeedback = async (req, res) => {
  try {
    const { source, category, message, currentStep, guestName, guestEmail } =
      req.body;

    const role = req.role || "Guest";
    const user = req.user || null;

    // 1. Basic validation
    if (!source || !category || !message?.trim()) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Source, category and message are required.",
      });
    }

    const allowedSources = [
      "registration",
      "escort-dashboard",
      "escort-profile",
      "user-dashboard",
      "user-side",
      "other",
    ];

    const allowedCategories = [
      "user-friendly",
      "technical-issue",
      "design-ui",
      "feature-request",
      "website-performance",
      "account-issue",
      "profile-issue",
      "registration-issue",
      "payment-issue",
      "suggestion",
      "personal-feedback",
      "other",
    ];

    if (!allowedSources.includes(source)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid feedback source.",
      });
    }

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid feedback category.",
      });
    }

    // 2. Registration feedback validation
    if (source === "registration") {
      const step = Number(currentStep);

      if (!Number.isInteger(step) || step < 1 || step > 7) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Valid registration step (1-7) is required.",
        });
      }
    }

    // 3. Guest validation
    if (!user) {
      if (!guestName?.trim() || !guestEmail?.trim()) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Name and email are required for guest feedback.",
        });
      }
    }

    // 4. Prepare feedback data
    const feedbackData = {
      submittedBy: user?._id || null,
      submittedByModel:
        role === "Escort" ? "Escort" : role === "Client" ? "Client" : null,

      isGuest: !user,
      guestName: !user ? guestName.trim() : null,
      guestEmail: !user ? guestEmail.trim().toLowerCase() : null,

      source,
      currentStep: source === "registration" ? Number(currentStep) : null,

      // TODO: Fetch actual completed step from Escort registration data.
      completedStep: null,

      category,
      message: message.trim(),
    };

    // 5. Save feedback
    const feedback = await FeedbackModel.create(feedbackData);

    return res.status(201).json({
      success: true,
      error: false,
      message: "Feedback submitted successfully.",
      data: feedback,
    });
  } catch (error) {
    console.error("SUBMIT FEEDBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      error: true,
      message: "Something went wrong while submitting feedback.",
    });
  }
};

export const getAllFeedback = async (req, res) => {
  try {
    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      category,
      source,
      submittedByModel,
      isGuest,
      fromDate,
      toDate,
    } = req.query;

    // Build filters
    const filter = {};

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (source) filter.source = source;

    if (submittedByModel) {
      filter.submittedByModel = submittedByModel;
    }

    if (isGuest !== undefined) {
      if (!["true", "false"].includes(isGuest)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "isGuest must be true or false.",
        });
      }

      filter.isGuest = isGuest === "true";
    }

    // Search feedback message and guest details
    if (search?.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), "i");

      filter.$or = [
        { message: searchRegex },
        { guestName: searchRegex },
        { guestEmail: searchRegex },
      ];
    }

    // Date range filter
    if (fromDate || toDate) {
      filter.createdAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate);

        if (Number.isNaN(startDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: true,
            message: "Invalid fromDate.",
          });
        }

        filter.createdAt.$gte = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate);

        if (Number.isNaN(endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: true,
            message: "Invalid toDate.",
          });
        }

        // Include the complete selected date
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    // Overall counts (not affected by search/filter)
    const [
      totalFeedback,
      pending,
      reviewed,
      resolved,
      guest,
      escort,
      client,
      filteredTotal,
      feedback,
    ] = await Promise.all([
      FeedbackModel.countDocuments(),

      FeedbackModel.countDocuments({ status: "pending" }),
      FeedbackModel.countDocuments({ status: "reviewed" }),
      FeedbackModel.countDocuments({ status: "resolved" }),

      FeedbackModel.countDocuments({ isGuest: true }),
      FeedbackModel.countDocuments({ submittedByModel: "Escort" }),
      FeedbackModel.countDocuments({ submittedByModel: "Client" }),

      FeedbackModel.countDocuments(filter),

      FeedbackModel.find(filter)
        .populate({
          path: "submittedBy",
          select: "-password",
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      error: false,
      message: "Feedback fetched successfully.",

      data: feedback,

      pagination: {
        currentPage: page,
        limit,
        totalFeedback: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit),
        hasNextPage: page < Math.ceil(filteredTotal / limit),
        hasPrevPage: page > 1,
      },

      counts: {
        total: totalFeedback,
        pending,
        reviewed,
        resolved,
        guest,
        escort,
        client,
      },
    });
  } catch (error) {
    console.error("GET ALL FEEDBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to fetch feedback.",
      errorMessage: error.message,
    });
  }
};

export const updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { status } = req.body;

    // Validate feedback ID
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid feedback ID.",
      });
    }

    // Validate status
    const allowedStatuses = ["pending", "reviewed", "resolved"];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: `Status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    // Update feedback
    const updatedFeedback = await FeedbackModel.findByIdAndUpdate(
      feedbackId,
      { $set: { status } },
      {
        new: true,
        runValidators: true,
      },
    ).populate({
      path: "submittedBy",
      select: "-password",
    });

    if (!updatedFeedback) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Feedback not found.",
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      message: "Feedback status updated successfully.",
      data: updatedFeedback,
    });
  } catch (error) {
    console.error("UPDATE FEEDBACK STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update feedback status.",
      errorMessage: error.message,
    });
  }
};

export const deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;

    // Validate feedback ID
    if (!mongoose.Types.ObjectId.isValid(feedbackId)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid feedback ID.",
      });
    }

    // Find and delete feedback
    const deletedFeedback = await FeedbackModel.findByIdAndDelete(feedbackId);

    if (!deletedFeedback) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "Feedback not found.",
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      message: "Feedback deleted successfully.",
      data: {
        _id: deletedFeedback._id,
      },
    });
  } catch (error) {
    console.error("DELETE FEEDBACK ERROR:", error);

    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to delete feedback.",
      errorMessage: error.message,
    });
  }
};

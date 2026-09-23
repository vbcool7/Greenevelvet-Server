import mongoose from "mongoose";
import EscortModel from "../models/escortModel.js";
import ReviewModel from "../models/reviewModel.js";



//===========================< Client >=================================//

// Creating Review
export const createReview = async (req, res) => {
    try {
        const clientId = req.user._id;
        const {
            escortId,
            rating,
            review
        } = req.body;

        console.log("req body ", req.body);
        console.log("clientId ", clientId);

        // Validate required fields
        if (!escortId || !rating || !review?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Escort, rating and review are required.",
            });
        }

        // Validate rating
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5.",
            });
        }

        // Check escort exists
        const escort = await EscortModel.findById(escortId);

        if (!escort) {
            return res.status(404).json({
                success: false,
                message: "Escort not found.",
            });
        }

        // Check if client already reviewed this escort
        const existingReview = await ReviewModel.findOne({
            clientId,
            escortId,
        });

        if (existingReview) {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this escort.",
            });
        }

        // Create review
        const newReview = await ReviewModel.create({
            clientId,
            escortId,
            rating,
            review: review.trim(),
            status: "pending",
        });

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully and is pending approval.",
            data: newReview,
        });
    } catch (error) {
        console.error("Create Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while submitting the review.",
            error: error.message,
        });
    }
};


// Client get all My given review
export const getMyReviews = async (req, res) => {
    try {
        const clientId = req.user._id;

        const reviews = await ReviewModel.find({
                clientId
            })
            .populate("escortId", "name email avatar")
            .sort({
                createdAt: -1
            });

        return res.status(200).json({
            success: true,
            message: "Your reviews fetched successfully.",
            data: reviews,
        });
    } catch (error) {
        console.error("Get My Reviews Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching your reviews.",
            error: error.message,
        });
    }
};


// Client Edit Review
export const editMyReview = async (req, res) => {
    try {

        const clientId = req.user._id;
        const {
            reviewId,
            rating,
            review: reviewText
        } = req.body;

        if (!rating || !reviewText?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Rating and review are required.",
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5.",
            });
        }

        const existingReview = await ReviewModel.findOne({
            _id: reviewId,
            clientId,
        });

        if (!existingReview) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        existingReview.rating = rating;
        existingReview.review = reviewText.trim();

        // Edited review requires admin approval again
        existingReview.status = "pending";

        // Reset previous admin action
        existingReview.adminAction = {
            adminId: null,
            actionAt: null,
            reason: "",
        };

        // Remove existing escort reply because the review content changed
        existingReview.escortReply = {
            text: "",
            repliedAt: null,
            updatedAt: null,
        };

        await existingReview.save();

        return res.status(200).json({
            success: true,
            message: "Review updated successfully and is pending approval.",
            data: existingReview,
        });
    } catch (error) {
        console.error("Edit My Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating the review.",
            error: error.message,
        });
    }
};


// Delete Review
export const deleteMyReview = async (req, res) => {
    try {
        const {
            reviewId
        } = req.body;
        const clientId = req.user._id;

        const review = await ReviewModel.findOne({
            _id: reviewId,
            clientId,
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        await ReviewModel.findByIdAndDelete(reviewId);

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully.",
        });
    } catch (error) {
        console.error("Delete My Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting the review.",
            error: error.message,
        });
    }
};

//===========================< Admin >=================================//


// Get all review for admin
export const getAllReviews = async (req, res) => {
    try {
        const {
            status = "all",
                rating,
                search,
                sortBy = "newest",
                page = 1,
                limit = 10,
        } = req.query;

        const pageNumber = Math.max(Number(page), 1);
        const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
        const skip = (pageNumber - 1) * limitNumber;

        const query = {};

        // Status Filter
        if (status !== "all") {
            if (!["pending", "approved", "rejected"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid review status.",
                });
            }

            query.status = status;
        }

        // Rating Filter
        if (rating && rating !== "all") {
            const ratingNumber = Number(rating);

            if (ratingNumber < 1 || ratingNumber > 5) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid rating.",
                });
            }

            query.rating = ratingNumber;
        }

        // Search Filter
        if (search?.trim()) {
            query.review = {
                $regex: search.trim(),
                $options: "i",
            };
        }

        // Sorting Logic
        let sortOptions = {};

        if (sortBy === "newest") {
            sortOptions = {
                createdAt: -1
            };
        } else if (sortBy === "oldest") {
            sortOptions = {
                createdAt: 1
            };
        } else if (sortBy === "highest") {
            sortOptions = {
                rating: -1,
                createdAt: -1
            };
        } else if (sortBy === "lowest") {
            sortOptions = {
                rating: 1,
                createdAt: -1
            };
        } else {
            sortOptions = {
                createdAt: -1
            };
        }

        const [reviews, totalReviews] = await Promise.all([
            ReviewModel.find(query)
            .populate("clientId", "name avatar")
            .populate("escortId", "name email")
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNumber)
            .lean(),

            ReviewModel.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            message: "Reviews fetched successfully.",
            data: reviews,
            pagination: {
                totalReviews,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalReviews / limitNumber),
                limit: limitNumber,
                hasNextPage: pageNumber * limitNumber < totalReviews,
                hasPreviousPage: pageNumber > 1,
            },
        });
    } catch (error) {
        console.error("Get All Reviews Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching reviews.",
            error: error.message,
        });
    }
};

// Approve Review
export const approveReview = async (req, res) => {
    try {
        const {
            reviewId
        } = req.body;
        const adminId = req.user._id;

        const review = await ReviewModel.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (review.status === "approved") {
            return res.status(400).json({
                success: false,
                message: "Review is already approved.",
            });
        }

        if (review.status === "rejected") {
            return res.status(400).json({
                success: false,
                message: "Rejected review cannot be approved.",
            });
        }

        review.status = "approved";
        review.adminAction = {
            adminId,
            actionAt: new Date(),
        };

        await review.save();

        return res.status(200).json({
            success: true,
            message: "Review approved successfully.",
            data: review,
        });
    } catch (error) {
        console.error("Approve Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while approving the review.",
            error: error.message,
        });
    }
};

// Reject Review
export const rejectReview = async (req, res) => {
    try {
        const {
            reviewId,
            reason
        } = req.body;
        const adminId = req.user._id;


        console.log("req.body ", req.body);

        if (!reason?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Rejection reason is required.",
            });
        }

        const review = await ReviewModel.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (review.status === "rejected") {
            return res.status(400).json({
                success: false,
                message: "Review is already rejected.",
            });
        }

        review.status = "rejected";
        review.adminAction = {
            adminId,
            actionAt: new Date(),
            reason: reason.trim(),
        };

        await review.save();

        return res.status(200).json({
            success: true,
            message: "Review rejected successfully.",
            data: review,
        });
    } catch (error) {
        console.error("Reject Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while rejecting the review.",
            error: error.message,
        });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const {
            reviewId
        } = req.query;
        const adminId = req.user._id;

        if (!adminId) {
            return res.status(400).json({
                success: false,
                message: "Unauthorized access.",
            });
        }


        const review = await ReviewModel.findOne({
            _id: reviewId,
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (review.status !== "rejected") {
            return res.status(400).json({
                success: false,
                message: "Only rejected reviews can be deleted.",
            });
        }

        await review.deleteOne();

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully.",
        });
    } catch (error) {
        console.error("Delete My Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting the review.",
            error: error.message,
        });
    }
};


//===========================< Escort >=================================//

// For escort profile reviews
export const getEscortProfileReviews = async (req, res) => {
    try {
        const {
            escortId
        } = req.query;

        const [reviews, reviewStats] = await Promise.all([
            ReviewModel.find({
                escortId,
                status: "approved",
            })
            .populate("clientId", "name")
            .sort({
                rating: -1,
                createdAt: -1,
            })
            .limit(5),

            ReviewModel.aggregate([{
                    $match: {
                        escortId: new mongoose.Types.ObjectId(escortId),
                        status: "approved",
                    },
                },
                {
                    $group: {
                        _id: "$escortId",
                        totalReviews: {
                            $sum: 1
                        },
                        averageRating: {
                            $avg: "$rating"
                        },
                    },
                },
            ]),
        ]);

        const stats = reviewStats[0] || {
            totalReviews: 0,
            averageRating: 0,
        };

        return res.status(200).json({
            success: true,
            message: "Escort profile reviews fetched successfully.",
            data: {
                reviews,
                totalReviews: stats.totalReviews,
                averageRating: Number(stats.averageRating.toFixed(2)),
            },
        });
    } catch (error) {
        console.error("Get Escort Profile Reviews Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching escort profile reviews.",
            error: error.message,
        });
    }
};

// Escort get all review
export const getEscortReviews = async (req, res) => {
    try {
        const {
            escortId,
            rating,
            search,
            sortBy = "newest",
            page = 1,
            limit = 10,
        } = req.query;

        if (!escortId || !mongoose.Types.ObjectId.isValid(escortId)) {
            return res.status(400).json({
                success: false,
                message: "Valid Escort ID is required.",
            });
        }

        const pageNumber = Math.max(Number(page) || 1, 1);
        const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
        const skip = (pageNumber - 1) * limitNumber;

        // Base Query
        const query = {
            escortId: new mongoose.Types.ObjectId(escortId),
            status: "approved",
        };

        // 1. Rating Filter Fix
        if (rating && rating !== "all" && rating !== undefined) {
            const ratingNumber = Number(rating);
            if (!isNaN(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5) {
                query.rating = ratingNumber;
            }
        }

        // 2. Search Filter Fix (Safely string format handle karna)
        if (search && String(search).trim() !== "" && search !== "undefined") {
            const cleanSearch = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            query.review = {
                $regex: cleanSearch,
                $options: "i"
            };
        }

        // 3. Sorting Options
        let sortOptions = {
            createdAt: -1
        };
        switch (sortBy) {
            case "oldest":
                sortOptions = {
                    createdAt: 1
                };
                break;
            case "highest":
                sortOptions = {
                    rating: -1,
                    createdAt: -1
                };
                break;
            case "lowest":
                sortOptions = {
                    rating: 1,
                    createdAt: -1
                };
                break;
            case "newest":
            default:
                sortOptions = {
                    createdAt: -1
                };
                break;
        }

        // Aggregate execution for populate & regex search consistency
        const [reviews, totalReviews, reviewStats] = await Promise.all([
            ReviewModel.find(query)
            .populate("clientId", "name avatar")
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNumber)
            .lean(),

            ReviewModel.countDocuments(query),

            // Escort overall summary (unfiltered stats)
            ReviewModel.aggregate([{
                    $match: {
                        escortId: new mongoose.Types.ObjectId(escortId),
                        status: "approved",
                    },
                },
                {
                    $group: {
                        _id: "$escortId",
                        totalReviews: {
                            $sum: 1
                        },
                        averageRating: {
                            $avg: "$rating"
                        },
                    },
                },
            ]),
        ]);

        const stats = reviewStats[0] || {
            totalReviews: 0,
            averageRating: 0,
        };

        return res.status(200).json({
            success: true,
            message: "Escort reviews fetched successfully.",
            data: {
                reviews,
                totalReviews: stats.totalReviews,
                averageRating: Number((stats.averageRating || 0).toFixed(2)),
            },
            pagination: {
                totalFilteredReviews: totalReviews,
                currentPage: pageNumber,
                totalPages: Math.ceil(totalReviews / limitNumber) || 1,
                limit: limitNumber,
                hasNextPage: pageNumber * limitNumber < totalReviews,
                hasPreviousPage: pageNumber > 1,
            },
        });
    } catch (error) {
        console.error("Get Escort Reviews Error:", error);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while fetching reviews.",
            error: error.message,
        });
    }
};


// report to review
export const reportReview = async (req, res) => {
    try {
        const {
            reviewId,
            reason,
            description,
        } = req.body;

        // 1. User Authentication Check
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized access.",
            });
        }

        // 2. Validate reviewId format
        if (!reviewId || !mongoose.Types.ObjectId.isValid(reviewId)) {
            return res.status(400).json({
                success: false,
                message: "Valid Review ID is required.",
            });
        }


        if (!reason?.trim() || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Report reason and description are required.",
            });
        }

        const review = await ReviewModel.findById(reviewId);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        // Only the escort who received the review can report it
        if (review.escortId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to report this review.",
            });
        }

        if (review.status !== "approved") {
            return res.status(400).json({
                success: false,
                message: "Only approved reviews can be reported.",
            });
        }

        if (review.report?.isReported) {
            return res.status(400).json({
                success: false,
                message: "This review has already been reported.",
            });
        }

        review.report = {
            isReported: true,
            reason: reason.trim(),
            description: description.trim(),
            reportedAt: new Date(),
            status: "pending",
            adminId: null,
            actionAt: null,
            adminReason: "",
        };

        await review.save();

        return res.status(200).json({
            success: true,
            message: "Review reported successfully.",
        });
    } catch (error) {
        console.error("Report Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while reporting the review.",
        });
    }
};

// Escort reply Review
export const replyToReview = async (req, res) => {
    try {

        const escortId = req.user._id;
        const {
            text,
            reviewId
        } = req.body;

        if (!text?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Reply text is required.",
            });
        }

        const review = await ReviewModel.findOne({
            _id: reviewId,
            escortId,
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (review.report?.isReported) {
            return res.status(400).json({
                success: false,
                message: "This review has been reported.",
            });
        }

        if (review.status !== "approved") {
            return res.status(400).json({
                success: false,
                message: "You can only reply to an approved review.",
            });
        }

        if (review.escortReply?.text) {
            return res.status(400).json({
                success: false,
                message: "You have already replied to this review.",
            });
        }

        review.escortReply = {
            text: text.trim(),
            repliedAt: new Date(),
            updatedAt: null,
        };

        await review.save();

        return res.status(200).json({
            success: true,
            message: "Reply added successfully.",
            data: review,
        });
    } catch (error) {
        console.error("Reply To Review Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while replying to the review.",
            error: error.message,
        });
    }
};

// Escort edit reply
export const editReviewReply = async (req, res) => {
    try {

        const escortId = req.user._id;
        const {
            text,
            reviewId
        } = req.body;

        if (!text?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Reply text is required.",
            });
        }

        const review = await ReviewModel.findOne({
            _id: reviewId,
            escortId,
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (review.report?.isReported) {
            return res.status(400).json({
                success: false,
                message: "This review has been reported.",
            });
        }

        if (review.status !== "approved") {
            return res.status(400).json({
                success: false,
                message: "You can only edit a reply on an approved review.",
            });
        }

        if (!review.escortReply?.text) {
            return res.status(400).json({
                success: false,
                message: "No reply found for this review.",
            });
        }

        review.escortReply.text = text.trim();
        review.escortReply.updatedAt = new Date();

        await review.save();

        return res.status(200).json({
            success: true,
            message: "Reply updated successfully.",
            data: review,
        });
    } catch (error) {
        console.error("Edit Review Reply Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while updating the reply.",
            error: error.message,
        });
    }
};

// Escort delete reply
export const deleteReviewReply = async (req, res) => {
    try {
        const {
            reviewId
        } = req.body;
        const escortId = req.user._id;

        const review = await ReviewModel.findOne({
            _id: reviewId,
            escortId,
        });

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Review not found.",
            });
        }

        if (!review.escortReply?.text) {
            return res.status(400).json({
                success: false,
                message: "No reply found for this review.",
            });
        }

        review.escortReply = {
            text: "",
            repliedAt: null,
            updatedAt: null,
        };

        await review.save();

        return res.status(200).json({
            success: true,
            message: "Reply deleted successfully.",
        });
    } catch (error) {
        console.error("Delete Review Reply Error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong while deleting the reply.",
            error: error.message,
        });
    }
};
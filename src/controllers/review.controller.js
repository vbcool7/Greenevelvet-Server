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
            Review.find(query)
            .populate("clientId", "name avatar")
            .populate("escortId", "name email")
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNumber)
            .lean(),

            Review.countDocuments(query),
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

        if (review.status === "approved") {
            return res.status(400).json({
                success: false,
                message: "Approved review cannot be rejected.",
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


//===========================< Escort >=================================//

// For escort profile reviews
export const getEscortProfileReviews = async (req, res) => {
    try {
        const {
            escortId
        } = req.body;

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
        const escortId = req.user._id;

        const reviews = await ReviewModel.find({
                escortId,
                status: "approved",
            })
            .populate("clientId", "name avatar")
            .sort({
                createdAt: -1
            });

        const reviewStats = await ReviewModel.aggregate([{
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
                averageRating: Number(stats.averageRating.toFixed(2)),
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
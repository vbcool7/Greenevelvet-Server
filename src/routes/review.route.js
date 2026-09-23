import {
    Router
} from "express";
import {
    protect
} from "../middleware/auth.js";
import {
    approveReview,
    createReview,
    deleteMyReview,
    deleteReviewReply,
    editMyReview,
    editReviewReply,
    getAllReviews,
    getEscortProfileReviews,
    getEscortReviews,
    getMyReviews,
    rejectReview,
    replyToReview
} from "../controllers/review.controller.js";

const reviewRouter = Router();

// ------------------------------< Client >---------------------------//
reviewRouter.post("/create-review", protect(["Client"]), createReview);
reviewRouter.get("/get-my-reviews", protect(["Client"]), getMyReviews);
reviewRouter.patch("/edit-my-review", protect(["Client"]), editMyReview);
reviewRouter.delete("/delete-my-review", protect(["Client"]), deleteMyReview);


// ------------------------------< Admin >---------------------------//
reviewRouter.get("/get-all-review", protect(["Admin"]), getAllReviews);
reviewRouter.patch("/approve-review", protect(["Admin"]), approveReview);
reviewRouter.patch("/reject-review", protect(["Admin"]), rejectReview);


// ------------------------------< Escort >---------------------------//
reviewRouter.get("/get-escort-profile-reviews",  getEscortProfileReviews);
reviewRouter.get("/get-escort-reviews", getEscortReviews);
reviewRouter.patch("/reply-to-reviews", protect(["Escort"]), replyToReview);
reviewRouter.patch("/edit-reply", protect(["Escort"]), editReviewReply);
reviewRouter.delete("/delete-reply", protect(["Escort"]), deleteReviewReply);


export default reviewRouter ;
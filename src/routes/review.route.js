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
    editMyReview,
    getAllReviews,
    getEscortProfileReviews,
    getMyReviews,
    rejectReview
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
reviewRouter.get("/get-escort-reviews", getEscortProfileReviews);
reviewRouter.patch("/reply-to-reviews", protect(["Escort"]), getEscortProfileReviews);
reviewRouter.patch("/edit-reply", protect(["Escort"]), getEscortProfileReviews);
reviewRouter.delete("/delete-reply", protect(["Escort"]), getEscortProfileReviews);


export default reviewRouter ;
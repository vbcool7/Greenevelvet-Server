import { Router } from "express";
import {
  deleteFeedback,
  getAllFeedback,
  submitFeedback,
  updateFeedbackStatus,
} from "../controllers/feedback.controller.js";
import { protect, optionalProtect } from "../middleware/auth.js";

const feedbackRouter = Router();

feedbackRouter.post("/submit-feedback", optionalProtect, submitFeedback);

feedbackRouter.get("/all-feedback", protect(["Admin"]), getAllFeedback);

feedbackRouter.patch(
  "/update-status/:feedbackId",
  protect(["Admin"]),
  updateFeedbackStatus,
);

feedbackRouter.delete(
  "/delete/:feedbackId",
  protect(["Admin"]),
  deleteFeedback,
);

export default feedbackRouter;

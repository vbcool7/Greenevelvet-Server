import { Router } from "express";
import {
  adminReplyToPartner,
  createPartnerApplication,
  deletePartnerApplication,
  getAllPartnerApplications,
  updatePartnerApplicationStatus,
} from "../controllers/partnerApplication.controller.js";
import { protect } from "../middleware/auth.js";

const partnerApplicationRouter = Router();

partnerApplicationRouter.post("/create-application", createPartnerApplication);
partnerApplicationRouter.get(
  "/get-all-applications",
  protect(["Admin"]),
  getAllPartnerApplications,
);

partnerApplicationRouter.post(
  "/admin-reply",
  protect(["Admin"]),
  adminReplyToPartner,
);

partnerApplicationRouter.patch(
  "/update-status",
  protect(["Admin"]),
  updatePartnerApplicationStatus,
);
partnerApplicationRouter.delete(
  "/delete-application/:applicationId",
  protect(["Admin"]),
  deletePartnerApplication,
);

export default partnerApplicationRouter;

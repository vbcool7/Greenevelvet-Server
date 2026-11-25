import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  listBroadcastersForAdmin,
  updateBroadcasterEligibility,
  listLiveSessionsForAdmin,
  controlStreamSession,
  listModerationReports,
  resolveModerationReport,
  getAdminFinancialOverview,
  processPayoutByAdmin,
} from "../controllers/adminLiveCamController.js";

const adminliveCamRouter = Router();

adminliveCamRouter.use(protect(["Admin"]));

adminliveCamRouter.get("/broadcasters", listBroadcastersForAdmin);
adminliveCamRouter.patch(
  "/broadcasters/:escortId/eligibility",
  updateBroadcasterEligibility,
);

adminliveCamRouter.get("/sessions", listLiveSessionsForAdmin);
adminliveCamRouter.post("/sessions/:sessionId/control", controlStreamSession);

adminliveCamRouter.get("/reports", listModerationReports);
adminliveCamRouter.patch("/reports/:reportId/resolve", resolveModerationReport);

adminliveCamRouter.get("/financials", getAdminFinancialOverview);
adminliveCamRouter.patch("/payouts/:payoutId/process", processPayoutByAdmin);

export default adminliveCamRouter;

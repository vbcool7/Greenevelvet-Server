import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  checkGeoRestriction,
  requireAgeAssurance,
  requireApprovedBroadcaster,
} from "../middleware/complianceGuard.js";
import {
  getOrUpdateBroadcasterProfile,
  prepareLiveStudio,
  startBroadcast,
  updateStreamHealth,
  endBroadcast,
  blockViewer,
  reportViewer,
  getBroadcasterAnalytics,
} from "../controllers/broadcasterController.js";

const broadcasterRouter = Router();

broadcasterRouter.use(checkGeoRestriction);
broadcasterRouter.use(protect(["Escort"]));

broadcasterRouter.get("/profile", getOrUpdateBroadcasterProfile);
broadcasterRouter.put("/profile", getOrUpdateBroadcasterProfile);
broadcasterRouter.patch("/profile", getOrUpdateBroadcasterProfile);

broadcasterRouter.post(
  "/studio/prepare",
  requireAgeAssurance,
  requireApprovedBroadcaster,
  prepareLiveStudio,
);

broadcasterRouter.post(
  "/stream/start",
  requireAgeAssurance,
  requireApprovedBroadcaster,
  startBroadcast,
);

broadcasterRouter.post(
  "/stream/health",
  requireAgeAssurance,
  requireApprovedBroadcaster,
  updateStreamHealth,
);

broadcasterRouter.post(
  "/stream/end",
  requireAgeAssurance,
  requireApprovedBroadcaster,
  endBroadcast,
);

broadcasterRouter.post("/viewer/block", blockViewer);
broadcasterRouter.post("/viewer/report", reportViewer);
broadcasterRouter.get("/analytics", getBroadcasterAnalytics);

export default broadcasterRouter;

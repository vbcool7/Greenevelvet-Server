import { Router } from "express";
import { protect, optionalProtect } from "../middleware/auth.js";
import { checkGeoRestriction } from "../middleware/complianceGuard.js";
import {
  discoverStreams,
  getStreamDetails,
  joinStreamSession,
  getOrUpdateViewerProfile,
  toggleFavoriteBroadcaster,
  toggleBlockAccount,
  reportBroadcasterOrStream,
  requestViewerAccountDeletion,
} from "../controllers/viewerController.js";

const viewerRouter = Router();

viewerRouter.use(checkGeoRestriction);

// Public / Guest-compatible discovery & stream status
viewerRouter.get("/discover", optionalProtect, discoverStreams);
viewerRouter.get("/streams/:sessionId", optionalProtect, getStreamDetails);

// Authenticated join & viewer account controls
viewerRouter.post(
  "/streams/:sessionId/join",
  protect(["Client", "Escort", "Admin"]),
  joinStreamSession,
);

viewerRouter.get("/profile", protect(["Client"]), getOrUpdateViewerProfile);
viewerRouter.put("/profile", protect(["Client"]), getOrUpdateViewerProfile);
viewerRouter.patch("/profile", protect(["Client"]), getOrUpdateViewerProfile);

viewerRouter.post(
  "/favorites/toggle",
  protect(["Client"]),
  toggleFavoriteBroadcaster,
);
viewerRouter.post("/block/toggle", protect(["Client"]), toggleBlockAccount);
viewerRouter.post("/report", protect(["Client"]), reportBroadcasterOrStream);
viewerRouter.post(
  "/account/delete",
  protect(["Client"]),
  requestViewerAccountDeletion,
);

export default viewerRouter;

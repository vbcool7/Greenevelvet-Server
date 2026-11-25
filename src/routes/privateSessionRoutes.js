import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  checkGeoRestriction,
  requireAgeAssurance,
} from "../middleware/complianceGuard.js";
import {
  requestPrivateSession,
  respondPrivateSession,
  joinPrivateSessionRoom,
  finishPrivateSession,
  listPrivateSessions,
} from "../controllers/privateSessionController.js";

const privateSessionRouter = Router();

privateSessionRouter.use(checkGeoRestriction);
privateSessionRouter.use(protect(["Escort", "Client"]));

privateSessionRouter.get("/history", listPrivateSessions);
privateSessionRouter.post(
  "/request",
  protect(["Client"]),
  requireAgeAssurance,
  requestPrivateSession,
);
privateSessionRouter.post(
  "/:sessionId/respond",
  protect(["Escort"]),
  respondPrivateSession,
);
privateSessionRouter.post(
  "/:sessionId/join",
  requireAgeAssurance,
  joinPrivateSessionRoom,
);
privateSessionRouter.post("/:sessionId/close", finishPrivateSession);

export default privateSessionRouter;

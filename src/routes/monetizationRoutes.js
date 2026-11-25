import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  initiateNowPayment,
  handleNowPaymentsWebhook,
  getViewerBillingHistory,
  getBroadcasterEarnings,
  requestBroadcasterPayout,
} from "../controllers/monetizationController.js";

const monetizationRouter = Router();

// IPN Webhook endpoint (signature verified inside controller)
monetizationRouter.post("/webhook/nowpayments", handleNowPaymentsWebhook);

// Viewer billing & NOWPayments checkout
monetizationRouter.post("/checkout", protect(["Client"]), initiateNowPayment);
monetizationRouter.get(
  "/viewer/billing",
  protect(["Client"]),
  getViewerBillingHistory,
);

// Broadcaster earnings & payouts
monetizationRouter.get(
  "/broadcaster/earnings",
  protect(["Escort"]),
  getBroadcasterEarnings,
);
monetizationRouter.post(
  "/broadcaster/payout",
  protect(["Escort"]),
  requestBroadcasterPayout,
);

export default monetizationRouter;

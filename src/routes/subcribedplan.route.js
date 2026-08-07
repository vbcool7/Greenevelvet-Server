import { Router } from "express";
import { checkSubscription, createTransaction, escrowWebhook } from "../controllers/subcribedplan.controller.js";
import { protect } from "../middleware/auth.js";

const subcribedRouter = Router();

subcribedRouter.post("/create-transaction",protect(["Escort"]), createTransaction);
subcribedRouter.post("/nowpayments-webhook", escrowWebhook);
subcribedRouter.get("check-subcription", checkSubscription);

export default subcribedRouter;
import { Router } from "express";
import { checkSubscription, createTransaction, escrowWebhook } from "../controllers/subcribedplan.controller.js";

const subcribedRouter = Router();

subcribedRouter.post("/create-transection", createTransaction);
subcribedRouter.post("/escrow-webhook", escrowWebhook);
subcribedRouter.get("check-subcription", checkSubscription);

export default subcribedRouter;
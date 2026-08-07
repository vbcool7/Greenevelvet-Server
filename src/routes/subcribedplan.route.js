import express from "express";
import { Router } from "express";
import { checkSubscription, createTransaction, nowPaymentsWebhook, } from "../controllers/subcribedplan.controller.js";
import { protect } from "../middleware/auth.js";

const subcribedRouter = Router();

subcribedRouter.post("/create-transaction", protect(["Escort"]), createTransaction);

subcribedRouter.post("/nowpayments-webhook", express.raw({ type: "application/json" }), nowPaymentsWebhook);

subcribedRouter.get("/check-subcription", checkSubscription);


export default subcribedRouter;
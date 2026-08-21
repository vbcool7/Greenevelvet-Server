import express from "express";
import {
    Router
} from "express";
import {
    checkSubscription,
    createTransaction,
    fetchEscortCurrentPlan,
    nowPaymentsWebhook,
} from "../controllers/subcribedplan.controller.js";
import {
    protect
} from "../middleware/auth.js";

const subcribedRouter = Router();

subcribedRouter.post("/create-transaction", protect(["Escort"]), createTransaction);

subcribedRouter.post("/nowpayments-webhook", express.raw({
    type: "application/json"
}), nowPaymentsWebhook);

subcribedRouter.get("/check-subcription", checkSubscription);

subcribedRouter.get("/escort-current-plan", protect(["Escort"]), fetchEscortCurrentPlan);



export default subcribedRouter;
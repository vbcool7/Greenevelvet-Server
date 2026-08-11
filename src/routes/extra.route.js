import express from "express";

import {
    Router
} from "express";
import {
    createExtraPlan,
    createExtraPlanTransaction,
    extranowPaymentsWebhook,
    getAllActiveExtraPlans,
    getAllExtraPlans,
    getSelectExtraPlan,
    updateExtraPlan,
} from "../controllers/extra.controller.js";

import {
    protect
} from "../middleware/auth.js";

const extraRouter = Router();

extraRouter.post("/create-extra-plan", createExtraPlan);
extraRouter.patch("/update-extra-plan/:id", updateExtraPlan);
extraRouter.get("/fetch-active-extra-plan", getAllActiveExtraPlans);
extraRouter.get("/fetch-all-extra-plan", getAllExtraPlans);
extraRouter.get("/fetch-select-extra-plan/:id", getSelectExtraPlan);

extraRouter.post("/create-extra-plan-transaction", protect(["Escort"]), createExtraPlanTransaction);

// extraRouter.post("/nowpayments-webhook", nowPaymentsWebhook);

extraRouter.post("/extra-nowpayments-webhook", express.raw({
    type: "application/json"
}), extranowPaymentsWebhook);

export default extraRouter;
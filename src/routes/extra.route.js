import { Router } from "express";
import { createExtraPlan, createTransaction, getAllActiveExtraPlans, getAllExtraPlans, getSelectExtraPlan, updateExtraPlan } from "../controllers/extra.controller.js";
import { protect } from "../middleware/auth.js";

const extraRouter = Router();

extraRouter.post("/create-extra-plan", createExtraPlan);
extraRouter.patch("/update-extra-plan/:id", updateExtraPlan);
extraRouter.get("/fetch-active-extra-plan", getAllActiveExtraPlans);
extraRouter.get("/fetch-all-extra-plan", getAllExtraPlans);
extraRouter.get("/fetch-select-extra-plan/:id", getSelectExtraPlan);

extraRouter.post("/create-transection",protect(["Escort"]), createTransaction);


export default extraRouter;
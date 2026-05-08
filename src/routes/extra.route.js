import { Router } from "express";
import { createExtraPlan, getAllActiveExtraPlans, getAllExtraPlans, getSelectExtraPlan, updateExtraPlan } from "../controllers/extra.controller.js";

const extraRouter = Router();

extraRouter.post("/create-extra-plan", createExtraPlan);
extraRouter.patch("update-extra-plan", updateExtraPlan);
extraRouter.get("/fetch-all-extra-plan", getAllActiveExtraPlans);
extraRouter.get("/fetch-active-extra-plan", getAllExtraPlans);
extraRouter.get("/fetch-select-extra-plan", getSelectExtraPlan);


export default extraRouter;
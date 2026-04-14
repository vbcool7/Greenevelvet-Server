import { Router } from "express";
import { createPlan, getAllActivePlans, getAllPlans, getSinglePlan, updatePlan } from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

subscriptionRouter.post("/create", createPlan);
subscriptionRouter.get("/all-plans", getAllPlans);
subscriptionRouter.get("/all-active-plans", getAllActivePlans);
subscriptionRouter.get("/plan/:id", getSinglePlan);
subscriptionRouter.patch("/update/:id", updatePlan);

export default subscriptionRouter;


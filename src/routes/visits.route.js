import { Router } from "express";
import { addVisit, getVisitStats } from "../controllers/visit.controller.js";

const visitRouter = Router()

visitRouter.post("/add-visit", addVisit);
visitRouter.get("/fetch-visit-stats", getVisitStats);

export default visitRouter;
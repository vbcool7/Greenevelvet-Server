import { Router } from "express";
import { addVisit, getVisitStats, totalVisitStats } from "../controllers/visit.controller.js";

const visitRouter = Router()

visitRouter.post("/add-visit", addVisit);
visitRouter.get("/fetch-visit-stats", getVisitStats);
visitRouter.get("/fetch-total-visit-allstats", totalVisitStats);


export default visitRouter;
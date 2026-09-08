import { Router } from "express";
import { addVisit, getSearchAppearanceStats, getVisitStats, totalVisitStats } from "../controllers/visit.controller.js";

const visitRouter = Router()

visitRouter.post("/add-visit", addVisit);
visitRouter.get("/fetch-visit-stats", getVisitStats);
visitRouter.get("/fetch-total-visit-allstats", totalVisitStats);
visitRouter.post("/get-search-appearance-stats", getSearchAppearanceStats);




export default visitRouter;
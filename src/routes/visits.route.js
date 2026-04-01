import { Router } from "express";
import { addVisit, getVisitStats } from "../controllers/visit.controller.js";
import { protect } from "../middleware/auth.js";

const visitRouter = Router()

visitRouter.post("/add-visit", addVisit);
visitRouter.get("/fetch-visit-stats",protect("Escort"), getVisitStats);

export default visitRouter;
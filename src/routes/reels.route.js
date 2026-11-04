import { Router } from "express";
import { getReelsController } from "../controllers/reels.controller.js";

import { protect } from "../middleware/auth.js";

const reelsRouter = Router();

reelsRouter.get("/get-all-reels", getReelsController);

export default reelsRouter;

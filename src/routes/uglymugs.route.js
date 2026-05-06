import { Router } from 'express';

import { checkClientRisk, createUglyMug, deleteUglyMug, getAllUglyMugsAdmin, getAllUglyMugsEscorts, getMyUglyMugs, updateUglyMug } from '../controllers/uglymugs.controller.js';
import { protect } from '../middleware/auth.js';

const uglymugsRouter = Router();

uglymugsRouter.post("/create-uglymug", createUglyMug);
uglymugsRouter.get("/fetch-all-uglymugs", getAllUglyMugsAdmin);
uglymugsRouter.get("/fetch-active-uglymugs", getAllUglyMugsEscorts);
uglymugsRouter.get("/fetch-my-uglymugs", protect(["Escort"]), getMyUglyMugs);
uglymugsRouter.get("/fetch-client-risk", checkClientRisk);
uglymugsRouter.patch("/update-uglymug", protect(["Admin"]), updateUglyMug);
uglymugsRouter.delete("/delete-uglymug", deleteUglyMug);

export default uglymugsRouter;
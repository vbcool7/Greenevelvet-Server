import { Router } from 'express';

import { checkClientRisk, createUglyMug, deleteUglyMug, getAllUglyMugsAdmin, getAllUglyMugsEscorts, getMyUglyMugs, updateUglyMug } from '../controllers/uglymugs.controller.js';
import { protect } from '../middleware/auth.js';

const uglymugsRouter = Router();

uglymugsRouter.post("/create-uglymug", protect(["Escort"]), createUglyMug);
uglymugsRouter.get("/all-uglymugs", getAllUglyMugsAdmin);
uglymugsRouter.get("/active-uglymugs", getAllUglyMugsEscorts);
uglymugsRouter.get("/my-uglymugs", protect(["Escort"]), getMyUglyMugs);
uglymugsRouter.post("/check-client-risk", checkClientRisk);
uglymugsRouter.patch("/update-uglymug", protect(["Admin"]), updateUglyMug);
uglymugsRouter.delete("/delete-uglymug/:id", deleteUglyMug);

export default uglymugsRouter;
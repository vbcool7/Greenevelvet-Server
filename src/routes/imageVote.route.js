import { Router } from "express";

import { voteOnEscortImage } from "../controllers/imageVote.controller.js";
import { protect } from "../middleware/auth.js";

const imageVoteRouter = Router();

imageVoteRouter.post(
  "/:escortId/photos/:imageId/add-vote",
  protect(["Client"]),
  voteOnEscortImage,
);

export default imageVoteRouter;

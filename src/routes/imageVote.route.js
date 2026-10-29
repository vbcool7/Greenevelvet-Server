import { Router } from "express";

import { getMyImageVotes, voteOnEscortImage } from "../controllers/imageVote.controller.js";
import { protect } from "../middleware/auth.js";

const imageVoteRouter = Router();

imageVoteRouter.post(
  "/:escortId/photos/:imageId/add-vote",
  protect(["Client"]),
  voteOnEscortImage,
);

imageVoteRouter.get(
  "/:escortId/photos/my-votes",
  protect(["Client"]),
  getMyImageVotes,
);
export default imageVoteRouter;

import { Router } from "express";
import { protect } from "../middleware/auth.js";
import {
  addStoryView,
  createStory,
  deleteStory,
  fetchEscortStories,
  fetchStoryEscorts,
  getMyViewedStories,
  getStoryViewers,
} from "../controllers/story.controller.js";
import upload from "../middleware/multer.js";

const storyRouter = Router();

//------------------ Story rotes-------------//

storyRouter.post(
  "/create-story",
  upload.single("media"),
  protect(["Escort"]),
  createStory,
);
storyRouter.get("/get-active-story-escorts", fetchStoryEscorts);
storyRouter.get("/get-escort-stories/:id", fetchEscortStories);
storyRouter.delete("/delete-story/:storyId", protect(["Escort"]), deleteStory);

//------------------ Story view rotes-------------//

storyRouter.post("/add-view", protect(["Client", "Escort"]), addStoryView);
storyRouter.get("/viewers/:storyId", protect(["Escort"]), getStoryViewers);
storyRouter.get("/my-viewed-stories", protect(["Client", "Escort"]), getMyViewedStories);

//------------------ Story like rotes-------------//

export default storyRouter;

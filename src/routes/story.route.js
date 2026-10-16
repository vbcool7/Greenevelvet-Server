import {
    Router
} from "express";
import {
    protect
} from "../middleware/auth.js";
import {
    createStory,
    deleteSelectedStoryController,
    fetchCreatedActiveStoryEscorts,
    fetchSelectedEscortActiveStories
} from "../controllers/story.controller";

const storyRouter = Router();

storyRouter.post("/create-story", protect(["Escort"]), createStory);
storyRouter.get("/get-active-story-escorts", fetchCreatedActiveStoryEscorts);
storyRouter.get("/get-escort-stories", fetchSelectedEscortActiveStories);
storyRouter.delete("/delete-story", protect(["Escort"]), deleteSelectedStoryController);


export default storyRouter;
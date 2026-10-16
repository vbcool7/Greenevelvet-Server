import {
    Router
} from "express";
import {
    protect
} from "../middleware/auth.js";
import {
    createStory,
    deleteStory,
    fetchEscortStories,
    fetchStoryEscorts,

} from "../controllers/story.controller.js";
import upload from "../middleware/multer.js";

const storyRouter = Router();

storyRouter.post("/create-story", upload.single("media"), protect(["Escort"]), createStory);
storyRouter.get("/get-active-story-escorts", fetchStoryEscorts);
storyRouter.get("/get-escort-stories", fetchEscortStories);
storyRouter.delete("/delete-story", protect(["Escort"]), deleteStory);


export default storyRouter;
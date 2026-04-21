import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller.js";
import upload from "../middleware/multer.js";

const settingsRouter = Router();

settingsRouter.get("/fetch", getSettings);
settingsRouter.post("/update", upload.fields([{ name: "logo", maxCount: 1 }, { name: "banner", maxCount: 1 },]), updateSettings);

export default settingsRouter;
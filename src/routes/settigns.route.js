import { Router } from "express";
import { getSettings, updatePreferences, updateSiteIdentity } from "../controllers/settings.controller.js";
import upload from "../middleware/multer.js";

const settingsRouter = Router();

settingsRouter.get("/fetch", getSettings);
settingsRouter.patch("/update-site-identity", upload.fields([{ name: "logo", maxCount: 1 }, { name: "banner", maxCount: 1 },]), updateSiteIdentity);
settingsRouter.patch("/update-preference", updatePreferences)

export default settingsRouter;
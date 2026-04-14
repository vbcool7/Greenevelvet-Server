import { Router } from "express";
import { deleteCms, getActiveSlug, getAllCms, getCmsBySlug, saveCms, updateStatus } from "../controllers/cms.controller.js";

const cmsRouter = Router()

cmsRouter.post("/save", saveCms);
cmsRouter.get("/all-slug", getAllCms);
cmsRouter.patch("/update-status", updateStatus);
cmsRouter.get("/:slug", getCmsBySlug);
cmsRouter.get("/active/:slug", getActiveSlug);
cmsRouter.delete("/delete/:id", deleteCms);

export default cmsRouter;
import { Router } from "express";
import { deleteCms, getAllCms, getCmsBySlug, saveCms } from "../controllers/cms.controller.js";

const cmsRouter = Router()

cmsRouter.post("/save", saveCms);
cmsRouter.get("/get-all-slug", getAllCms);
cmsRouter.get("/:slug", getCmsBySlug);
cmsRouter.delete("/:id", deleteCms);

export default cmsRouter;
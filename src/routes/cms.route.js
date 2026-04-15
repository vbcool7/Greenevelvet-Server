import { Router } from "express";

import { addLocationContentCms, deleteCms, deleteLocationContent, fetchAllLocations, getActiveLocaionContent, getActiveSlug, getAllCms, getCmsBySlug, getLocationContentBySlug, saveCms, updateLocationContentStatus, updateStatus } from "../controllers/cms.controller.js";

const cmsRouter = Router()

cmsRouter.post("/save", saveCms);
cmsRouter.get("/all-slug", getAllCms);
cmsRouter.patch("/update-status", updateStatus);
cmsRouter.get("/slug/:slug", getCmsBySlug);
cmsRouter.get("/active/:slug", getActiveSlug);
cmsRouter.delete("/delete/:id", deleteCms);

cmsRouter.post("/add-location-content", addLocationContentCms);
cmsRouter.get("/fetch-all-locations", fetchAllLocations);
cmsRouter.patch("/update-location-content-status", updateLocationContentStatus);
cmsRouter.get("/location-content/:slug", getLocationContentBySlug);
cmsRouter.get("/active-location-content/:slug", getActiveLocaionContent);
cmsRouter.delete("/delete-location-content/:id", deleteLocationContent);


export default cmsRouter;
import { Router } from "express";
import { getGeoFromLatLng } from "../controllers/geoController.js";

const geoRouter = Router()

geoRouter.post("/latlng", getGeoFromLatLng);

export default geoRouter;
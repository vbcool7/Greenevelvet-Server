import { Router } from "express";

import { getClientsdata, getEscortsdata } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get('/escorts-data', getEscortsdata);
dashboardRouter.get('/clients-data', getClientsdata);

export default dashboardRouter;
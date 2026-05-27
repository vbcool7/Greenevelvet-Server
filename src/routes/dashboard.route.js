import { Router } from "express";

import { getBookingsData, getClientsdata, getEscortsdata } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get('/escorts-data', getEscortsdata);
dashboardRouter.get('/clients-data', getClientsdata);
dashboardRouter.get('/bookings-data', getBookingsData);

export default dashboardRouter;
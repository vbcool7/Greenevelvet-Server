import {
    Router
} from "express";

import {
    getAllEarnings,
    getBookingsData,
    getClientsdata,
    getEscortsdata,
    getRecentSubscriptions
} from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.get('/escorts-data', getEscortsdata);
dashboardRouter.get('/clients-data', getClientsdata);
dashboardRouter.get('/bookings-data', getBookingsData);
dashboardRouter.get('/all-earnings-data', getAllEarnings);
dashboardRouter.get("/get-recent-subscriptions", getRecentSubscriptions);


export default dashboardRouter;
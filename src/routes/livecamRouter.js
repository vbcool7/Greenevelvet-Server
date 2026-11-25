import { Router } from "express";
import broadcasterRouter from "./broadcasterRoutes.js";
import viewerRouter from "./viewerRoutes.js";
import inboxRouter from "./inboxRoutes.js";
import privateSessionRouter from "./privateSessionRoutes.js";
import monetizationRouter from "./monetizationRoutes.js";
import adminliveCamRouter from "./adminLiveCamRoutes.js";

const liveCamRouter = Router();

liveCamRouter.use("/broadcaster", broadcasterRouter);
liveCamRouter.use("/viewer", viewerRouter);
liveCamRouter.use("/inbox", inboxRouter);
liveCamRouter.use("/private-sessions", privateSessionRouter);
liveCamRouter.use("/monetization", monetizationRouter);
liveCamRouter.use("/admin", adminliveCamRouter);

export default liveCamRouter;

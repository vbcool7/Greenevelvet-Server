import { Router } from "express";

import { loginUsercontroller } from "../controllers/Login.controller.js";

const loginRouter = Router()

loginRouter.post("/login", loginUsercontroller);

export default loginRouter;
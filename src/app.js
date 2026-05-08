import express from "express";
import cors from "cors";
import escortRouter from "./routes/escort.route.js";
import clientRouter from "./routes/client.route.js"
import adminRouter from "./routes/admin.route.js";
import loginRouter from "./routes/login.route.js";
import geoRouter from "./routes/geo.route.js";
import visitRouter from "./routes/visits.route.js";
import cmsRouter from "./routes/cms.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import contactRouter from "./routes/contact.route.js";
import settingsRouter from "./routes/settigns.route.js";
import subcribedRouter from "./routes/subcribedplan.route.js";
import uglymugsRouter from "./routes/uglymugs.route.js";
import extraRouter from "./routes/extra.route.js";

const app = express();

app.use(cors({
    credentials: true,
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "https://admin.greenevelvet.com",
        "https://greenevelvet.com",
        "https://www.greenevelvet.com",
        "https://d24rgp5ie3y2qc.cloudfront.net",
        "https://d3t84nzlb2gzox.cloudfront.net",
    ]
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }));

/* Health Check */
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "API is running successfully"
    });
});

app.set("trust proxy", true);

/* Routes */
app.use('/geo', geoRouter);
app.use('/admin', adminRouter);
app.use('/escort', escortRouter);
app.use('/client', clientRouter);
app.use('/user', loginRouter);
app.use('/visit', visitRouter);
app.use('/cms', cmsRouter);
app.use('/subscription', subscriptionRouter);
app.use('/contact', contactRouter);
app.use('/settings', settingsRouter);
app.use('/escrow', subcribedRouter);
app.use('/uglymugs', uglymugsRouter);
app.use('/extra', extraRouter);



/* Global Error Handler */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

export default app;
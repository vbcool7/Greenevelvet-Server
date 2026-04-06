import express from "express";
import cors from "cors";
import escortRouter from "./routes/escort.route.js";
import clientRouter from "./routes/client.route.js"
import adminRouter from "./routes/admin.route.js";
import loginRouter from "./routes/login.route.js";
import geoRouter from "./routes/geo.route.js";
import visitRouter from "./routes/visits.route.js";

const app = express();

app.use(cors({
    credentials: true,
    origin: [
        "http://localhost:5173",
        "http://testing.greenevelvet.com",
        "http://localhost:5174",
        "http://admin.greenevelvet.com",
        "https://greenevelvet.com",
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


/* Global Error Handler */
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

export default app;
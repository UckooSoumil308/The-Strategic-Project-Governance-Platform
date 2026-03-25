import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { errorHandler, routeNotFound } from "./middleware/errorMiddleware.js";
import routes from "./routes/index.js";
import dbConnection from "./utils/connectDB.js";
import { startCronJobs } from "./utils/cronJobs.js";

dotenv.config();

dbConnection();

const port = process.env.PORT || 5000;

const app = express();

// Security Middleware
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: 'draft-7',
    legacyHeaders: false, 
    message: { status: false, message: "Too many requests, please try again later." }
});

// Apply rate limiter to all requests
app.use("/api", limiter);

// Dynamic CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.CLIENT_URL || "https://mern-task-manager-app.netlify.app"]
    : ["https://mern-task-manager-app.netlify.app", "http://localhost:3000", "http://localhost:3001", "http://localhost:5173"];

app.use(
    cors({
        origin: allowedOrigins,
        methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
        credentials: true,
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

//app.use(morgan("dev"));
app.use("/api", routes);

app.use(routeNotFound);
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server listening on ${port}`);
    startCronJobs();
});
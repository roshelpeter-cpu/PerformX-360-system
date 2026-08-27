// Express application
// Wires CORS, JSON parsing, authentication cookies, and API routes.

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { env } from "./config/env.js";
import { ensureUploadDirs } from "./lib/uploads.js";

const app = express();

ensureUploadDirs();

// Allow the configured frontend origin — do not use unrestricted "*" for authenticated requests.
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
  res.send("Altrium PerformX 360° Backend Running");
});

app.use("/api", apiRouter);

app.use(errorHandler);

export default app;

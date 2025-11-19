import express from "express";
import helmet from "helmet";
import cors from "cors";
import http from "http";

const app = express();

// Parse JSON request body
app.use(express.json());

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true }));

// Set Security HTTP headers
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173", // local dev
  process.env.APP_URL, // deployed frontend (from .env)
].filter(Boolean);

// Enable CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like curl or Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`Blocked CORS request from origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // enable if frontend sends cookies or auth headers
  })
);


// Liveness: process is up and can handle HTTP
app.get("/healthz", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Handle unknown routes (basic 404)
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// Handle server errors (basic handler)
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Server Error" });
});

// Create server
const server = http.createServer(app);

export { app, server };

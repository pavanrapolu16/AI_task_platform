require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const connectDb = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const port = Number(process.env.PORT || 5000);

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
    limit: Number(process.env.RATE_LIMIT_MAX || 120),
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "backend-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

connectDb(process.env.MONGO_URI).then(() => {
  app.listen(port, () => {
    console.log(`Backend API listening on port ${port}`);
  });
});

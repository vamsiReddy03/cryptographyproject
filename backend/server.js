require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const ipfsController = require("./controllers/ipfsController");

const helmet = require("helmet");
const apiRouter = require("./routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable security headers and CORS
app.use(helmet({
  crossOriginResourcePolicy: false, // allows viewing mock IPFS PDFs on local dev
}));

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// Set up Multer for memory storage upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit size to 10MB
  },
});

// Routes
app.post("/api/upload", upload.single("file"), ipfsController.uploadCertificate);
app.get("/api/ipfs/:cid", ipfsController.getMockIPFS);
app.use("/api", apiRouter);

// Diagnostic test endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Express backend is healthy" });
});

// Start listening
app.listen(PORT, '0.0.0.0',() => {
  console.log(`=========================================`);
  console.log(`Backend server running on port ${PORT}`);
  console.log(`API Health: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});

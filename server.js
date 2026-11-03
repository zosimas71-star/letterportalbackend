import express from "express";
import cors from "cors";
import messageRoutes from "./routes/messageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import auditLogRoutes from "./routes/auditLogRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Team Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Hadiya Zone backend is running"
  });
});

// Root Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: "Official Letter System Backend is up and running!"
  });
});

// Mount Module Routes
app.use('/api/v1', messageRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Endpoint not found." }
  });
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
import messageController from "../controllers/message.controller.js"; 
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/process-message", authMiddleware, messageController.processMessage);

export default router;

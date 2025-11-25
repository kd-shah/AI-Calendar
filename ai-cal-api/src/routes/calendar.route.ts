import calendarController from "../controllers/calendar.controller.js"; 
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = express.Router();

router.get("/events", authMiddleware, calendarController.getAllCalendarEvents);

export default router;

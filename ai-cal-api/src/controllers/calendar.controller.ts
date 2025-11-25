import { Response } from "express";
import calendarService from "../services/calendar.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const getAllCalendarEvents = async (req: AuthRequest, res: Response) => {
    const response = await calendarService.getAllCalendarEvents(req.user!.userId);
    return res.status(200).json(response);
};

export default {
  getAllCalendarEvents,
};
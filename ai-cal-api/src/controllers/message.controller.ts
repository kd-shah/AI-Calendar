import { Response } from "express";
import messageService from "../services/message.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const processMessage = async (req: AuthRequest, res: Response) => {
    const response = await messageService.processMessage(req);
    return res.status(200).json(response);
};

export default {
  processMessage,
};
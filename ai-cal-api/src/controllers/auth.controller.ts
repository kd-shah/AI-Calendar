import { Request, Response, NextFunction } from "express";
import authService from "./auth.service";

const signIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const jwtToken = await authService.signIn(token);

    res.status(200).json(jwtToken);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
};

export default { signIn };

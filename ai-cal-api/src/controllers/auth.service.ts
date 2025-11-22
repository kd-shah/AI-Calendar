import { OAuth2Client } from "google-auth-library";
import { prismaService } from "../services/prisma.service";
import jwt from "jsonwebtoken";

const signIn = async (token: string) => {
  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const user = await prismaService.user.findUnique({
      where: {
        email: payload?.email as string,
      },
    });

    let jwtToken = "";

    if (!user) {
      const newUser = await prismaService.user.create({
        data: {
          email: payload?.email as string,
          name: payload?.name as string,
          googleId: payload?.sub as string,
          lastLogin: new Date(),
        },
      });
      jwtToken = jwt.sign(
        { userId: newUser.id, email: newUser.email },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );
    } else {
      jwtToken = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );
    }

    return {
      jwtToken,
    };
  } catch (error) {
    throw error;
  }
};

export default { signIn };

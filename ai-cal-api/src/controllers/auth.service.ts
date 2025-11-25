import { prismaService } from "../services/prisma.service";
import jwt from "jsonwebtoken";
import axios from "axios";

export const signIn = async (code: string) => {
  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID as string;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET as string;

    // ✅ 1) Exchange auth code for tokens
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: "postmessage",
      grant_type: "authorization_code",
    });

    const { access_token, id_token, refresh_token } = tokenRes.data;

    // ✅ 2) Get user info using access token
    const userInfoRes = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const profile = userInfoRes.data; // ✅ contains email, name, picture, sub

    // ✅ 3) Check user in DB
    let user = await prismaService.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await prismaService.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
          lastLogin: new Date(),
          googleRefreshToken: refresh_token,
        },
      });
    } else {
      await prismaService.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date(), googleRefreshToken: refresh_token },
      });
    }

    // ✅ 4) Generate your own JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    return {
      jwtToken,
      accessToken: access_token, // optional, if you want to store for calendar calls
      idToken: id_token, // optional
    };
  } catch (error) {
    console.error("Google Sign-in failed:", error);
    throw new Error("Authentication failed");
  }
};

export default { signIn };

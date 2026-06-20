import { OAuth2Client } from "google-auth-library";
import { prismaService } from "./prisma.service";
import { google } from "googleapis";
import {
  Intention,
  IntentionSchema,
} from "../types/type";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage",
);

export async function getGoogleAccessToken(userId: string) {
  const user = await prismaService.user.findUnique({
    where: { id: userId },
  });

  client.setCredentials({
    refresh_token: user?.googleRefreshToken,
  });

  return client;
}

export const createEvent = async (userIntention: Intention, userId: string) => {
  try {
    const authClient = await getGoogleAccessToken(userId);

    const calendar = google.calendar({ version: "v3", auth: authClient! });

    const attendees = (userIntention.entities.attendees || [])
      .filter((a: { name: string; email: string }) => a?.email) // Google needs an email
      .map((a: { name: string; email: string }) => ({
        email: a.email,
        displayName: a.name || undefined, // displayName, NOT name
      }));

    const event = {
      summary: userIntention.entities.eventName,
      start: {
        dateTime:
          userIntention.entities.start.date +
          "T" +
          userIntention.entities.start.time,
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime:
          userIntention.entities.end.date +
          "T" +
          userIntention.entities.end.time,
        timeZone: "Asia/Kolkata",
      },
      location: userIntention.entities.location || "",
      description: userIntention.response,
      attendees,
    };

    const result = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      sendUpdates: "all",
    });

    await prismaService.event.create({
      data: {
        userId,
        googleEventId: result.data.id as string,
        summary: event.summary,
        start: new Date(event.start.dateTime),
        end: new Date(event.end.dateTime),
        location: event.location,
      },
    });

    return result.data;
  } catch (e) {
    console.error("Error creating event:", e);
    throw new Error("Failed to create event");
  }
};

export const updateEvent = async (userIntention: Intention, userId: string) => {
  try {
    const authClient = await getGoogleAccessToken(userId);
    const calendar = google.calendar({ version: "v3", auth: authClient });

    const eventName = userIntention.entities.eventName;
    const originalDate = userIntention.entities.original.date;

    // ✅ Find event from DB
    const match = await findMatchingEvent(userId, eventName, originalDate);

    if (!match) {
      return {
        message: `❓ I couldn't find an event matching "${eventName}". Can you specify?`,
      };
    }

    const updatedEvent = {
      summary: eventName,
      start: {
        dateTime: `${userIntention.entities.start.date}T${userIntention.entities.start.time}`,
        timeZone: "Asia/Kolkata",
      },
      end: {
        dateTime: `${userIntention.entities.end.date}T${userIntention.entities.end.time}`,
        timeZone: "Asia/Kolkata",
      },
      location: userIntention.entities.location || "",
      description: userIntention.response,
    };

    // ✅ PATCH instead of update (safer)
    const result = await calendar.events.patch({
      calendarId: "primary",
      eventId: match.googleEventId,
      requestBody: updatedEvent,
    });

    // ✅ update local DB copy
    // await prismaService.event.update({
    //   where: { id: match.id },
    //   data: {
    //     summary: updatedEvent.summary,
    //     start: new Date(updatedEvent.start.dateTime),
    //     end: new Date(updatedEvent.end.dateTime),
    //     location: updatedEvent.location,
    //   },
    // });

    return result.data;
  } catch (e) {
    console.error("Error updating event:", e);
    throw new Error("Failed to update event");
  }
};

export const deleteEvent = async (userIntention: Intention, userId: string) => {
  try {
    const authClient = await getGoogleAccessToken(userId);
    const calendar = google.calendar({ version: "v3", auth: authClient });
    const eventName = userIntention.entities.eventName;
    const date = userIntention.entities.start;
    const match = await findMatchingEvent(userId, eventName, date.date);
    if (!match) {
      return {
        message: `❓ I couldn't find an event matching "${eventName}". Can you specify?`,
      };
    }

    await calendar.events.delete({
      calendarId: "primary",
      eventId: match.googleEventId,
    });

    await prismaService.event.delete({
      where: { id: match.id },
    });

    return match;
  } catch (e) {
    console.error("Error deleting event:", e);
    throw new Error("Failed to delete event");
  }
};

export const viewEvents = async (userId: string) => {
  try {
    const authClient = await getGoogleAccessToken(userId);
    const calendar = google.calendar({ version: "v3", auth: authClient });
    const events = await calendar.events.list({
      calendarId: "primary",
    });
    return formatEventsForChat(events?.data?.items || []);
  } catch (e) {
    console.error("Error viewing events:", e);
    return "❌ Failed to view events";
  }
};

export const searchEvents = async (userIntention: Intention, userId: string) => {
  try {
    const authClient = await getGoogleAccessToken(userId);
    const calendar = google.calendar({ version: "v3", auth: authClient });

    const date = userIntention.entities.start?.date; // extracted from LLM
    const eventName = userIntention.entities.eventName;

    // ✅ If NO date → return all events
    if (!date) {
      const events = await calendar.events.list({
        calendarId: "primary",
        singleEvents: true,
        orderBy: "startTime",
      });

      return formatEventsForChat(events?.data?.items || []);
    }

    // ✅ Build date range (full day)
    const timeMin = new Date(`${date}T00:00:00`);
    const timeMax = new Date(`${date}T23:59:59`);

    const results = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    let items = results.data.items || [];

    // ✅ If event name is provided → filter further
    if (eventName) {
      items = items.filter((e) =>
        e.summary?.toLowerCase().includes(eventName.toLowerCase()),
      );
    }

    return formatEventsForChat(items || []);
  } catch (e) {
    console.error("Error searching events:", e);
    throw new Error("Failed to search events");
  }
};

export const getAllCalendarEvents = async (userId: string) => {
  try {
    const authClient = await getGoogleAccessToken(userId);
    const calendar = google.calendar({ version: "v3", auth: authClient });
    const events = await calendar.events.list({
      calendarId: "primary",
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
    });
    return events.data.items;
  } catch (e) {
    console.error("Error viewing events:", e);
    throw new Error("Failed to view events");
  }
};

async function findMatchingEvent(
  userId: string,
  eventName: string,
  date?: string,
) {
  return prismaService.event.findFirst({
    where: {
      userId,
      summary: {
        contains: eventName,
        mode: "insensitive",
      },
      ...(date && {
        start: {
          gte: new Date(date + "T00:00:00"),
          lte: new Date(date + "T23:59:59"),
        },
      }),
    },
  });
}

function formatEventsForChat(events: any[]) {
  if (!events?.length) {
    return "📭 No events found.";
  }

  return (
    "📅 Here are your events:\n\n" +
    events
      .map((e, i) => {
        const start = e.start?.dateTime || e.start?.date;
        const end = e.end?.dateTime || e.end?.date;

        return (
          `🔹 *${i + 1}) ${e.summary || "Untitled Event"}*\n` +
          `   🗓 ${start ? new Date(start).toLocaleString("en-IN") : "N/A"}${
            end ? ` → ${new Date(end).toLocaleString("en-IN")}` : ""
          }\n` +
          (e.location ? `   📍 ${e.location}\n` : "")
        );
      })
      .join("\n")
  );
}

export default {
  createEvent,
  updateEvent,
  deleteEvent,
  viewEvents,
  searchEvents,
  getAllCalendarEvents,
};

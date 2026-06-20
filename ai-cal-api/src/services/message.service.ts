import OpenAI from "openai";
import calendarService from "./calendar.service";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  Entities,
  Intention,
  IntentionSchema,
  ServiceResponse,
} from "../types/type";
import { setPending, clearPending, getPending } from "../redis/redis.service";

const processMessage = async (req: AuthRequest): Promise<ServiceResponse> => {
  const message: string = req.body?.message;
  const userId = req.user!.userId;

  if (!message || !message.trim()) {
    return { type: "clarification", message: "Please type a message." };
  }
  const pending = await getPending(userId);
  
  const intention = await determineUserIntention(message, pending);

  // Decide: is this a fresh request, or an answer to our last question?
  let working = intention;
  if (pending) {
    const clearlyDifferent =
      intention.intent !== pending.intent &&
      intention.confidence !== "low" &&
      intention.intent !== "OTHER" &&
      intention.intent !== "GREETING";
    if (clearlyDifferent) {
      await clearPending(userId); // user changed their mind → start fresh
    } else {
      // Treat the message as a slot-filling answer to the pending flow.
      working = {
        ...intention,
        intent: pending.intent,
        entities: mergeEntities(pending.entities, intention.entities),
      };

      console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>working", working)
    }
  }

  switch (working.intent) {
    case "CREATE_EVENT":
      return handleCreate(working, userId);

    case "UPDATE_EVENT":
      return handleUpdate(working, userId);

    case "DELETE_EVENT":
      return handleDelete(working, userId);

    case "VIEW_EVENTS":
      return {
        type: "success",
        eventType: "VIEW_EVENTS",
        message: await calendarService.viewEvents(userId),
      };

    case "SEARCH_EVENTS":
      return {
        type: "success",
        eventType: "SEARCH_EVENTS",
        message: await calendarService.searchEvents(working, userId),
      };

    case "GREETING":
      return {
        type: "message",
        message: working.response || "Hi! How can I help with your calendar?",
      };

    case "SET_REMINDER":
    case "GENERAL_QUESTION":
      return {
        type: "message",
        message:
          working.response ||
          "I can help you create, view, update, or delete events.",
      };

    default:
      return {
        type: "message",
        message:
          working.response ||
          "I'm sorry, I didn't understand that. Please try again.",
      };
  }
};

const determineUserIntention = async (
  message: string,
  pending?: { intent: string; entities: Entities },
): Promise<Intention> => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const endpoint = "https://models.github.ai/inference";
    const modelName = "openai/gpt-4o";

    const client = new OpenAI({ baseURL: endpoint, apiKey: token });

    const now = new Date();
    const currentDate = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().split(" ")[0];

    const addDays = (dateStr: string, days: number) => {
      const date = new Date(dateStr);
      date.setDate(date.getDate() + days);
      return date.toISOString().split("T")[0];
    };

    const systemPrompt = `
    You are an AI assistant for a calendar application. Your job is to analyze the user's message and determine their intention.
 
    POSSIBLE INTENTS:
    - CREATE_EVENT: User wants to create a new calendar event
    - UPDATE_EVENT: User wants to modify an existing event
    - DELETE_EVENT: User wants to remove an event
    - VIEW_EVENTS: User wants to see their calendar or events
    - SEARCH_EVENTS: User wants to find specific events
    - SET_REMINDER: User wants to set a reminder
    - GENERAL_QUESTION: User has a general question about the calendar
    - GREETING: User is greeting or making small talk
    - OTHER: Intent doesn't match any of the above categories
 
    CURRENT CONTEXT (do NOT ask user):
    - Today's date: ${currentDate}
    - Current time: ${currentTime}
    - Timezone: Indian Standard Time (IST, UTC+5:30)
 
    ====================================================
    RELATIVE DATE HANDLING RULES
    ====================================================
 
    Convert all relative expressions into absolute ISO dates (YYYY-MM-DD):
 
    • "today" → ${currentDate}
    • "tomorrow" → ${currentDate} + 1 day
    • "day after tomorrow" → ${currentDate} + 2 days
    • "yesterday" → ${currentDate} - 1 day
 
    • "tonight"
       - date = ${currentDate}
       - time = "20:00" if not specified
 
    • "this week"  → return Monday–Sunday range
    • "next week"  → return next Monday–Sunday
    • "this month" → start = first day of current month, end = last day of current month
    • "next month" → start = first day of next month, end = last day of next month
 
 
    ====================================================
    EXAMPLES BASED ON CURRENT DATE (${currentDate})
    ====================================================
    1) "create an event tonight"  → startDateTime: "${currentDate}T20:00:00"
    2) "schedule for tomorrow"    → startDateTime: "${addDays(currentDate, 1)}T09:00:00"
    3) "meeting at 3pm today"     → startDateTime: "${currentDate}T15:00:00"
 
    ====================================================
    MISSING DATA HANDLING (IMPORTANT)
    ====================================================
    - Extract whatever information is present in the user message.
    - If any field is missing, DO NOT guess or hallucinate values.
    - Leave missing fields as empty string "".
    - DO NOT ask follow-up questions for missing data; the backend handles that.
    - Your job is ONLY to extract structured data, NOT to validate completeness.
 
    ====================================================
    ATTENDEE EXTRACTION RULES
    ====================================================
    - Extract attendees from names ("meeting with Rahul") or emails ("invite abc@gmail.com").
    - Store them in the "attendees" array.
    - Name only:  { "name": "Rahul", "email": "" }
    - Email only: { "name": "", "email": "abc@gmail.com" }
    - Both:       { "name": "John", "email": "john@company.com" }
    - List multiple attendees separately.
 
    ====================================================
    OUTPUT FORMAT (STRICT JSON ONLY)
    ====================================================
    {
      "intent": "CREATE_EVENT | UPDATE_EVENT | DELETE_EVENT | VIEW_EVENTS | SEARCH_EVENTS | SET_REMINDER | GENERAL_QUESTION | GREETING | OTHER",
      "confidence": "high | medium | low",
      "entities": {
        "original": { "date": "YYYY-MM-DD", "time": "HH:mm:ss" },
        "start":    { "date": "YYYY-MM-DD", "time": "HH:mm:ss" },
        "end":      { "date": "YYYY-MM-DD", "time": "HH:mm:ss" },
        "eventName": "",
        "location": "",
        "attendees": [ { "name": "", "email": "" } ]
      },
      "response": "short helpful response for the user"
    }
 
    ====================================================
    RULES
    ====================================================
    - DO NOT include anything outside the JSON.
    - DO NOT ask for today's date (you already know it).
    - GREETING should NOT trigger any event action.
    - If unsure → confidence = "low" and return empty fields.
    - For UPDATE_EVENT:
      • ALWAYS extract both the original date and the new date.
      • "original.date" = the date the event is being changed FROM.
      • "start.date"    = the new date the event is being changed TO.
      • If only one date is provided, leave original.date empty.
    `;

    let userContent = message;
    if (pending) {
      userContent = `We are still collecting details to ${pending.intent}.
        Already known (keep these, do NOT change or re-guess them): ${JSON.stringify(pending.entities)}
        User's reply to our last question: "${message}"

        Map the reply into the schema. Set intent to ${pending.intent}.
        Extract ONLY what the reply states (e.g. "8 pm" → start.time "20:00:00").
        Do NOT invent a date — leave start.date "" if the reply doesn't mention one.`;
    }

    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.2,
      // Forces a JSON body (no ```json fences) so JSON.parse won't choke.
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallbackIntention();
    
    const parsed = IntentionSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      console.error("Intent schema validation failed:", parsed.error.flatten());
      return fallbackIntention();
    }

    return parsed.data;
  } catch (error) {
    console.error("Intent detection failed:", error);
    return fallbackIntention();
  }
};

async function handleCreate(
  intention: Intention,
  userId: string,
): Promise<ServiceResponse> {
  const entities = normalize(intention.entities);

  // Slot-filling: if anything required is missing, remember state and ask.
  const missing = getMissingFields(entities);
  if (missing.length > 0) {
    await setPending(userId, {
      intent: "CREATE_EVENT",
      entities,
      missingFields: missing,
    });
    return {
      type: "clarification",
      message: getNextQuestion(missing, entities),
    };
  }

  // Deterministic time validation — never let the LLM be the judge of this.
  const startMs = floatingInstant(entities.start.date, entities.start.time);
  const endMs = floatingInstant(entities.end.date, entities.end.time);
  if (startMs !== null && endMs !== null && endMs <= startMs) {
    return {
      type: "clarification",
      message: "The end time must be after the start time. When should it end?",
    };
  }

  // NOTE: calendar.service must map attendees to Google's shape
  // ({ email, displayName }), not { name, email }. By this point every
  // attendee already has an email (enforced above).
  const result = await calendarService.createEvent(
    { ...intention, entities },
    userId,
  );
  await clearPending(userId);

  return {
    type: "success",
    eventType: "CREATE_EVENT",
    message: `Event created successfully: ${result.summary}`,
    events: result,
  };
}

async function handleUpdate(
  intention: Intention,
  userId: string,
): Promise<ServiceResponse> {
  const e = intention.entities;

  if (!e.eventName) {
    return {
      type: "clarification",
      message: "Which event would you like to update?",
    };
  }
  if (floatingInstant(e.start.date, e.start.time) === null) {
    return {
      type: "clarification",
      message: "What's the new date and time for the event?",
    };
  }

  const result = await calendarService.updateEvent(
    { ...intention, entities: normalize(e) },
    userId,
  );

  // calendar.service returns { message } when it can't find a match.
  if (result && "message" in result) {
    return { type: "clarification", message: result.message };
  }

  return {
    type: "success",
    eventType: "UPDATE_EVENT",
    message: `Event updated successfully: ${result.summary}`,
    events: result,
  };
}

async function handleDelete(
  intention: Intention,
  userId: string,
): Promise<ServiceResponse> {
  if (!intention.entities.eventName) {
    return {
      type: "clarification",
      message: "Which event would you like to delete?",
    };
  }

  const result = await calendarService.deleteEvent(intention, userId);
  if (result && "message" in result) {
    return { type: "clarification", message: result.message };
  }
  return {
    type: "success",
    eventType: "DELETE_EVENT",
    message: `Event deleted: ${result.summary || intention.entities.eventName}`,
    events: result,
  };
}

/** Returns ms for a floating wall-clock datetime, or null if invalid/empty. */
function floatingInstant(date: string, time: string): number | null {
  if (!date || !time) return null;
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  return isNaN(dt.getTime()) ? null : dt.getTime();
}

/** Add minutes to a wall-clock pair without any timezone conversion. */
function addMinutes(date: string, time: string, minutes: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm, ss = 0] = time.split(":").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  dt.setUTCMinutes(dt.getUTCMinutes() + minutes);
  const iso = dt.toISOString();
  return { date: iso.split("T")[0], time: iso.split("T")[1].split(".")[0] };
}

function normalize(e: Entities): Entities {
  const attendees = e.attendees.filter((a) => a.email);
  let start = e.start;
  if (start.date && !start.time) {
    start = { ...start, time: "10:00:00" };
  }

  const startMs = floatingInstant(e.start.date, e.start.time);
  const endMs = floatingInstant(e.end.date, e.end.time);

  let end = e.end;
  if (startMs !== null && endMs === null) {
    end = addMinutes(e.start.date, e.start.time, 60);
  }

  return { ...e, attendees, end };
}

/** Which required CREATE fields are still missing? Drives slot-filling. */
function getMissingFields(e: Entities): string[] {
  const missing: string[] = [];
  if (!e.eventName) missing.push("eventName");
  if (!e.start.date) missing.push("startDate");
  if (!e.start.time) missing.push("startTime");
  // A named attendee with no email can't be invited via Google Calendar.
  // if (e.attendees.some((a) => a.name && !a.email))
  //   missing.push("attendeeEmail");
  return missing;
}

function getNextQuestion(missing: string[], _e: Entities): string {
  if (missing.includes("eventName")) return "What should I name the event?";
  if (missing.includes("startDate"))
    return "What day should I schedule it for?";
  if (missing.includes("startTime")) return "What time should it start?";
  return "Could you give me a bit more detail?";
}

const fallbackIntention = (
  response = "Sorry, I couldn't understand that. Can you rephrase?",
): Intention => ({
  intent: "OTHER",
  confidence: "low",
  entities: {
    original: { date: "", time: "" },
    start: { date: "", time: "" },
    end: { date: "", time: "" },
    eventName: "",
    location: "",
    attendees: [],
  },
  response,
});

function pickFilled(
  oldDT: { date: string; time: string },
  newDT: { date: string; time: string },
) {
  return { date: newDT.date || oldDT.date, time: newDT.time || oldDT.time };
}

function mergeAttendees(
  oldA: Entities["attendees"],
  newA: Entities["attendees"],
) {
  if (!newA.length) return oldA;
  if (!oldA.length) return newA;

  const merged = oldA.map((o) => {
    const match = newA.find((n) => n.name && n.name === o.name);
    return match
      ? { name: o.name || match.name, email: match.email || o.email }
      : o;
  });

  for (const n of newA) {
    const exists = merged.find(
      (m) => (n.name && m.name === n.name) || (n.email && m.email === n.email),
    );
    if (exists) continue;

    // A bare email answer ("rahul@x.com") fills the first name-only slot.
    const slot =
      !n.name && n.email ? merged.find((m) => m.name && !m.email) : null;
    if (slot) slot.email = n.email;
    else merged.push(n);
  }
  return merged;
}

function mergeEntities(oldE: Entities, newE: Entities): Entities {
  return {
    original: pickFilled(oldE.original, newE.original),
    start: pickFilled(oldE.start, newE.start),
    end: pickFilled(oldE.end, newE.end),
    eventName: newE.eventName || oldE.eventName,
    location: newE.location || oldE.location,
    attendees: mergeAttendees(oldE.attendees, newE.attendees),
  };
}

export default {
  processMessage,
};

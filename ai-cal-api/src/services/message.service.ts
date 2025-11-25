import OpenAI from "openai";
import calendarService from "./calendar.service";
import { AuthRequest } from "../middlewares/auth.middleware";

const processMessage = async (req: AuthRequest) => {
  try {
    const message = req.body.message;
    const userId = req.user!.userId;
    const userIntention = await determineUserIntention(message);
    let response: any;
    let responseMessage: string = "";
    switch (userIntention.intent) {
      case "CREATE_EVENT":
        response = await calendarService.createEvent(userIntention, userId);
        responseMessage = `Event created successfully: ${response.summary}`;
        break;
      case "UPDATE_EVENT":
        response = await calendarService.updateEvent(userIntention, userId);
        responseMessage = `Event updated successfully: ${response.summary}`;
        break;
      case "DELETE_EVENT":
        response = await calendarService.deleteEvent(userIntention, userId);
        responseMessage = `Event deleted successfully: ${response.summary}`;
        break;
      case "VIEW_EVENTS":
        responseMessage = await calendarService.viewEvents(userId);
        break;
      case "SEARCH_EVENTS":
        responseMessage = await calendarService.searchEvents(
          userIntention,
          userId
        );
        break;
      default:
        responseMessage =
          "I'm sorry, I didn't understand that. Please try again.";

        break;
    }
    return {
      eventType: userIntention.intent,
      message: responseMessage,
      events: response,
    };
  } catch (error) {
    throw error;
  }
};

export const determineUserIntention = async (message: string) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const endpoint = "https://models.github.ai/inference";
    const modelName = "openai/gpt-4o";

    const client = new OpenAI({ baseURL: endpoint, apiKey: token });
    const now = new Date();
    const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(" ")[0]; // HH:mm:ss

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
    
    • "this week"
       - return Monday–Sunday range
    
    • "next week"
       - return next Monday–Sunday
    
    • "this month"
       - start = first day of current month
       - end = last day of current month
    
    • "next month"
       - start = first day of next month
       - end = last day of next month
    
    ====================================================
    DEFAULT FALLBACKS
    ====================================================
    - If no time provided → use "10:00"
    - If only start datetime given → end = start + 1 hour
    - Duration unclear → assume 1 hour
    
    ====================================================
    EXAMPLES BASED ON CURRENT DATE (${currentDate})
    ====================================================
    
    1) "create an event tonight"
       → startDateTime: "${currentDate}T20:00:00"
    
    2) "schedule for tomorrow"
       → startDateTime: "${addDays(currentDate, 1)}T09:00:00"
    
    3) "meeting at 3pm today"
       → startDateTime: "${currentDate}T15:00:00"
    
    ====================================================
    OUTPUT FORMAT (STRICT JSON ONLY)
    ====================================================
    
    {
      "intent": "CREATE_EVENT | UPDATE_EVENT | DELETE_EVENT | VIEW_EVENTS | SEARCH_EVENTS | SET_REMINDER | GENERAL_QUESTION | GREETING | OTHER",
      "confidence": "high | medium | low",
      "entities": {
        "original": {
          "date": "YYYY-MM-DD",
          "time": "HH:mm:ss"
        },
        "start": {
             "date": "YYYY-MM-DD",
             "time": "HH:mm:ss"
           },
        "end": {
            "date": "YYYY-MM-DD",
            "time": "HH:mm:ss"
          },
        "eventName": "",
        "location": ""
      },
      "response": "short helpful response for the user",
      "type": "CREATE_EVENT | UPDATE_EVENT | DELETE_EVENT | VIEW_EVENTS | SEARCH_EVENTS | SET_REMINDER | GENERAL_QUESTION | GREETING | OTHER"
    }
    
    ====================================================
    RULES
    ====================================================
    - DO NOT include anything outside the JSON
    - DO NOT ask for today's date (you already know it)
    - GREETING should NOT trigger any event action
    - If unsure → confidence = "low" and return empty fields
    - Be concise and helpful
    - For UPDATE_EVENT:
      • ALWAYS extract both the original date and the new date
      • "original.date" = the date the event is being changed FROM
      • "start.date" = the new date the event is being changed TO
      • If only one date is provided, leave original.date empty
    `;

    // ✅ Send message to OpenAI
    const completion = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    if (!raw) {
      return {
        intent: "OTHER",
        confidence: "low",
        entities: {
          start: {
            date: "",
            time: "",
          },
          end: {
            date: "",
            time: "",
          },
          eventName: "",
          location: "",
        },
        response: "Sorry, I couldn’t understand that. Can you rephrase?",
      };
    }
    // ✅ Ensure valid JSON
    const parsed = JSON.parse(raw);

    return parsed;
  } catch (error: any) {
    console.error("Intent detection failed:", error);

    // ✅ Safe fallback response
    return {
      intent: "OTHER",
      confidence: "low",
      entities: {
        start: {
          date: "",
          time: "",
        },
        end: {
          date: "",
          time: "",
        },
        eventName: "",
        location: "",
      },
      response: "Sorry, I couldn’t understand that. Can you rephrase?",
    };
  }
};

export default {
  processMessage,
};

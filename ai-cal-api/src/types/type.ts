import { z } from "zod";

export type CalendarIntentResponse = {
  intent:
    | "CREATE_EVENT"
    | "UPDATE_EVENT"
    | "DELETE_EVENT"
    | "VIEW_EVENTS"
    | "SEARCH_EVENTS"
    | "SET_REMINDER"
    | "GENERAL_QUESTION"
    | "GREETING"
    | "OTHER";

  confidence: "high" | "medium" | "low";

  entities: {
    original?: {
      date: string; // YYYY-MM-DD
      time: string; // HH:mm:ss
    };

    start?: {
      date: string; // YYYY-MM-DD
      time: string; // HH:mm:ss
    };

    end?: {
      date: string; // YYYY-MM-DD
      time: string; // HH:mm:ss
    };

    eventName?: string;
    location?: string;

    attendees?: {
      name: string;
      email: string;
    }[];
  };

  response: string;
};

export const DateTimeSchema = z.object({
  date: z.string().default(""),
  time: z.string().default(""),
});

export const AttendeeSchema = z.object({
  name: z.string().default(""),
  // Accept a valid email OR an empty string (name-only attendees).
  email: z.string().email().or(z.literal("")).default(""),
});

export const IntentSchema = z.enum([
  "CREATE_EVENT",
  "UPDATE_EVENT",
  "DELETE_EVENT",
  "VIEW_EVENTS",
  "SEARCH_EVENTS",
  "SET_REMINDER",
  "GENERAL_QUESTION",
  "GREETING",
  "OTHER",
]);

export const IntentionSchema = z.object({
  intent: IntentSchema,
  confidence: z.enum(["high", "medium", "low"]).default("low"),
  entities: z.object({
    original: DateTimeSchema.default({ date: "", time: "" }),
    start: DateTimeSchema.default({ date: "", time: "" }),
    end: DateTimeSchema.default({ date: "", time: "" }),
    eventName: z.string().default(""),
    location: z.string().default(""),
    attendees: z.array(AttendeeSchema).default([]),
  }),
  response: z.string().default(""),
});

export type Intention = z.infer<typeof IntentionSchema>;
export type Entities = Intention["entities"];

/* ------------------------------------------------------------------ *
 * 2. RESPONSE SHAPE returned to the controller / frontend.
 *    `type` lets the UI branch cleanly:
 *      - "success"        → action done
 *      - "clarification"  → we need more info, keep the thread going
 *      - "message"        → greeting / chit-chat, no action
 * ------------------------------------------------------------------ */
export type ServiceResponse = {
  type: "success" | "clarification" | "message";
  message: string;
  eventType?: string;
  events?: any;
};
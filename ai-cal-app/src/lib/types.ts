export interface User {
  id: string;
  name: string;
  email: string;
  accessToken: string;
}

export interface DecodedToken {
  id: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

export interface Message {
  sender: "user" | "assistant";
  text: string;
  isLoading: boolean;
}


export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
}

export interface GoogleCalendarEvent {
  kind: string;
  etag: string;
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  htmlLink: string;
  created: string; // ISO datetime
  updated: string; // ISO datetime

  summary: string;

  creator: {
    email: string;
    self?: boolean;
  };

  organizer: {
    email: string;
    self?: boolean;
  };

  start: {
    date: string; // YYYY-MM-DD
  };

  end: {
    date: string; // YYYY-MM-DD
  };

  recurringEventId?: string;

  originalStartTime?: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };

  transparency?: "opaque" | "transparent";
  visibility?: "default" | "public" | "private" | "confidential";

  iCalUID: string;
  sequence: number;

  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: "email" | "popup";
      minutes: number;
    }>;
  };

  birthdayProperties?: {
    contact: string;
    type: "birthday" | "anniversary" | "custom" | "other";
  };

  eventType?:
    | "default"
    | "birthday"
    | "focusTime"
    | "outOfOffice"
    | "workingLocation";
};
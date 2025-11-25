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
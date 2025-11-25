import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useState } from "react";
import { CalendarEvent, Message } from "@/lib/types";
import {
  getAllCalendarEvents,
  processMessage,
} from "../services/calendar.service";
import Header from "@/components/Header";
import { authStore } from "@/store/AuthStore";

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const user = authStore.getState().user;

  const sendMessage = async () => {
    try {
      if (!input.trim()) return;
      const newMessages = [
        ...messages,
        { sender: "user", text: input, isLoading: false },
        { sender: "assistant", text: "", isLoading: true },
      ];
      setMessages(newMessages as Message[]);

      setInput("");
      const response = await processMessage(input);
      if (response.status === 200) {
        switch (response.data.eventType) {
          case "CREATE_EVENT":
            setEvents([
              ...events,
              {
                id: response.data.events.id,
                title: response.data.events.summary,
                start: response.data.events.start.dateTime,
                end: response.data.events.end.dateTime,
              },
            ]);
            break;
          case "UPDATE_EVENT":
            setEvents((prevEvents) =>
              prevEvents.map((event) =>
                event.id === response.data.events.id
                  ? {
                      ...event,
                      title: response.data.events.summary,
                      start: response.data.events.start.dateTime,
                      end: response.data.events.end.dateTime,
                    }
                  : event
              )
            );

            break;
          case "DELETE_EVENT":
            setEvents((previousEvents) =>
              previousEvents.filter(
                (event) => event.id !== response.data.events.googleEventId
              )
            );
            break;
        }
        setMessages((prevMessages) => {
          return prevMessages.map((msg, index) => {
            if (index === prevMessages.length - 1) {
              return { ...msg, isLoading: false, text: response.data.message };
            }
            return msg;
          });
        });
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const response = await getAllCalendarEvents();
        setEvents(
          response.data.map((event: any) => ({
            id: event.id,
            title: event.summary,
            start: event.start.dateTime,
            end: event.end.dateTime,
          }))
        );
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#121212] text-white">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — CALENDAR */}
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            <div className="w-[60%] p-4 border-r border-gray-700">
              <FullCalendar
                plugins={[timeGridPlugin]}
                initialView="timeGridWeek"
                height="100%"
                events={events}
              />
            </div>
            {/* RIGHT — CHAT */}
            <div className="w-[40%] flex flex-col bg-[#181818] p-2">
              {/* Messages box */}
              <div className="h-[80%] flex-1 overflow-y-auto bg-green p-4 space-y-3">
                {messages.map((m, i) => {
                  const isUser = m.sender === "user";
                  const avatarText = isUser
                    ? user?.name?.charAt(0).toUpperCase() || "U"
                    : "AI";

                  return (
                    <div
                      key={i}
                      className={`flex gap-2 items-center ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {/* Avatar on left for AI, on right for User */}
                      {!isUser && (
                        <div className="w-9 h-9 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {avatarText}
                        </div>
                      )}

                      {/* Message bubble */}
                      {m.isLoading ? (
                        <div
                          className={`p-3 rounded-sm text-sm leading-relaxed ${
                            isUser
                              ? "bg-blue-600 text-white ml-auto"
                              : "bg-gray-700 text-gray-200"
                          }`}
                        >
                          <div id="wave">
                            <span className="dot"></span>
                            <span className="dot"></span>
                            <span className="dot"></span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[80%] p-3 rounded-sm text-sm leading-relaxed ${
                            isUser
                              ? "bg-blue-600 text-white ml-auto"
                              : "bg-gray-700 text-gray-200"
                          }`}
                        >
                          {m.text}
                        </div>
                      )}

                      {/* User avatar on right */}
                      {isUser && (
                        <div className="w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {avatarText}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Input box */}
              <div className="m-4 flex gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 p-3 rounded-sm bg-[#2b2b2b] text-white outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Type your message..."
                />
                <button
                  onClick={() => sendMessage()}
                  className="w-[100px] bg-blue-600 px-5 py-3 rounded-sm hover:bg-blue-700 transition"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

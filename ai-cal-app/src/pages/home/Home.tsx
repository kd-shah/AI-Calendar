import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useEffect, useState } from "react";
import { CalendarEvent, Message } from "@/lib/types";
import {
  getAllCalendarEvents,
  processMessage,
} from "../../services/calendar.service";
import Header from "@/components/Header";
import { authStore } from "@/store/AuthStore";
import EventDetails from "@/components/EventDetails";
import { Send } from "lucide-react";

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState();
  const [open, setOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"calendar" | "chat">("chat");
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
                  : event,
              ),
            );

            break;
          case "DELETE_EVENT":
            setEvents((previousEvents) =>
              previousEvents.filter(
                (event) => event.id !== response.data.events.googleEventId,
              ),
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
            start: event?.start?.dateTime
              ? event?.start?.dateTime
              : event?.start?.date,
            end: event?.end?.dateTime ? event?.end?.dateTime : event?.end?.date,
          })),
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

      {/* Mobile tab switcher — hidden on md+ */}
      <div className="md:hidden flex border-b border-gray-700">
        {(["calendar", "chat"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize transition ${
              activeTab === tab
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-400 border-b-2 border-transparent"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-1 justify-center items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-700 border-t-blue-500" />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">
          {/* LEFT — CALENDAR */}
          <div
            className={`${
              activeTab === "calendar" ? "flex" : "hidden"
            } md:flex flex-col w-full md:w-[70%] min-h-0 p-4 md:border-r border-gray-700`}
          >
            <div className="flex-1 min-h-0">
              <FullCalendar
                plugins={[timeGridPlugin]}
                initialView="timeGridWeek"
                eventDisplay="block"
                height="100%"
                events={events}
                eventClick={(info) => {
                  setSelectedEvent(info?.event);
                  setOpen(true);
                }}
                eventContent={(arg) => {
                  const start = arg?.event?.start?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  const end = arg.event.end?.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div className="fc-card">
                      <div className="fc-card-title">{arg.event.title}</div>
                      <div className="fc-card-time">
                        {start} - {end}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
            <EventDetails
              event={selectedEvent}
              isOpen={open}
              onClose={() => setOpen(false)}
            />
          </div>

          {/* RIGHT — CHAT */}
          <div
            className={`${
              activeTab === "chat" ? "flex" : "hidden"
            } md:flex flex-col w-full md:w-[30%] min-h-0 bg-[#181818]`}
          >
            {/* Messages box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      <div className="w-9 h-9 shrink-0 bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {avatarText}
                      </div>
                    )}

                    {/* Message bubble */}
                    {m.isLoading ? (
                      <div
                        className={`p-3 rounded-2xl rounded-tl-md text-sm leading-relaxed ${
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
                        className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
                          isUser
                            ? "bg-blue-600 text-white rounded-2xl rounded-br-md"
                            : "bg-gray-700 text-gray-200 rounded-2xl rounded-tl-md"
                        }`}
                      >
                        {m.text}
                      </div>
                    )}

                    {/* User avatar on right */}
                    {isUser && (
                      <div className="w-9 h-9 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {avatarText}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Input box */}
            <div className="m-4 flex gap-2 items-center bg-[#2b2b2b] rounded-xl pl-4 pr-2 py-2 focus-within:ring-2 focus-within:ring-blue-600">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 bg-transparent text-white outline-none text-sm"
                placeholder="Type your message..."
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="bg-blue-600 px-5 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition text-sm font-medium"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
